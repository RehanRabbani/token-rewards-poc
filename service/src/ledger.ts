import type { DatabaseSync } from "node:sqlite";
import { keccak256, toHex, type Hex } from "viem";
import { inTransaction, type EntryRow } from "./db.ts";
import { insufficientBalance, keyReused } from "./errors.ts";

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
export interface Balance {
  /** Everything recorded for the user. This is the number the app shows and spends from. */
  ledgerBalance: number;
  /** The part of it already confirmed on-chain. */
  settledBalance: number;
  /** Entries still waiting for the chain. */
  unsettledEntries: number;
}
export interface WriteResult {
  entry: EntryRow | null;
  points: number;
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

  earn(input: EarnInput): WriteResult {
    const points = this.pointsForPurchase(input.purchaseCents);
    if (points === 0) return { entry: null, points: 0, duplicate: false };
    return this.append("earn", input.eventId, input.userId, input.orderId, points);
  }

  spend(input: SpendInput): WriteResult {
    return this.append("spend", input.eventId, input.userId, input.orderId, input.points);
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
    return { ledgerBalance: row.ledger, settledBalance: row.settled, unsettledEntries: row.unsettled };
  }

  private findByKey(idemKey: string): EntryRow | undefined {
    return this.db.prepare("SELECT * FROM ledger_entries WHERE idem_key = ?").get(idemKey) as unknown as
      | EntryRow
      | undefined;
  }

  /**
   * One transaction: look for a repeat, check the balance, insert.
   * The ledger never waits for the chain, so the app is never blocked by block times.
   */
  private append(
    kind: "earn" | "spend",
    eventId: string,
    userId: string,
    orderId: string,
    points: number,
  ): WriteResult {
    const idemKey = `${kind}:${eventId}`;
    return inTransaction(this.db, () => {
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

      const signed = kind === "earn" ? points : -points;
      const entry = this.db
        .prepare(
          `INSERT INTO ledger_entries (idem_key, kind, user_id, order_id, amount, ref)
           VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        )
        .get(idemKey, kind, userId, orderId, signed, refFor(idemKey)) as unknown as EntryRow;
      return { entry, points, duplicate: false };
    });
  }
}
