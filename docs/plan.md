# 5-day plan

> Latest agreed approach (Day 1, 13 Nov 2026). It replaces the first draft plan; the changes are listed in section 9.
> Submission target: **Tue 17 Nov 2026, midday (PKT)**.

## 1. Objective

A partner told our BD team: *"We want our users to pay and earn rewards with a token inside our app, and we want to launch in 6 weeks."*

In 5 days, as technical lead working with BD:

1. **Clarify:** questions for the partner and BD, and the assumptions we make
2. **Assess:** options, risks, dependencies, and what is realistic in 6 weeks
3. **Propose:** a one-page proposal BD can send
4. **Prove:** a small working proof of the riskiest part, built mainly with AI
5. **Follow-up:** how I own delivery, with checkpoints and a release quality bar

## 2. How the work is scored, and where effort goes

| Criterion | Weight | Where it is earned | Effort |
|---|---|---|---|
| Business and partner understanding | 25% | `intent.md`, `questions.md`, `proposal.md` | ~25% |
| Scope and feasibility | 25% | `feasibility.md`, `proposal.md` | ~25% |
| Speed and ownership | 20% | Early submission, `followup.md`, `Final directive.md` | ~15% |
| Working proof | 20% | The repo and its failure tests | ~25% |
| AI-native working | 10% | `ai-log.md` every day, the video | ~10% |

**Rule:** the proof must not eat the documents. Half the grade is documents, so if the proof slips, its scope is cut, not the documents.

## 3. Working hypothesis (the solution we expect to propose)

**A capped pilot in 6 weeks: a closed-loop reward token that users earn on purchases and spend inside the partner's app. Card payments stay on the partner's existing payment provider. Paying with crypto and transferring tokens are phase 2, subject to legal sign-off.**

- **Closed loop:** tokens are earned only, never bought, sold, transferred or cashed out in v1.
- **"Pay" means redeeming tokens as a discount** on in-app purchases.
- **Users never see crypto:** wallets are created and held for them, with no gas fees and no seed phrases.
- **Our ledger is the source of truth;** the chain is the settlement and audit record.
- **"Launch" means a capped pilot** (5–10% of users) with a go/no-go gate before wider rollout.

`feasibility.md` must test this against the alternatives honestly, including **"why use a blockchain at all?"** If there is no good answer, off-chain points win.

## 4. Key decisions

| # | Decision | Reason |
|---|---|---|
| D1 | **Proof targets ledger/chain consistency**, not "deploying a token" | That is where real token launches break, and it is invisible until production |
| D2 | **Proof is ~90% TypeScript;** the contract is a ~30-line token on audited OpenZeppelin code | No prior Solidity experience; I must be able to explain every line on video |
| D3 | **Hardhat, local chain by default;** public testnet deploy (Base Sepolia) is a stretch goal | Evaluators can run it in 3 commands with no keys or faucets |
| D4 | **Our service submits all transactions;** no wallet vendor or paymaster in the proof | Keeps the proof small; vendors are named in the proposal instead |
| D5 | **Chain-neutral EVM layer-2** design | No information about our company's own stack (assumption B4) |
| D6 | **We define the two unexplained files** and say so in the README | The brief gives no definition; recruiter confirmed on 13 Nov: "you can define them based on your own understanding" |
| D7 | **Front-load risk:** proof starts on Day 1, documents and buffer on Day 4 | Speed is 20%; no hard engineering left for the last two days |
| D8 | **Proof stack:** Node 22+ and TypeScript, Hardhat 3 + viem, OpenZeppelin v5, Express, SQLite via Node's built-in `node:sqlite` (nothing to compile), zod, Node's built-in test runner with `tsx`, React + Vite + Tailwind, npm workspaces | Mostly my existing skills; runs anywhere with no setup; same design as the production stack |
| D9 | **Two layers of idempotency:** unique keys in our ledger *and* a used-reference check in the contract | If the service crashes after sending a transaction, a retry can never mint or burn twice |
| D10 | **Service uses `zod` ≥ 4.6.6 directly**; the Hardhat dev-tool advisory on older `zod` is accepted, not force-fixed | The advisory (memory exhaustion on oversized inputs) matters where `zod` validates real API requests; in Hardhat it only reads local config. Force-fixing would downgrade to Hardhat 2 |
| D11 | **Refund after the reward was spent:** never block the refund; burn what the user still holds; record the shortfall as debt netted against the next reward | Keeps customers unblocked, keeps the chain balance non-negative, bounds the partner's loss. Options compared in `feasibility.md` section 6; partner confirms via question P9 |
| D12 | **Ledger first, chain second.** The API writes the ledger and answers; a settler sends entries to the chain oldest-first, one at a time per user, and asks the contract "have you seen this reference?" before every send. A database trigger also blocks any overspend | The app never waits on block times or a chain outage; a crash after sending cannot cause a double mint; two independent guards against overspending |
| D13 | **`inSync` means "no unexplained difference"**: the chain equals the *confirmed* part of the ledger. Entries still waiting are shown as `unsettledEntries` | A normal wait must not look like drift, or reconciliation alerts become noise. Found when my own first test assumed the opposite |

**Production stack (proposed, not built):** EVM layer-2 (Base by default), embedded wallets (Privy / Coinbase Developer Platform / thirdweb, to be compared in `feasibility.md`), managed signing keys (AWS KMS or a custody provider), Postgres, a queue (SQS or BullMQ) for the chain worker, managed RPC with a fallback, signed webhooks plus a small partner SDK, drift alerts from reconciliation.

**File definitions (D6):**
- `intent.md` (Day 1): what we understood, what we will deliver, success criteria, out of scope.
- `Final directive.md` (Day 5): the final recommendation, what we will not do, next actions with owners.

## 5. Proof scope

**What it proves:** the partner's app and the chain never disagree about a user's balance, even when things go wrong.

### Components

| Part | Contents |
|---|---|
| `contracts/` | `RewardToken.sol` ✅: ERC-20 on OpenZeppelin, whole-number tokens; only our service (issuer role) can reward and redeem; user-to-user transfers blocked (closed loop); each operation's ledger reference can be used only once |
| `service/` | Node/TypeScript API with a ledger database (SQLite) and a chain settler ✅ earn, spend, balance, settler (Day 2) |
| `demo/` | One simple page: make a purchase, earn, redeem, see ledger and on-chain balance side by side |
| `tests/` | Scripted failure tests that print a readable pass/fail report |

### API

- `POST /earn` — reward a user for a purchase (called from the partner's payment webhook)
- `POST /spend` — redeem tokens as a discount
- `POST /refund` — reverse a purchase and claw back its reward
- `GET /balance/:userId` — ledger balance and on-chain balance
- `POST /reconcile` — compare ledger and chain, report and fix drift

### Failure cases the proof must handle

| # | Case | Expected result |
|---|---|---|
| F1 | Same earn request sent twice (webhook retry) | Rewarded once (idempotency key) ✅ tested Day 2 |
| F2 | Two spends at once exceeding the balance | One succeeds, one is rejected; no negative balance ✅ tested Day 2 (five at once) |
| F3 | Chain transaction fails or the service crashes mid-flight | Ledger entry stays pending, is retried with the same reference, and settles; the contract rejects a reused reference, so no lost or double tokens |
| F4 | Refund after the reward was already spent | Refund is never blocked; clawback burns what the user still holds and records the shortfall as debt netted against the user's next reward (D11); never a silent mismatch |
| F5 | Ledger and chain drift apart | Reconciliation detects and reports it |

### Not in the proof

Real money, mainnet, KYC, wallet vendors, production key management, app-store work. These are covered in the documents.

## 6. Day-by-day steps

| Day | Date | Documents | Proof | Gate (end of day) |
|---|---|---|---|---|
| **1** | Fri 13 Nov | `intent.md`, `questions.md`, `plan.md`, AI log started ✅ | Repo set up; token compiled and deployed to the local chain ✅ (6 contract tests passing, verified on my Mac with Node 26) | ✅ Passed |
| **2** | Sat 14 Nov | `feasibility.md` ✅ | Ledger, earn and spend end to end, chain settler ✅ (11 service tests passing against a real local chain) | ✅ One recommended option; ✅ happy path runs |
| **3** | Sun 15 Nov | — | F3–F5: crash mid-send, refund clawback, reconciliation (F1 and F2 already pass) | All failure tests pass |
| **4** | Mon 16 Nov | `proposal.md`, `followup.md` | Demo page, README (run in 3 commands) | BD could send the proposal as-is |
| **5** | Tue 17 Nov | `Final directive.md`, final AI log | Record 5-minute video, package zip | **Submitted by midday** |

**Buffer:** Day 4 afternoon. If Day 3 slips, F5 drops to "detect only" and the demo page becomes a terminal recording.

## 7. Priorities

**Must have** (submission fails without them)
1. All six documents plus the AI log
2. Proof runs and passes F1–F3
3. Video

**Should have**
4. F4 refund clawback and F5 reconciliation
5. Demo page

**Could have**
6. Public testnet deployment
7. Simple chart of ledger versus chain balance in the demo

## 8. Dependencies

### For the 5-day submission

| Dependency | Needed by | Status / fallback |
|---|---|---|
| Node 22+ and git on my Mac | Day 1 | ✅ Node 26 on the Mac |
| Shell access from Claude to the project folder | Day 1 | ✅ Available (Linux VM). Its network cannot download the Solidity compiler, so Claude tests with the npm `solc` compiler in a scratch copy only; the repo uses Hardhat's normal download on the Mac |
| Hardhat and OpenZeppelin packages from npm | Day 1 | Standard registry |
| Screen recorder for the video | Day 5 | QuickTime or Loom |
| Recruiter clarification of `intent.md` / `Final directive.md` | Day 1 | ✅ Done 13 Nov: our own definitions confirmed (D6) |

### For the real 6-week delivery (go into `feasibility.md` and `proposal.md`)

- Partner legal sign-off on the closed-loop design (by end of week 2)
- Partner's payment-provider webhooks with unique event IDs
- Partner engineering capacity for the app integration
- Wallet vendor or custody decision, and key management
- Chain choice and RPC provider
- Security review of the contract and service
- App-store policy check for crypto features

## 9. What changed from the first plan

| First plan | Agreed plan | Why |
|---|---|---|
| Proof starts Day 3 | Proof starts Day 1 | Front-load risk; leave buffer |
| Proposal written alongside hardest engineering on Day 4 | Day 4 is documents plus buffer | Documents are half the grade |
| Paymaster / wallet vendor in the proof | Service submits transactions directly | Too much for 5 days, no Solidity background |
| Base Sepolia testnet required | Local chain default, testnet stretch | Runs anywhere in 3 commands |
| No refund case | F4 refund clawback added | Real edge case partners hit first |
| "Keeps us out of securities territory" | Stated as an assumption needing legal sign-off | Too confident for a jurisdiction we don't know |
| "Launch" undefined | Launch = capped pilot | A full launch needs an audit that rarely fits in 6 weeks |
| Not covered | "Why blockchain?" and token economics (funding, expiry, abuse) in `feasibility.md` | BD will be asked these first |
| Not covered | AI log from Day 0, including a second model reviewing the first plan | 10% of the grade and it must be real |

## 10. Expected outcomes

- A BD person can send `proposal.md` without rewriting it.
- Every scope decision traces back to a question or assumption in `questions.md`.
- The proof runs in 3 commands and its failure-test report shows every case passing.
- The 6-week delivery plan has a named go/no-go gate each week and a clear release quality bar.
- The AI log shows AI used every day, including where I overruled it.
- Submitted before the deadline.

## 11. Risks to this 5-day plan

| Risk | Mitigation |
|---|---|
| Solidity or Hardhat tooling problems eat a day | ✅ Retired on Day 1: contract compiles, 6 tests pass, deploys to a local node |
| Proof scope grows | Priorities in section 7; cut F5 and the demo page first |
| Documents read as AI-generated filler | I review and edit every document, and record my edits in the AI log |
| Can't explain the code on video | Keep contract tiny; walk through it with Claude before recording |
| Shell access from Claude unavailable | ✅ Retired: shell available; fallback remains me running commands |
