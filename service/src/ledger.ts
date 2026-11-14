import type { DatabaseSync } from "node:sqlite";
import { keccak256, toHex, type Hex } from "viem";
import { inTransaction, type EntryKind, type EntryRow, type RefundRow } from "./db.ts";
import { alreadyRefunded, insufficientBalance, keyReused } from "./errors.ts";

/** The on-chain reference for a ledger key. The contract accepts each reference once. */
export const refFor = (idemKey: string): Hex => keccak256(toHex(idemKey));

export interface EarnInput {
  eventId: string;
  userId: string;
  orderId: string;
  purchaseCents: number;
}
export interface SpendInput {
  eventId: string;
  userId: string;
  orderId: string;
  points: number;
}
export interface RefundInput {
  eventId: string;
  userId: string;
  orderId: string;
}
export interface Balance {
  /** Everything recorded for the user. This is the number the app shows and spends from. */
  ledgerBalance: number;
  /** The part of it already confirmed on-chain. */
  settledBalance: number;
  /** Entries still waiting for the chain. */
  unsettledEntries: number;
  /** Points the user still owes from refunds. It is taken off their next rewards, never charged in cash. */
  debt: number;
}
interface Written {
  entry: EntryRow | null;
  points: number;
  duplicate: boolean;
}
export interface WriteResult extends Written {
  /** Earn only: how many of these points went to pay off an earlier refund debt. */
  appliedToDebt: number;
}
export interface RefundResult {
  orderId: string;
  /** What the order had earned. */
  pointsDue: number;
  /** The part the user still held, taken back now. */
  takenBack: number;
  /** The part already spent: recorded as debt, netted against future rewards. */
  debtCreated: number;
  entry: EntryRow | null;
  duplicate: boolean;
}

export class Ledger {
  constructor(
    private readonly db: DatabaseSync,
    private readonly rewardRateBps: number,
  ) {}

  /** 1 point = 1 cent of discount. Rate 200 bps = 2% of the purchase value. */
  pointsForPurchase(purchaseCents: number): number {
    return Math.floor((purchaseCents * this.rewardRateBps) / 10_000);
  }

  /**
   * Record the reward. If the user owes points from an earlier refund, the new reward pays
   * that off first (as a second ledger entry in the same transaction), so the user keeps
   * only what is left and never pays extra cash.
   */
  earn(input: EarnInput): WriteResult {
    const points = this.pointsForPurchase(input.purchaseCents);
    if (points === 0) return { entry: null, points: 0, duplicate: false, appliedToDebt: 0 };
    return inTransaction(this.db, () => {
      const written = this.append("earn", input.eventId, input.userId, input.orderId, points);
      if (written.duplicate) {
        // A retry: report what the first call did and change nothing, debt included.
        const repaid = this.findByKey(`debtpay:${input.eventId}`);
        return { ...written, appliedToDebt: repaid ? -repaid.amount : 0 };
      }
      return { ...written, appliedToDebt: this.payDebt(input.userId, input.eventId, input.orderId, points) };
    });
  }

  spend(input: SpendInput): WriteResult {
    const written = inTransaction(this.db, () =>
      this.append("spend", input.eventId, input.userId, input.orderId, input.points),
    );
    return { ...written, appliedToDebt: 0 };
  }

  /**
   * Take back the points an order earned. A refund is never blocked:
   *   - take what the user still holds (a clawback entry, burned on-chain later);
   *   - the part they already spent becomes debt, netted against their next rewards.
   * One refund per order. The same eventId again returns the first result.
   */
  refund(input: RefundInput): RefundResult {
    return inTransaction(this.db, () => {
      const prior = this.db.prepare("SELECT * FROM refunds WHERE event_id = ?").get(input.eventId) as unknown as
        | RefundRow
        | undefined;
      if (prior) {
        if (prior.user_id !== input.userId || prior.order_id !== input.orderId) {
          throw keyReused(`refund:${input.eventId}`);
        }
        return {
          orderId: prior.order_id,
          pointsDue: prior.points_due,
          takenBack: prior.taken_back,
          debtCreated: prior.debt_created,
          entry: this.findByKey(`refund:${input.eventId}`) ?? null,
          duplicate: true,
        };
      }

      const sameOrder = this.db
        .prepare("SELECT 1 AS x FROM refunds WHERE user_id = ? AND order_id = ?")
        .get(input.userId, input.orderId);
      if (sameOrder) throw alreadyRefunded(input.orderId);

      const due = (
        this.db
          .prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM ledger_entries WHERE user_id = ? AND order_id = ? AND kind = 'earn'")
          .get(input.userId, input.orderId) as unknown as { n: number }
      ).n;
      const held = Math.max(0, this.balance(input.userId).ledgerBalance);
      const takenBack = Math.min(held, due);
      const debtCreated = due - takenBack;

      const row = this.db
        .prepare(
          `INSERT INTO refunds (event_id, user_id, order_id, points_due, taken_back, debt_created)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        )
        .get(input.eventId, input.userId, input.orderId, due, takenBack, debtCreated) as unknown as RefundRow;

      const entry =
        takenBack > 0
          ? this.insertRow("clawback", `refund:${input.eventId}`, input.userId, input.orderId, -takenBack)
          : null;
      if (debtCreated > 0) {
        this.db
          .prepare("INSERT INTO debts (user_id, refund_id, amount, remaining) VALUES (?, ?, ?, ?)")
          .run(input.userId, row.id, debtCreated, debtCreated);
      }
      return { orderId: input.orderId, pointsDue: due, takenBack, debtCreated, entry, duplicate: false };
    });
  }

  balance(userId: string): Balance {
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0)                                   AS ledger,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount END), 0) AS settled,
                COUNT(CASE WHEN status <> 'confirmed' THEN 1 END)          AS unsettled
           FROM ledger_entries WHERE user_id = ?`,
      )
      .get(userId) as unknown as { ledger: number; settled: number; unsettled: number };
    const debt = (
      this.db.prepare("SELECT COALESCE(SUM(remaining), 0) AS n FROM debts WHERE user_id = ?").get(userId) as unknown as {
        n: number;
      }
    ).n;
    return { ledgerBalance: row.ledger, settledBalance: row.settled, unsettledEntries: row.unsettled, debt };
  }

  // --- Reads used by reconciliation -------------------------------------------------------

  userIds(): string[] {
    const rows = this.db.prepare("SELECT DISTINCT user_id FROM ledger_entries ORDER BY user_id").all() as unknown as {
      user_id: string;
    }[];
    return rows.map((r) => r.user_id);
  }

  stuckEntries(): EntryRow[] {
    return this.db.prepare("SELECT * FROM ledger_entries WHERE status = 'stuck' ORDER BY id").all() as unknown as EntryRow[];
  }

  waitingCount(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS n FROM ledger_entries WHERE status IN ('pending', 'submitted')")
      .get() as unknown as { n: number };
    return row.n;
  }

  // --- Internals ---------------------------------------------------------------------------

  private findByKey(idemKey: string): EntryRow | undefined {
    return this.db.prepare("SELECT * FROM ledger_entries WHERE idem_key = ?").get(idemKey) as unknown as
      | EntryRow
      | undefined;
  }

  private insertRow(kind: EntryKind, idemKey: string, userId: string, orderId: string, signedAmount: number): EntryRow {
    return this.db
      .prepare(
        `INSERT INTO ledger_entries (idem_key, kind, user_id, order_id, amount, ref)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .get(idemKey, kind, userId, orderId, signedAmount, refFor(idemKey)) as unknown as EntryRow;
  }

  /**
   * Look for a repeat, check the balance, insert. The caller owns the transaction.
   * The ledger never waits for the chain, so the app is never blocked by block times.
   */
  private append(kind: "earn" | "spend", eventId: string, userId: string, orderId: string, points: number): Written {
    const idemKey = `${kind}:${eventId}`;
    const existing = this.findByKey(idemKey);
    if (existing) {
      // Same event again (e.g. a webhook retry): return the first result, change nothing.
      const same =
        existing.user_id === userId && existing.order_id === orderId && Math.abs(existing.amount) === points;
      if (!same) throw keyReused(idemKey);
      return { entry: existing, points, duplicate: true };
    }

    if (kind === "spend") {
      const { ledgerBalance } = this.balance(userId);
      if (ledgerBalance < points) throw insufficientBalance(ledgerBalance, points);
    }

    const entry = this.insertRow(kind, idemKey, userId, orderId, kind === "earn" ? points : -points);
    return { entry, points, duplicate: false };
  }

  /** Use a fresh reward to pay off the user's debts, oldest first. Returns the points used. */
  private payDebt(userId: string, eventId: string, orderId: string, points: number): number {
    const debts = this.db
      .prepare("SELECT id, remaining FROM debts WHERE user_id = ? AND remaining > 0 ORDER BY id")
      .all(userId) as unknown as { id: number; remaining: number }[];
    let left = points;
    let applied = 0;
    for (const debt of debts) {
      if (left === 0) break;
      const use = Math.min(left, debt.remaining);
      this.db.prepare("UPDATE debts SET remaining = remaining - ? WHERE id = ?").run(use, debt.id);
      left -= use;
      applied += use;
    }
    if (applied > 0) this.insertRow("clawback", `debtpay:${eventId}`, userId, orderId, -applied);
    return applied;
  }
}
