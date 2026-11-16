import express, { Router } from "express";
import { z } from "zod";
import type { Chain } from "./chain.ts";
import { chainUnreachable } from "./errors.ts";
import { refFor, type Ledger } from "./ledger.ts";
import { id } from "./validation.ts";
import { addressFor } from "./wallets.ts";

/**
 * DEMO ONLY. These routes exist so the demo page can show the proof working, and can
 * break things on purpose. They are mounted only against a local chain (see config.ts)
 * and are not part of the product.
 */
export interface DemoOptions {
  /** Folder holding the demo page (index.html). */
  pageDir: string;
  /** The background settler checks this flag. The page flips it to show the chain falling behind. */
  settlerControl: { paused: boolean };
  tokenAddress: string;
  rewardRateBps: number;
}

const settlerBody = z.strictObject({ paused: z.boolean() });
const rogueBody = z.strictObject({ userId: id, points: z.number().int().positive().max(1000) });

let rogueCounter = 0;

export function demoRouter(ledger: Ledger, chain: Chain, opts: DemoOptions): Router {
  const router = Router();

  // The page itself, at http://localhost:3000/
  router.use(express.static(opts.pageDir));

  router.get("/demo/state", (_req, res) => {
    res.json({
      paused: opts.settlerControl.paused,
      tokenAddress: opts.tokenAddress,
      rewardRateBps: opts.rewardRateBps,
    });
  });

  // The user's ledger rows, newest first, so the page can show each one moving
  // from "pending" to "confirmed".
  router.get("/demo/entries/:userId", (req, res) => {
    const userId = id.parse(req.params.userId);
    res.json({
      userId,
      wallet: addressFor(userId),
      entries: ledger.entries(userId).map((e) => ({
        id: e.id,
        kind: e.kind,
        orderId: e.order_id,
        amount: e.amount,
        status: e.status,
        txHash: e.tx_hash,
        attempts: e.attempts,
        lastError: e.last_error,
      })),
    });
  });

  // Pause or resume the background settler. While it is paused the ledger keeps
  // working and the chain falls behind; when it resumes the chain catches up.
  router.post("/demo/settler", (req, res) => {
    const { paused } = settlerBody.parse(req.body);
    opts.settlerControl.paused = paused;
    res.json({ paused });
  });

  // Create points on the chain that the ledger knows nothing about, as a bug or a
  // stolen key would. The reconciliation check must report it.
  router.post("/demo/rogue-mint", async (req, res) => {
    const { userId, points } = rogueBody.parse(req.body);
    try {
      const ref = refFor(`rogue:${Date.now()}:${++rogueCounter}`);
      const hash = await chain.send("mint", addressFor(userId), BigInt(points), ref);
      await chain.waitForReceipt(hash);
      res.status(201).json({ userId, points, txHash: hash });
    } catch {
      throw chainUnreachable();
    }
  });

  return router;
}
