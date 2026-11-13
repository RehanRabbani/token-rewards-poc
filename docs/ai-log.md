# AI usage log

> One entry per working session. "Kept / changed" records my own judgement on the AI output, which is the part that matters.

## Day 1 — Fri 13 Nov 2026

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 16:37 | Claude (Sonnet) | Role setup | Act as lead AI developer and BD for a 5-day project | Gate-based way of working | Too generic; needed the actual brief | – |
| 16:51 | Claude (Sonnet → Opus) | 5-day plan | Pasted the full objective; asked for a plan, not code | Closed-loop token hypothesis; proof = ledger/chain consistency | – | ~1 h |
| 16:57 | Claude (Fable) | Independent review of the plan | Asked a second model to critique the first plan | Cut proof scope; front-load risk; add refund clawback; "why blockchain?" question | Rejected paymaster/wallet vendor in the proof as too much for 5 days | ~1 h |
| 17:01 | Claude (Opus) | Stack decision | Shared that I have no Solidity experience | TypeScript-heavy proof, Hardhat, local chain by default | – | – |
| 17:07 | Claude (Opus) | Draft `intent.md` and `questions.md` | Draft from the agreed plan | Structure; ranked top-5 blockers; assumption per question | _(fill in after review)_ | ~2 h |
| 17:13 | Claude (Opus) | `plan.md` | Document the agreed plan, not the original | Decisions, failure cases F1–F5, priorities, change log vs first plan | _(fill in)_ | ~1 h |
| 17:16 | – (human) | Clarified the two undefined files | Asked the recruiter on LinkedIn | Recruiter confirmed: define them myself | – | – |
| 17:30 | Claude (Opus) | Tech stack | Asked which stack to use | Split proof stack vs production stack | _(fill in)_ | ~30 min |
| 17:35 | Claude (Opus) | Repo + contract + tests + deploy | Build the Day 1 proof step | `RewardToken.sol` on OpenZeppelin; 6 tests; deploy script; on-chain duplicate-reference check | Claude found the sandbox could not download the compiler and worked around it only in the sandbox, keeping the repo clean | ~3 h |
| 17:46 | Claude (Opus) | Triage `npm audit` warnings | Pasted my `npm install` output | All 12 are one `zod` advisory via Hardhat; don't force-fix (would downgrade to Hardhat 2); service must use patched `zod` directly | – | ~20 min |
| 17:49 | – (human) | Verified on my own machine | Ran `npm install`, `npm test` and `npm run deploy` on my Mac (Node 26) | 6/6 tests pass; deploy rewards 100 and redeems 40 (balance 60); compiler downloaded normally; the `esbuild` approval was not needed | – | – |

**What worked:** using a second model as a reviewer caught scope creep the first plan missed.
**What I checked myself:** _(fill in: which questions/assumptions you edited and why)_
