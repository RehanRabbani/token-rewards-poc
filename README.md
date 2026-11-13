# Token rewards POC

A partner wants its users to **pay and earn rewards with a token inside its app, launching in 6 weeks**.
This repo holds the proposal documents and a working proof of the riskiest part:
**keeping the app's ledger and the on-chain token consistent when things go wrong.**

## Run it

Requires Node 22+.

```bash
npm install
npm test          # contract tests
npm run deploy    # deploy to an in-process chain, reward and redeem a demo user
```

## Repo layout

| Folder | Contents | Status |
|---|---|---|
| `docs/` | intent, questions, plan, feasibility, proposal, follow-up, final directive, AI log | Day 1 docs done |
| `contracts/` | `RewardToken.sol`: closed-loop ERC-20 on OpenZeppelin, tests, deploy script | ✅ Day 1 |
| `service/` | Ledger API: earn, spend, refund, reconcile | Day 2–3 |
| `demo/` | One-page partner-app demo | Day 4 |

## The contract in one paragraph

`RewardToken` is an ERC-20 built on audited OpenZeppelin code. Only our backend (the *issuer*) can create tokens (`reward`) or destroy them (`redeem`, also used for refund clawback). Users cannot send tokens to each other, so the token cannot be traded or cashed out. Every operation carries a unique reference from our ledger, and the contract rejects a reference it has already seen, so a retried transaction can never mint or burn twice.

## Note on the two undefined files

The brief does not define `intent.md` or `Final directive.md`. The recruiter confirmed I should define them myself; their definitions are at the top of each file.

## Known install warnings

- **`npm audit` reports 12 high-severity issues.** They are one advisory in `zod` (< 4.6.6) pulled in by Hardhat 3 and its plugins, where it only validates local config files. `npm audit fix --force` would downgrade to Hardhat 2, so it is deliberately not applied. The backend service, which validates real requests, depends on a patched `zod` (≥ 4.6.6) directly.
- **npm may warn that `esbuild` has an unapproved install script.** If tests fail on `esbuild`, run `npm install-scripts approve esbuild && npm rebuild esbuild`.

# token-rewards-poc
