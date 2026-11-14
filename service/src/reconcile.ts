import type { Chain } from "./chain.ts";
import { chainUnreachable } from "./errors.ts";
import type { Ledger } from "./ledger.ts";
import { addressFor } from "./wallets.ts";

export interface DriftItem {
  userId: string;
  /** What the ledger says the chain should hold (the confirmed part of the ledger). */
  settledBalance: number;
  /** What the chain really holds. */
  onChainBalance: number;
  /** onChainBalance minus settledBalance. Positive: the chain has more than the ledger explains. */
  difference: number;
}
export interface StuckItem {
  entryId: number;
  userId: string;
  kind: string;
  amount: number;
  attempts: number;
  lastError: string | null;
}
export interface ReconcileReport {
  /** True when there is no unexplained difference and nothing is stuck. */
  ok: boolean;
  checkedUsers: number;
  /** Entries still on their way to the chain. This is waiting, not a problem. */
  waitingEntries: number;
  drift: DriftItem[];
  stuck: StuckItem[];
}

/**
 * Compare the ledger with the chain, user by user. Read-only: it reports, it never repairs.
 * Fixing a difference is a decision for a person, because the right fix depends on the cause.
 *
 * A difference can also show up for a moment while the settler is mid-send. So a user who
 * looks different is looked at once more before being reported.
 */
export async function reconcile(ledger: Ledger, chain: Chain): Promise<ReconcileReport> {
  const users = ledger.userIds();
  const drift: DriftItem[] = [];

  const read = async (userId: string) => {
    const settledBalance = ledger.balance(userId).settledBalance;
    try {
      return { settledBalance, onChainBalance: Number(await chain.balanceOf(addressFor(userId))) };
    } catch {
      throw chainUnreachable();
    }
  };

  for (const userId of users) {
    let now = await read(userId);
    if (now.onChainBalance !== now.settledBalance) now = await read(userId);
    if (now.onChainBalance !== now.settledBalance) {
      drift.push({ userId, ...now, difference: now.onChainBalance - now.settledBalance });
    }
  }

  const stuck: StuckItem[] = ledger.stuckEntries().map((e) => ({
    entryId: e.id,
    userId: e.user_id,
    kind: e.kind,
    amount: e.amount,
    attempts: e.attempts,
    lastError: e.last_error,
  }));

  return {
    ok: drift.length === 0 && stuck.length === 0,
    checkedUsers: users.length,
    waitingEntries: ledger.waitingCount(),
    drift,
    stuck,
  };
}
