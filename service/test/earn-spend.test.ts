import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { refFor } from "../src/ledger.ts";
import { addressFor } from "../src/wallets.ts";
import { call, ensureChain, uid, withStack, type Stack } from "./harness.ts";

const earn = (s: Stack, userId: string, over: Record<string, unknown> = {}) =>
  call(s.baseUrl, "POST", "/earn", { eventId: uid("evt"), userId, orderId: uid("order"), purchaseCents: 5000, ...over });
const spend = (s: Stack, userId: string, points: number, over: Record<string, unknown> = {}) =>
  call(s.baseUrl, "POST", "/spend", { eventId: uid("spend"), userId, orderId: uid("order"), points, ...over });
const balance = async (s: Stack, userId: string) => (await call(s.baseUrl, "GET", `/balance/${userId}`)).body;

describe("earn and spend: app ledger and on-chain token", () => {
  let stopChain = () => {};
  before(async () => {
    stopChain = await ensureChain();
  });
  after(() => stopChain());

  it("an earn is recorded at once and settles on-chain", () =>
    withStack(async (s) => {
      const userId = uid("user");
      const r = await earn(s, userId); // $50.00 at 2% = 100 points
      assert.equal(r.status, 201);
      assert.equal(r.body.points, 100);
      assert.equal(r.body.status, "pending");
      assert.equal(r.body.balance, 100);

      let b = await balance(s, userId);
      // The chain has not seen the earn yet. That is waiting, not drift: the chain still
      // equals the confirmed part of the ledger, and the wait is visible as an unsettled entry.
      assert.deepEqual(
        [b.ledgerBalance, b.settledBalance, b.onChainBalance, b.unsettledEntries, b.inSync],
        [100, 0, 0, 1, true],
      );

      assert.equal((await s.settler.runOnce()).confirmed, 1);
      b = await balance(s, userId);
      assert.deepEqual(
        [b.ledgerBalance, b.settledBalance, b.onChainBalance, b.unsettledEntries, b.inSync],
        [100, 100, 100, 0, true],
      );
    }));

  it("a spend reduces the balance and settles on-chain", () =>
    withStack(async (s) => {
      const userId = uid("user");
      await earn(s, userId);
      await s.settler.runOnce();

      const r = await spend(s, userId, 40);
      assert.equal(r.status, 201);
      assert.equal(r.body.balance, 60);

      await s.settler.runOnce();
      const b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync], [60, 60, true]);
    }));

  it("the app never waits on the chain: a spend works before the earn has settled", () =>
    withStack(async (s) => {
      const userId = uid("user");
      await earn(s, userId);
      const r = await spend(s, userId, 40); // no settle in between
      assert.equal(r.status, 201);

      let b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance], [60, 0]);

      const report = await s.settler.runOnce(); // earn goes first, then the spend
      assert.equal(report.confirmed, 2);
      b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync], [60, 60, true]);
    }));

  it("F1: the same earn sent twice is rewarded once", () =>
    withStack(async (s) => {
      const userId = uid("user");
      const body = { eventId: uid("evt"), userId, orderId: "order-1", purchaseCents: 5000 };
      const first = await call(s.baseUrl, "POST", "/earn", body);
      const second = await call(s.baseUrl, "POST", "/earn", body); // webhook retry
      assert.equal(first.status, 201);
      assert.equal(second.status, 200);
      assert.equal(second.body.duplicate, true);
      assert.equal(second.body.entryId, first.body.entryId);

      await s.settler.runOnce();
      const b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance], [100, 100]);

      // Same eventId with different details is a client bug, not a retry.
      const clash = await call(s.baseUrl, "POST", "/earn", { ...body, purchaseCents: 9000 });
      assert.equal(clash.status, 409);
      assert.equal(clash.body.error, "IDEMPOTENCY_KEY_REUSED");
    }));

  it("F1: the same spend sent twice is charged once, even if the balance is gone", () =>
    withStack(async (s) => {
      const userId = uid("user");
      await earn(s, userId, { purchaseCents: 2000 }); // 40 points
      const body = { eventId: uid("spend"), userId, orderId: "order-9", points: 40 };
      assert.equal((await call(s.baseUrl, "POST", "/spend", body)).status, 201);
      const retry = await call(s.baseUrl, "POST", "/spend", body); // balance is now 0
      assert.equal(retry.status, 200);
      assert.equal(retry.body.duplicate, true);
      assert.equal((await balance(s, userId)).ledgerBalance, 0);
    }));

  it("F2: five simultaneous spends cannot overspend the balance", () =>
    withStack(async (s) => {
      const userId = uid("user");
      await earn(s, userId); // 100 points
      await s.settler.runOnce();

      const results = await Promise.all([1, 2, 3, 4, 5].map(() => spend(s, userId, 40)));
      const ok = results.filter((r) => r.status === 201);
      const refused = results.filter((r) => r.status === 409);
      assert.equal(ok.length, 2);
      assert.equal(refused.length, 3);
      assert.ok(refused.every((r) => r.body.error === "INSUFFICIENT_BALANCE"));

      await s.settler.runOnce();
      const b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync], [20, 20, true]);
    }));

  it("a spend with too few points is refused and leaves no trace", () =>
    withStack(async (s) => {
      const userId = uid("user");
      const r = await spend(s, userId, 10);
      assert.equal(r.status, 409);
      assert.equal(r.body.error, "INSUFFICIENT_BALANCE");
      const rows = s.db.prepare("SELECT COUNT(*) AS n FROM ledger_entries").get() as unknown as { n: number };
      assert.equal(rows.n, 0);
    }));

  it("the database itself refuses an overspend, even if the application code did not", () =>
    withStack(async (s) => {
      assert.throws(
        () =>
          s.db
            .prepare(
              `INSERT INTO ledger_entries (idem_key, kind, user_id, order_id, amount, ref)
               VALUES ('spend:raw', 'spend', 'nobody', 'o', -5, '0x01')`,
            )
            .run(),
        /INSUFFICIENT_BALANCE/,
      );
    }));

  it("recovers when the chain already holds the reference (a crash after sending)", () =>
    withStack(async (s) => {
      const userId = uid("user");
      const eventId = uid("evt");
      await earn(s, userId, { eventId });

      // Simulate: an earlier run sent the mint, then died before writing the hash down.
      const hash = await s.chain.send("mint", addressFor(userId), 100n, refFor(`earn:${eventId}`));
      await s.chain.waitForReceipt(hash);

      const report = await s.settler.runOnce(); // must notice, not mint a second time
      assert.equal(report.confirmed, 1);
      const b = await balance(s, userId);
      assert.deepEqual([b.ledgerBalance, b.settledBalance, b.onChainBalance, b.inSync], [100, 100, 100, true]);
      const row = s.db.prepare("SELECT status, tx_hash FROM ledger_entries").get() as unknown as {
        status: string;
        tx_hash: string | null;
      };
      assert.deepEqual([row.status, row.tx_hash], ["confirmed", null]); // the settler never sent a transaction
    }));

  it("a purchase too small to earn a point is accepted and records nothing", () =>
    withStack(async (s) => {
      const r = await earn(s, uid("user"), { purchaseCents: 10 });
      assert.equal(r.status, 200);
      assert.equal(r.body.points, 0);
      assert.equal(r.body.entryId, null);
    }));

  it("bad requests are rejected with a clear error", () =>
    withStack(async (s) => {
      const userId = uid("user");
      const negative = await spend(s, userId, -5);
      assert.equal(negative.status, 400);
      assert.equal(negative.body.error, "INVALID_REQUEST");

      const extra = await earn(s, userId, { surprise: true });
      assert.equal(extra.status, 400);

      const broken = await call(s.baseUrl, "POST", "/earn", "{not json");
      assert.equal(broken.status, 400);

      const missing = await call(s.baseUrl, "GET", "/nope");
      assert.equal(missing.status, 404);
    }));
});
