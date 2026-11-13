# Token rewards POC

A partner wants its users to **pay and earn rewards with a token inside its app, launching in 6 weeks**.
This repo holds the proposal documents and a working proof of the riskiest part:
**keeping the app's ledger and the on-chain token consistent when things go wrong.**

## Run it

Requires Node 22.13+.

```bash
npm install
npm test          # builds the contract, then runs the contract tests and the service tests (11) against a real local chain
npm run deploy    # deploy to an in-process chain, reward and redeem a demo user
```

### Try the service by hand (three terminals)

```bash
npm run chain          # 1. local blockchain (stays running)
npm run deploy:local   # 2. deploy the token and save its address
npm run service        # 2. start the API on http://localhost:3000

# 3. a purchase earns points; a repeat of the same event changes nothing
curl -s -X POST localhost:3000/earn -H 'content-type: application/json' \
  -d '{"eventId":"pay_1001","userId":"alice","orderId":"ord_1","purchaseCents":5000}'
curl -s localhost:3000/balance/alice       # ledger 100 at once; the chain catches up within a second
curl -s -X POST localhost:3000/spend -H 'content-type: application/json' \
  -d '{"eventId":"chk_77","userId":"alice","orderId":"ord_2","points":40}'
curl -s localhost:3000/balance/alice       # ledger 60, on-chain 60, inSync true
```

The first time, `npm run deploy:local` needs the chain from step 1 to be running. Settings are environment variables (`PORT`, `RPC_URL`, `TOKEN_ADDRESS`, `REWARD_RATE_BPS`, ...); see `service/src/config.ts`.

## Repo layout

| Folder | Contents | Status |
|---|---|---|
| `docs/` | intent, questions, plan, feasibility, proposal, follow-up, final directive, AI log | Day 1–2 docs done (feasibility added) |
| `contracts/` | `RewardToken.sol`: closed-loop ERC-20 on OpenZeppelin, tests, deploy script | ✅ Day 1 |
| `service/` | Ledger API and chain settler: earn, spend, balance ✅ Day 2 (duplicates and overspend covered); refund clawback and reconciliation Day 3 | Day 2 done |
| `demo/` | One-page partner-app demo | Day 4 |

## The contract in one paragraph

`RewardToken` is an ERC-20 built on audited OpenZeppelin code. Only our backend (the *issuer*) can create tokens (`reward`) or destroy them (`redeem`, also used for refund clawback). Users cannot send tokens to each other, so the token cannot be traded or cashed out. Every operation carries a unique reference from our ledger, and the contract rejects a reference it has already seen, so a retried transaction can never mint or burn twice.

## How the service works

1. **The ledger comes first.** `POST /earn` and `POST /spend` write one row to the ledger (SQLite) and answer at once. The app never waits for a block.
2. **The chain follows.** A background *settler* sends each ledger entry to the contract, oldest first and one at a time per user, so a spend is never sent before the earn that funds it.
3. **Retries are safe in two places.** The ledger refuses a repeated `eventId` (the partner's payment or checkout id). The settler asks the contract "have you seen this reference?" before every send, and the contract itself refuses a reference twice. If the service dies after sending a transaction, the next run notices and does not send it again.
4. **Overspending is blocked twice.** The ledger checks the balance inside a transaction, and a database trigger refuses any spend that would go below zero even if application code is wrong.
5. **`GET /balance/:userId`** shows the ledger balance next to the chain. `inSync` means the chain equals the confirmed part of the ledger, with no unexplained difference; entries still waiting are counted in `unsettledEntries`.

Stand-ins in this proof, each replaced in the real delivery (see `docs/feasibility.md`): wallet addresses are derived from the user id instead of coming from a wallet vendor; the issuer key is Hardhat's public test key instead of a managed key service; the API has no authentication or webhook signing; SQLite becomes Postgres. With SQLite in one process the overspend check is trivially atomic; on Postgres it needs a row lock or constraint, and the same tests would catch a race.

## Note on the two undefined files

The brief does not define `intent.md` or `Final directive.md`. The recruiter confirmed I should define them myself; their definitions are at the top of each file.

## Known install warnings

- **`npm audit` reports 12 high-severity issues.** They are one advisory in `zod` (< 4.6.6) pulled in by Hardhat 3 and its plugins, where it only validates local config files. `npm audit fix --force` would downgrade to Hardhat 2, so it is deliberately not applied. The backend service, which validates real requests, depends on a patched `zod` (≥ 4.6.6) directly.
- **Node may print `ExperimentalWarning: SQLite is an experimental feature`.** The service uses Node's built-in `node:sqlite` so that nothing needs compiling. The warning is harmless.
- **npm may warn that `esbuild` has an unapproved install script.** If tests fail on `esbuild`, run `npm install-scripts approve esbuild && npm rebuild esbuild`.

