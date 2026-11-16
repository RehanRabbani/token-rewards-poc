import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.ts";
import { addressFor } from "../src/wallets.ts";
import { api, call, ensureChain, uid, withStack } from "./harness.ts";

/**
 * The demo page and the demo-only routes behind it. They let a person watch the proof
 * work and break things on purpose, so they must only exist when switched on.
 */
describe("demo page", () => {
  let stopChain = () => {};
  before(async () => {
    stopChain = await ensureChain();
  });
  after(() => stopChain());

  it("serves the page", () =>
    withStack(async (s) => {
      const res = await fetch(s.baseUrl + "/");
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/html/);
      assert.match(await res.text(), /ledger and the blockchain, side by side/);
    }));

  it("lists a customer's ledger entries, newest first, with their chain status", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId, { orderId: "order-1" });
      await a.settle();
      await a.spend(userId, 40, { orderId: "order-2" });

      const { status, body } = await call(s.baseUrl, "GET", `/demo/entries/${userId}`);
      assert.equal(status, 200);
      assert.equal(body.wallet, addressFor(userId));
      assert.deepEqual(
        body.entries.map((e: { kind: string; orderId: string; amount: number; status: string }) => [e.kind, e.orderId, e.amount, e.status]),
        [
          ["spend", "order-2", -40, "pending"],
          ["earn", "order-1", 100, "confirmed"],
        ],
      );
      assert.match(body.entries[1].txHash, /^0x[0-9a-f]{64}$/);
    }));

  it("the pause switch sets the flag the background settler checks", () =>
    withStack(async (s) => {
      assert.equal((await call(s.baseUrl, "GET", "/demo/state")).body.paused, false);

      const on = await call(s.baseUrl, "POST", "/demo/settler", { paused: true });
      assert.equal(on.status, 200);
      assert.equal(s.settlerControl.paused, true);
      assert.equal((await call(s.baseUrl, "GET", "/demo/state")).body.paused, true);

      await call(s.baseUrl, "POST", "/demo/settler", { paused: false });
      assert.equal(s.settlerControl.paused, false);

      const bad = await call(s.baseUrl, "POST", "/demo/settler", { paused: "yes" });
      assert.equal(bad.status, 400);
    }));

  it("points added behind the ledger's back show up as a difference", () =>
    withStack(async (s) => {
      const a = api(s);
      const userId = uid("user");
      await a.earn(userId);
      await a.settle();
      assert.equal((await a.balance(userId)).inSync, true);

      const rogue = await call(s.baseUrl, "POST", "/demo/rogue-mint", { userId, points: 25 });
      assert.equal(rogue.status, 201);

      const b = await a.balance(userId);
      assert.equal(b.ledgerBalance, 100);
      assert.equal(b.onChainBalance, 125);
      assert.equal(b.inSync, false);

      const r = await a.reconcile();
      assert.equal(r.ok, false);
      assert.deepEqual(r.drift, [{ userId, settledBalance: 100, onChainBalance: 125, difference: 25 }]);
    }));

  it("is not there at all unless it is switched on", () =>
    withStack(async (s) => {
      const app = createApp({ ledger: s.ledger, settler: s.settler, chain: s.chain, enableAdmin: true });
      const server: Server = await new Promise((resolve) => {
        const srv = app.listen(0, "127.0.0.1", () => resolve(srv));
      });
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      try {
        assert.equal((await fetch(baseUrl + "/")).status, 404);
        assert.equal((await call(baseUrl, "GET", "/demo/state")).status, 404);
        assert.equal((await call(baseUrl, "POST", "/demo/rogue-mint", { userId: "alice", points: 25 })).status, 404);
        assert.equal((await call(baseUrl, "POST", "/demo/settler", { paused: true })).status, 404);
        assert.equal(s.settlerControl.paused, false);
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }));
});
