import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Settler } from "../src/settler.ts";
import { addressFor } from "../src/wallets.ts";
import { api, ensureChain, FlakyChain, uid, withStack } from "./harness.ts";

/**
 * F3: the service can die at any moment between "send to the chain" and "write it down".
 * A restart is a new Settler over the same database. Nothing is kept in memory.
 */
describe("F3: crashes while settling", () => {
  let stopChain = () => {};
  before(async () => {
    stopChain = await ensureChain();
  });
  after(() => stopChain());

  it("crash right after sending: the restarted settler does not mint a second time", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId); // 100 points

      const flaky = new FlakyChain(s.chain);
      flaky.afterSend = 1; // the mint reaches the chain, then the process "dies"
      const report = await new Settler(s.db, flaky, 5).runOnce();
      assert.deepEqual([report.confirmed, report.retrying, report.stuck], [0, 1, 0]);

      // The chain already has the points; the ledger has not written that down yet.
      let b = await a.balance(userId);
      assert.deepEqual(
        [b.ledgerBalance, b.settledBalance, b.onChainBalance, b.inSync],
        [100, 0, 100, false],
      );

      // Restart.
      const restarted = await new Settler(s.db, s.chain, 5).runOnce();
      assert.equal(restarted.confirmed, 1);
      b = await a.balance(userId);
      assert.deepEqual(
        [b.ledgerBalance, b.settledBalance, b.onChainBalance, b.inSync],
        [100, 100, 100, true], // still 100, not 200
      );
      assert.equal(flaky.sends, 1);
    }));

  it("crash while waiting for confirmation: the restarted settler confirms it without sending again", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);

      const flaky = new FlakyChain(s.chain);
      flaky.duringWait = 1;
      await new Settler(s.db, flaky, 5).runOnce();
      const row = s.db.prepare("SELECT status, tx_hash, attempts FROM ledger_entries").get() as unknown as {
        status: string;
        tx_hash: string | null;
        attempts: number;
      };
      assert.equal(row.status, "submitted"); // sent and the hash was saved, but never confirmed
      assert.ok(row.tx_hash);
      assert.equal(row.attempts, 1);

      const restarted = await new Settler(s.db, s.chain, 5).runOnce();
      assert.equal(restarted.confirmed, 1);
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync], [100, 100, true]);
      assert.equal(flaky.sends, 1);
    }));

  it("chain unreachable: the app keeps working, the entries wait, then everything settles", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const flaky = new FlakyChain(s.chain);
      flaky.down = true;

      assert.equal((await a.earn(userId)).status, 201);
      assert.equal((await a.spend(userId, 40)).status, 201); // spends against the ledger, no chain needed
      assert.equal((await a.balance(userId)).ledgerBalance, 60);

      const settler = new Settler(s.db, flaky, 5);
      const down = await settler.runOnce();
      assert.deepEqual([down.confirmed, down.retrying, down.stuck], [0, 1, 0]); // the spend waits behind the earn

      flaky.down = false; // the chain is back
      const up = await settler.runOnce();
      assert.equal(up.confirmed, 2);
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.settledBalance, b.onChainBalance, b.inSync], [60, 60, 60, true]);
    }));

  it("after too many failures an entry is marked stuck; only that user waits; a person can requeue it", () =>
    withStack(async (s) => {
      const a = api(s);
      const bad = uid("bad");
      const good = uid("good");
      await a.earn(bad);
      await a.earn(good);

      const flaky = new FlakyChain(s.chain);
      flaky.only = addressFor(bad);
      flaky.beforeSend = 99; // every send for this one user fails
      const settler = new Settler(s.db, flaky, 5);

      for (let i = 0; i < 5; i++) await settler.runOnce();
      assert.equal((await a.balance(good)).onChainBalance, 100); // the other user was never held back
      const stuck = s.db.prepare("SELECT status, attempts, last_error FROM ledger_entries WHERE user_id = ?").get(bad) as unknown as {
        status: string;
        attempts: number;
        last_error: string;
      };
      assert.deepEqual([stuck.status, stuck.attempts], ["stuck", 5]);
      assert.match(stuck.last_error, /connection dropped/);

      // A later entry for the same user waits behind the stuck one (order must be kept).
      await a.earn(bad);
      assert.equal((await settler.runOnce()).confirmed, 0);

      // A person has looked and fixed the cause; put the entries back in the queue.
      flaky.beforeSend = 0;
      assert.equal(settler.requeueStuck(), 1);
      assert.equal((await settler.runOnce()).confirmed, 2);
      const b = await a.balance(bad);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync, b.unsettledEntries], [200, 200, true, 0]);
    }));

  it("if the first safety check is wrong, the contract still refuses the second mint", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);
      await s.settler.runOnce();
      assert.equal((await a.balance(userId)).onChainBalance, 100);

      // Pretend a lost write: the ledger forgot this entry was settled, and the isProcessed check lies.
      s.db.prepare("UPDATE ledger_entries SET status = 'pending', tx_hash = NULL").run();
      const flaky = new FlakyChain(s.chain);
      flaky.denyProcessed = true;
      const report = await new Settler(s.db, flaky, 5).runOnce();

      assert.equal(report.confirmed, 1); // the contract said AlreadyProcessed, which counts as done
      assert.equal(flaky.sends, 0); // nothing new reached the chain
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.settledBalance, b.onChainBalance, b.inSync], [100, 100, 100, true]);
    }));

  it("two settlers running at the same time cannot mint twice", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);

      await Promise.all([new Settler(s.db, s.chain, 5).runOnce(), new Settler(s.db, s.chain, 5).runOnce()]);
      // One of them may have lost a race and be waiting to retry; run again until nothing is left.
      for (let i = 0; i < 3 && (await a.balance(userId)).unsettledEntries > 0; i++) {
        await new Settler(s.db, s.chain, 5).runOnce();
      }
      const b = await a.balance(userId);
      assert.deepEqual(
        [b.ledgerBalance, b.settledBalance, b.onChainBalance, b.unsettledEntries, b.inSync],
        [100, 100, 100, 0, true],
      );
    }));
});
