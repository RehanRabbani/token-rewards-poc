import type { DatabaseSync } from "node:sqlite";
import type { Hex } from "viem";
import { describeError, revertName, type Chain, type ChainOp } from "./chain.ts";
import type { EntryRow } from "./db.ts";
import { addressFor } from "./wallets.ts";

/** The chain refused these for a reason retrying cannot fix: a person must look. */
const NON_RETRYABLE = new Set(["ERC20InsufficientBalance", "TransfersDisabled"]);

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

export interface SettleReport {
  confirmed: number;
  retrying: number;
  stuck: number;
}

/**
 * Sends ledger entries to the chain, oldest first, one at a time per user, so a
 * spend is never sent before the earn that funds it. Safe to run any number of
 * times, and safe to be killed at any point.
 */
export class Settler {
  constructor(
    private readonly db: DatabaseSync,
    private readonly chain: Chain,
    private readonly maxAttempts = 5,
  ) {}

  async runOnce(): Promise<SettleReport> {
    const report: SettleReport = { confirmed: 0, retrying: 0, stuck: 0 };
    const failedThisPass = new Set<number>();
    for (;;) {
      const entry = this.nextEligible(failedThisPass);
      if (!entry) return report;
      try {
        await this.settle(entry);
        report.confirmed++;
      } catch (err) {
        failedThisPass.add(entry.id);
        if (this.recordFailure(entry, err) === "stuck") report.stuck++;
        else report.retrying++;
      }
    }
  }

  /**
   * Put stuck entries back in the queue, after a person has looked at why they failed.
   * Safe to repeat: the settler asks the chain first, so nothing is sent twice.
   * Note that a stuck entry holds back that user's later entries (never other users').
   */
  requeueStuck(): number {
    const result = this.db
      .prepare(`UPDATE ledger_entries SET status = 'pending', attempts = 0, updated_at = ${NOW} WHERE status = 'stuck'`)
      .run();
    return Number(result.changes);
  }

  /** The oldest unsettled entry whose user has nothing unsettled before it. */
  private nextEligible(skip: Set<number>): EntryRow | undefined {
    const candidates = this.db
      .prepare(
        `SELECT e.* FROM ledger_entries e
          WHERE e.status IN ('pending', 'submitted')
            AND NOT EXISTS (SELECT 1 FROM ledger_entries p
                             WHERE p.user_id = e.user_id AND p.id < e.id AND p.status <> 'confirmed')
          ORDER BY e.id LIMIT 100`,
      )
      .all() as unknown as EntryRow[];
    return candidates.find((c) => !skip.has(c.id));
  }

  private async settle(entry: EntryRow): Promise<void> {
    const ref = entry.ref as Hex;

    // 1. Ask the chain first. If an earlier run sent this transaction and crashed before
    //    writing down the hash, the chain already knows the reference. Sending again would be a double.
    if (await this.chain.isProcessed(ref)) {
      this.markConfirmed(entry.id, null);
      return;
    }

    // 2. Send. The contract also rejects a reused reference, as a second line of defence.
    const op: ChainOp = entry.kind === "earn" ? "mint" : "burn";
    let hash: Hex;
    try {
      hash = await this.chain.send(op, addressFor(entry.user_id), BigInt(Math.abs(entry.amount)), ref);
    } catch (err) {
      if (revertName(err) === "AlreadyProcessed") {
        this.markConfirmed(entry.id, null);
        return;
      }
      throw err;
    }

    // 3. Write the hash down, then wait for confirmation.
    this.db.prepare(`UPDATE ledger_entries SET status = 'submitted', tx_hash = ?, updated_at = ${NOW} WHERE id = ?`).run(hash, entry.id);
    await this.chain.waitForReceipt(hash);
    this.markConfirmed(entry.id, hash);
  }

  private markConfirmed(id: number, hash: Hex | null): void {
    this.db
      .prepare(
        `UPDATE ledger_entries SET status = 'confirmed', tx_hash = COALESCE(?, tx_hash), last_error = NULL, updated_at = ${NOW} WHERE id = ?`,
      )
      .run(hash, id);
  }

  private recordFailure(entry: EntryRow, err: unknown): "retrying" | "stuck" {
    const attempts = entry.attempts + 1;
    const name = revertName(err);
    const stuck = (name !== undefined && NON_RETRYABLE.has(name)) || attempts >= this.maxAttempts;
    this.db
      .prepare(
        `UPDATE ledger_entries SET attempts = ?, last_error = ?, status = CASE WHEN ? THEN 'stuck' ELSE status END, updated_at = ${NOW} WHERE id = ?`,
      )
      .run(attempts, describeError(err), stuck ? 1 : 0, entry.id);
    return stuck ? "stuck" : "retrying";
  }
}
