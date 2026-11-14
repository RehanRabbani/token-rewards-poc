import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { api, ensureChain, uid, withStack } from "./harness.ts";

/**
 * F4: a refund is never blocked. We take back the points the customer still holds.
 * The part they already spent becomes debt, taken off their next rewards (never extra cash).
 * The running example: a $50 order earns 100 points, the customer spends 60, then refunds the order.
 */
describe("F4: refunds", () => {
  let stopChain = () => {};
  before(async () => {
    stopChain = await ensureChain();
  });
  after(() => stopChain());

  it("takes back the points the customer still holds", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order }); // 100 points
      await a.settle();

      const r = await a.refund(userId, order);
      assert.equal(r.status, 201);
      assert.deepEqual(
        [r.body.pointsDue, r.body.takenBack, r.body.debtCreated, r.body.balance, r.body.debt],
        [100, 100, 0, 0, 0],
      );

      await a.settle(); // the burn reaches the chain
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.inSync], [0, 0, true]);
    }));

  it("points already spent: take what is left, record the rest as debt", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order }); // 100
      await a.spend(userId, 60); // 40 left

      const r = await a.refund(userId, order);
      assert.equal(r.status, 201); // the refund is never blocked
      assert.deepEqual(
        [r.body.pointsDue, r.body.takenBack, r.body.debtCreated, r.body.balance, r.body.debt],
        [100, 40, 60, 0, 60],
      );

      await a.settle();
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.debt, b.inSync], [0, 0, 60, true]);
    }));

  it("the next reward pays the debt first, so the customer pays nothing extra", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order }); // 100
      await a.spend(userId, 60);
      await a.refund(userId, order); // debt 60

      const next = await a.earn(userId); // 100 new points
      assert.equal(next.status, 201);
      assert.equal(next.body.points, 100);
      assert.equal(next.body.appliedToDebt, 60);
      assert.equal(next.body.balance, 40); // 100 earned, 60 went to the debt

      await a.settle();
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.debt, b.inSync], [40, 40, 0, true]);
    }));

  it("a small reward pays part of the debt, the rest waits for the next one", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order }); // 100
      await a.spend(userId, 100);
      const r = await a.refund(userId, order); // nothing left to take: all 100 is debt
      assert.deepEqual([r.body.takenBack, r.body.debtCreated, r.body.entryId], [0, 100, null]);

      const small = await a.earn(userId, { purchaseCents: 2000 }); // 40 points
      assert.deepEqual([small.body.appliedToDebt, small.body.balance], [40, 0]);
      assert.equal((await a.balance(userId)).debt, 60);

      const big = await a.earn(userId, { purchaseCents: 5000 }); // 100 points
      assert.deepEqual([big.body.appliedToDebt, big.body.balance], [60, 40]);

      await a.settle();
      const b = await a.balance(userId);
      assert.deepEqual([b.ledgerBalance, b.onChainBalance, b.debt, b.inSync], [40, 40, 0, true]);
    }));

  it("the same refund sent twice is applied once; a second refund for the same order is refused", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order });
      await a.spend(userId, 60);

      const body = { eventId: uid("refund"), userId, orderId: order };
      const first = await a.refund(userId, order, { eventId: body.eventId });
      const retry = await a.refund(userId, order, { eventId: body.eventId }); // webhook retry
      assert.equal(retry.status, 200);
      assert.equal(retry.body.duplicate, true);
      assert.deepEqual(
        [retry.body.takenBack, retry.body.debtCreated, retry.body.entryId],
        [first.body.takenBack, first.body.debtCreated, first.body.entryId],
      );
      assert.equal((await a.balance(userId)).debt, 60); // not 120

      const again = await a.refund(userId, order); // new event id, same order
      assert.equal(again.status, 409);
      assert.equal(again.body.error, "ALREADY_REFUNDED");

      const clash = await a.refund(userId, uid("other-order"), { eventId: body.eventId }); // same event id, other order
      assert.equal(clash.status, 409);
      assert.equal(clash.body.error, "IDEMPOTENCY_KEY_REUSED");
    }));

  it("a repeated earn does not pay the debt twice", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const order = uid("order");
      await a.earn(userId, { orderId: order });
      await a.spend(userId, 60);
      await a.refund(userId, order); // debt 60

      const eventId = uid("evt");
      const first = await a.earn(userId, { eventId, orderId: "order-next" }); // pays 60
      const retry = await a.earn(userId, { eventId, orderId: "order-next" }); // webhook retry
      assert.equal(retry.status, 200);
      assert.equal(retry.body.duplicate, true);
      assert.deepEqual([retry.body.appliedToDebt, retry.body.balance], [first.body.appliedToDebt, first.body.balance]);
      assert.deepEqual([retry.body.appliedToDebt, retry.body.balance], [60, 40]);
      assert.equal((await a.balance(userId)).debt, 0);
    }));

  it("an order that earned nothing is still accepted", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId); // 100 points from some other order

      const r = await a.refund(userId, "order-that-never-earned");
      assert.equal(r.status, 201);
      assert.deepEqual([r.body.pointsDue, r.body.takenBack, r.body.debtCreated, r.body.balance], [0, 0, 0, 100]);
    }));

  it("a refund only touches the points of its own order", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      const orderA = uid("order-a");
      await a.earn(userId, { orderId: orderA }); // 100
      await a.earn(userId, { orderId: uid("order-b"), purchaseCents: 2500 }); // 50

      const r = await a.refund(userId, orderA);
      assert.deepEqual([r.body.pointsDue, r.body.takenBack, r.body.balance], [100, 100, 50]);
    }));

  it("bad refund requests are rejected", () =>
    withStack(async (s) => {
      const a = api(s);
      const missing = await a.refund("user-x", "order-x", { orderId: undefined });
      assert.equal(missing.status, 400);
      const extra = await a.refund("user-x", "order-x", { surprise: true });
      assert.equal(extra.status, 400);
    }));
});
