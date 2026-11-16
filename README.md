# Token rewards POC

A partner wants its users to **pay and earn rewards with a token inside its app, launching in 6 weeks**.
This repo holds the proposal documents and a working proof of the riskiest part:
**keeping the app's ledger and the on-chain token consistent when things go wrong.**

Repo: https://github.com/RehanRabbani/token-rewards-poc

## Run it

Requires Node 22.13+.

Three commands, no keys, no accounts, no faucets:

```bash
npm install
npm test          # builds the contract, then runs the contract tests (8) and the service tests (37) against a real local chain
npm run demo      # starts a local chain, deploys a fresh token, starts the service; then open http://localhost:3000
```

Press Ctrl+C to stop the demo. If port 3000 is busy, use `PORT=3001 npm run demo`.

### The demo page

`npm run demo` serves one page that shows the partner's app on the left, and our ledger next to the blockchain on the right.

| Try this | What you should see |
|---|---|
| **Pay** | The ledger shows 100 points at once. The chain number follows within a second, and the entry turns from "waiting" to "confirmed" |
| **Send it again** | The same payment message a second time changes nothing (failure case F1) |
| **Redeem** | Points leave the ledger, then the tokens are burned on the chain |
| **Spend 5× at once** | Five checkouts for the whole balance at the same moment: 1 accepted, 4 refused (F2) |
| **Pause the chain worker**, then Pay or Redeem | The app keeps working from the ledger. The chain number stays behind and the badge says "catching up". Resume, and it catches up (F3) |
| **Refund this order** (in the ledger table), after the points were spent | The refund is accepted, the missing points become a debt, and the next reward pays the debt first (F4) |
| **Add 25 behind the ledger's back** | Tokens appear on the chain with no ledger entry. The daily check turns red and names the customer. It reports and does not repair, so that customer stays red (F5). Use **New customer** to carry on |

The page and its `/demo/...` routes are switched on only against a local chain. They are a way to watch the proof, not part of the product.

### Try the service by hand (three terminals)

```bash
npm run chain          # 1. local blockchain (stays running)
npm run deploy:local   # 2. deploy the token and save its address
npm run service        # 2. start the API (and the demo page) on http://localhost:3000

# 3. a purchase earns points; a repeat of the same event changes nothing
curl -s -X POST localhost:3000/earn -H 'content-type: application/json' \
  -d '{"eventId":"pay_1001","userId":"alice","orderId":"ord_1","purchaseCents":5000}'
curl -s localhost:3000/balance/alice       # ledger 100 at once; the chain catches up within a second
curl -s -X POST localhost:3000/spend -H 'content-type: application/json' \
  -d '{"eventId":"chk_77","userId":"alice","orderId":"ord_2","points":40}'
curl -s localhost:3000/balance/alice       # ledger 60, on-chain 60, inSync true
```

Now a refund and the check that compares the ledger with the chain (the `/admin` routes are on by default only against a local chain):

```bash
# the 40 points Alice spent are gone, so a refund of ord_1 takes back her remaining 60 and records 40 as debt
curl -s -X POST localhost:3000/refund -H 'content-type: application/json' \
  -d '{"eventId":"ref_1","userId":"alice","orderId":"ord_1"}'
curl -s localhost:3000/balance/alice       # ledger 0, debt 40; her next reward pays the 40 first
curl -s localhost:3000/admin/reconcile     # ok true: the chain agrees with the ledger, nothing stuck
```

The first time, `npm run deploy:local` needs the chain from step 1 to be running. Settings are environment variables (`PORT`, `RPC_URL`, `TOKEN_ADDRESS`, `REWARD_RATE_BPS`, ...); see `service/src/config.ts`.

## Repo layout

| Folder | Contents | Status |
|---|---|---|
| `docs/` | intent, questions, plan, feasibility, proposal, follow-up, final directive, AI log | All written. Start with `Final directive.md`: it gives the decision and points to the other files |
| `contracts/` | `RewardToken.sol`: closed-loop ERC-20 on OpenZeppelin, tests, deploy script | ✅ Day 1 |
| `service/` | Ledger API and chain settler: earn, spend, balance ✅ Day 2; refund with debt, crash recovery tests and the reconciliation check ✅ Day 3 | Day 3 done |
| `demo/` | One page, plain HTML and JavaScript with no build step, served by the service: buy, redeem, refund, and break things on purpose, with the ledger and the chain side by side | ✅ Day 4 |

## The contract in one paragraph

`RewardToken` is an ERC-20 built on audited OpenZeppelin code. Only our backend (the *issuer*) can create tokens (`reward`) or destroy them (`redeem`, also used for refund clawback). A second key, the *admin*, decides who the issuer is: it can take the issuer key away and name a new one, but it cannot create or destroy tokens itself. So the partner can hold the admin key if they want a say. Users cannot send tokens to each other, so the token cannot be traded or cashed out. Every operation carries a unique reference from our ledger, and the contract rejects a reference it has already seen, so a retried transaction can never mint or burn twice.

## How the service works

1. **The ledger comes first.** `POST /earn` and `POST /spend` write one row to the ledger (SQLite) and answer at once. The app never waits for a block.
2. **The chain follows.** A background *settler* sends each ledger entry to the contract, oldest first and one at a time per user, so a spend is never sent before the earn that funds it.
3. **Retries are safe in two places.** The ledger refuses a repeated `eventId` (the partner's payment or checkout id). The settler asks the contract "have you seen this reference?" before every send, and the contract itself refuses a reference twice. If the service dies after sending a transaction, the next run notices and does not send it again.
4. **Overspending is blocked twice.** The ledger checks the balance inside a transaction, and a database trigger refuses any spend that would go below zero even if application code is wrong.
5. **Refunds are never blocked.** `POST /refund` takes back the points the order earned, up to what the user still holds. The part already spent becomes a debt. The user's next reward pays the debt first, so the customer never pays extra cash. One refund per order.
6. **Crashes are handled by the same two checks.** The tests kill the service at the bad moments (after sending, while waiting, chain down, two settlers at once) and check that no points are minted twice. An entry that fails 5 times is marked *stuck*. It holds back only that user, and shows up in the reconciliation report until a person requeues it.
7. **`GET /admin/reconcile` compares the ledger with the chain**, user by user. It reports differences and stuck entries and changes nothing, because the right fix depends on the cause.
8. **`GET /balance/:userId`** shows the ledger balance next to the chain. `inSync` means the chain equals the confirmed part of the ledger, with no unexplained difference; entries still waiting are counted in `unsettledEntries`, and `debt` shows what the user still owes from refunds.

9. **The demo page has its own small routes** (`service/src/demo-routes.ts`): list a customer's ledger entries, pause the background settler, and create tokens on the chain behind the ledger's back. They exist only when the service runs against a local chain, and a test checks that they are absent otherwise.

The test files run one at a time (`--test-concurrency=1`), because they share one local chain and one issuer account.

Stand-ins in this proof, each replaced in the real delivery (see `docs/feasibility.md`): wallet addresses are derived from the user id instead of coming from a wallet vendor; the issuer key is Hardhat's public test key instead of a managed key service; the API has no authentication or webhook signing; SQLite becomes Postgres. With SQLite in one process the overspend check is trivially atomic; on Postgres it needs a row lock or constraint, and the same tests would catch a race.

## Note on the two undefined files

The brief does not define `intent.md` or `Final directive.md`. The recruiter confirmed I should define them myself; their definitions are at the top of each file.

## Known install warnings

- **`npm audit` reports 12 high-severity issues.** They are one advisory in `zod` (< 4.6.6) pulled in by Hardhat 3 and its plugins, where it only validates local config files. `npm audit fix --force` would downgrade to Hardhat 2, so it is deliberately not applied. The backend service, which validates real requests, depends on a patched `zod` (≥ 4.6.6) directly.
- **Node may print `ExperimentalWarning: SQLite is an experimental feature`.** The service uses Node's built-in `node:sqlite` so that nothing needs compiling. The warning is harmless.
- **npm may warn that `esbuild` has an unapproved install script.** If tests fail on `esbuild`, run `npm install-scripts approve esbuild && npm rebuild esbuild`.

