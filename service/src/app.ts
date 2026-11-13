import express, { type ErrorRequestHandler } from "express";
import { z } from "zod";
import type { Chain } from "./chain.ts";
import { AppError } from "./errors.ts";
import type { Ledger, WriteResult } from "./ledger.ts";
import type { Settler } from "./settler.ts";
import { addressFor } from "./wallets.ts";

export interface AppDeps {
  ledger: Ledger;
  settler: Settler;
  chain: Chain;
  /** Exposes POST /admin/settle. Off unless explicitly enabled; the proof has no authentication. */
  enableAdmin: boolean;
}

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w.:@-]+$/, "letters, digits and . _ : @ - only");

const earnBody = z.strictObject({
  eventId: id, // the partner's unique payment event id: makes webhook retries harmless
  userId: id,
  orderId: id,
  purchaseCents: z.number().int().positive().max(10_000_000),
});

const spendBody = z.strictObject({
  eventId: id, // the partner's unique checkout id
  userId: id,
  orderId: id,
  points: z.number().int().positive().max(1_000_000),
});

export function createApp(deps: AppDeps) {
  const { ledger, settler, chain } = deps;
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  const view = (kind: "earn" | "spend", userId: string, r: WriteResult) => ({
    kind,
    userId,
    entryId: r.entry?.id ?? null,
    points: r.points,
    status: r.entry?.status ?? null,
    duplicate: r.duplicate,
    balance: ledger.balance(userId).ledgerBalance,
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Called from the partner's payment webhook. Repeats of the same eventId return the first result.
  app.post("/earn", (req, res) => {
    const body = earnBody.parse(req.body);
    const result = ledger.earn(body);
    res.status(result.duplicate || result.points === 0 ? 200 : 201).json(view("earn", body.userId, result));
  });

  // Redeem points as a discount at checkout.
  app.post("/spend", (req, res) => {
    const body = spendBody.parse(req.body);
    const result = ledger.spend(body);
    res.status(result.duplicate ? 200 : 201).json(view("spend", body.userId, result));
  });

  // What the app shows (ledger) next to what the chain holds.
  //   ledgerBalance    everything recorded; what the user sees and can spend
  //   settledBalance   the part of it already confirmed on-chain
  //   onChainBalance   what the contract says
  //   inSync           onChainBalance equals settledBalance, i.e. no UNEXPLAINED difference.
  //                    Entries still waiting for the chain show up in unsettledEntries instead.
  app.get("/balance/:userId", async (req, res) => {
    const userId = id.parse(req.params.userId);
    const balance = ledger.balance(userId);
    let onChainBalance: number | null = null;
    try {
      onChainBalance = Number(await chain.balanceOf(addressFor(userId)));
    } catch {
      onChainBalance = null; // chain unreachable: the app keeps working from the ledger
    }
    res.json({
      userId,
      ...balance,
      onChainBalance,
      inSync: onChainBalance !== null && onChainBalance === balance.settledBalance,
    });
  });

  if (deps.enableAdmin) {
    app.post("/admin/settle", async (_req, res) => {
      res.json(await settler.runOnce());
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND" });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.code, message: err.message, ...err.details });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: "INVALID_REQUEST",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }
    const status = typeof err?.status === "number" ? err.status : 500;
    if (status < 500) {
      res.status(status).json({ error: "BAD_REQUEST", message: String(err.message ?? "bad request") });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "INTERNAL" });
  };
  app.use(onError);

  return app;
}
