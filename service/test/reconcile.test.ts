import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { keccak256, toHex } from "viem";
import { reconcile } from "../src/reconcile.ts";
import { Settler } from "../src/settler.ts";
import { addressFor } from "../src/wallets.ts";
import { api, call, ensureChain, FlakyChain, uid, withStack } from "./harness.ts";

/**
 * F5: a check anyone can run to see whether the ledger and the chain tell the same story.
 * It only reports. It never changes anything.
 */
describe("F5: reconciliation", () => {
  let stopChain = () => {};
  before(async () => {
    stopChain = await ensureChain();
  });
  after(() => stopChain());

  it("is clean when the ledger and the chain agree", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);
      await a.spend(userId, 40);
      await a.settle();

      const r = await a.reconcile();
      assert.deepEqual(r, { ok: true, checkedUsers: 1, waitingEntries: 0, drift: [], stuck: [] });
    }));

  it("entries that are still on their way are waiting, not a problem", () =>
    withStack(async (s) => {
      const a = api(s);
      await a.earn(uid("user"));

      const r = await a.reconcile();
      assert.equal(r.ok, true);
      assert.equal(r.waitingEntries, 1);
      assert.deepEqual(r.drift, []);
    }));

  it("finds points that appeared on the chain without the ledger", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);
      await a.settle();
      // Someone with the issuer key mints 5 points directly, bypassing the ledger.
      const hash = await s.chain.send("mint", addressFor(userId), 5n, keccak256(toHex("rogue-mint")));
      await s.chain.waitForReceipt(hash);

      const r = await a.reconcile();
      assert.equal(r.ok, false);
      assert.deepEqual(r.drift, [{ userId, settledBalance: 100, onChainBalance: 105, difference: 5 }]);
    }));

  it("finds a ledger entry marked as settled that the chain never saw", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId); // never settled
      s.db.prepare("UPDATE ledger_entries SET status = 'confirmed'").run(); // the ledger wrongly believes it

      const r = await a.reconcile();
      assert.equal(r.ok, false);
      assert.deepEqual(r.drift, [{ userId, settledBalance: 100, onChainBalance: 0, difference: -100 }]);
    }));

  it("lists stuck entries with the reason, and is clean again after they are requeued and settled", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);

      const flaky = new FlakyChain(s.chain);
      flaky.down = true;
      await new Settler(s.db, flaky, 1).runOnce(); // one failure is enough to get stuck

      let r = await a.reconcile();
      assert.equal(r.ok, false);
      assert.equal(r.stuck.length, 1);
      assert.deepEqual(
        [r.stuck[0].userId, r.stuck[0].kind, r.stuck[0].amount, r.stuck[0].attempts],
        [userId, "earn", 100, 1],
      );
      assert.match(r.stuck[0].lastError, /chain unreachable/);
      assert.deepEqual(r.drift, []); // stuck is not drift: the ledger has not claimed it is on-chain

      const requeued = await call(s.baseUrl, "POST", "/admin/requeue-stuck");
      assert.equal(requeued.body.requeued, 1);
      await a.settle();

      r = await a.reconcile();
      assert.deepEqual(r, { ok: true, checkedUsers: 1, waitingEntries: 0, drift: [], stuck: [] });
    }));

  it("says so when the chain cannot be reached, instead of reporting made-up differences", () =>
    withStack(async (s) => {
      const a = api(s);
      await a.earn(uid("user"));
      const flaky = new FlakyChain(s.chain);
      flaky.down = true;
      await assert.rejects(() => reconcile(s.ledger, flaky), { code: "CHAIN_UNREACHABLE", status: 503 });
    }));
});
