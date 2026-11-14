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

export interface RefundRow {
  id: number;
  event_id: string;
  user_id: string;
  order_id: string;
  points_due: number; // what the order had earned
  taken_back: number; // the part the user still held, taken back now
  debt_created: number; // the part already spent, owed and netted against future rewards
  created_at: string;
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

-- A refund is never blocked. We take back what the user still holds; the part they
-- already spent is recorded here as debt and netted against their next rewards.
CREATE TABLE IF NOT EXISTS refunds (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id     TEXT    NOT NULL UNIQUE,   -- the partner's refund event id: a retry cannot refund twice
  user_id      TEXT    NOT NULL,
  order_id     TEXT    NOT NULL,
  points_due   INTEGER NOT NULL CHECK (points_due >= 0),
  taken_back   INTEGER NOT NULL CHECK (taken_back >= 0),
  debt_created INTEGER NOT NULL CHECK (debt_created >= 0),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, order_id),             -- one refund per order
  CHECK (taken_back + debt_created = points_due)
);

CREATE TABLE IF NOT EXISTS debts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  refund_id  INTEGER NOT NULL REFERENCES refunds (id),
  amount     INTEGER NOT NULL CHECK (amount > 0),
  remaining  INTEGER NOT NULL CHECK (remaining >= 0 AND remaining <= amount),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_debts_user ON debts (user_id, id);

-- Backstop: even if application code has a bug, the database itself refuses a spend
-- or a clawback that would take a user's balance below zero.
DROP TRIGGER IF EXISTS no_overspend;
CREATE TRIGGER no_overspend
BEFORE INSERT ON ledger_entries
WHEN NEW.kind IN ('spend', 'clawback')
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
