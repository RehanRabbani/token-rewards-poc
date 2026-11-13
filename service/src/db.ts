import { DatabaseSync } from "node:sqlite";

export type EntryKind = "earn" | "spend" | "clawback";
/**
 * pending   = recorded in the ledger, not yet sent to the chain
 * submitted = sent to the chain, waiting for confirmation
 * confirmed = on-chain balance reflects this entry
 * stuck     = the chain refused it or retries ran out; needs a person (shown by reconciliation)
 */
export type EntryStatus = "pending" | "submitted" | "confirmed" | "stuck";

export interface EntryRow {
  id: number;
  idem_key: string;
  kind: EntryKind;
  user_id: string;
  order_id: string;
  amount: number; // signed points: positive = earn, negative = spend / clawback
  ref: string; // bytes32 sent to the contract; the contract accepts each ref once
  status: EntryStatus;
  tx_hash: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ledger_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  idem_key    TEXT    NOT NULL UNIQUE,   -- "<kind>:<partner event id>": a repeated request cannot add a second row
  kind        TEXT    NOT NULL CHECK (kind IN ('earn','spend','clawback')),
  user_id     TEXT    NOT NULL,
  order_id    TEXT    NOT NULL,
  amount      INTEGER NOT NULL,
  ref         TEXT    NOT NULL UNIQUE,
  status      TEXT    NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','submitted','confirmed','stuck')),
  tx_hash     TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((kind = 'earn' AND amount > 0) OR (kind IN ('spend','clawback') AND amount < 0))
);
CREATE INDEX IF NOT EXISTS idx_entries_user   ON ledger_entries (user_id, id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON ledger_entries (status, id);

-- Backstop: even if application code has a bug, the database itself refuses
-- a spend that would take a user's balance below zero.
CREATE TRIGGER IF NOT EXISTS no_overspend
BEFORE INSERT ON ledger_entries
WHEN NEW.kind = 'spend'
 AND (SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE user_id = NEW.user_id) + NEW.amount < 0
BEGIN
  SELECT RAISE(ABORT, 'INSUFFICIENT_BALANCE');
END;
`;

export function openDb(path = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(path);
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}

/** Run fn as one all-or-nothing database transaction. */
export function inTransaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
