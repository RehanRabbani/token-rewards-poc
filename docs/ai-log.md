# AI usage log

> One entry per working session. "Kept / changed" records my own judgement on the AI output, which is the part that matters.

## Day 1 — Fri 13 Nov 2026

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 16:37 | Claude (Sonnet) | Role setup | Act as lead AI developer and BD for a 5-day project | Gate-based way of working | Too generic; needed the actual brief | – |
| 16:51 | Claude (Sonnet → Opus) | 5-day plan | Pasted the full objective; asked for a plan, not code | Closed-loop token hypothesis; proof = ledger/chain consistency | – | ~1 h |
| 16:57 | Claude (Fable) | Independent review of the plan | Asked a second model to critique the first plan | Cut proof scope; front-load risk; add refund clawback; "why blockchain?" question | Rejected paymaster/wallet vendor in the proof as too much for 5 days | ~1 h |
| 17:01 | Claude (Opus) | Stack decision | Shared that I have no Solidity experience | TypeScript-heavy proof, Hardhat, local chain by default | – | – |
| 17:07 | Claude (Opus) | Draft `intent.md` and `questions.md` | Draft from the agreed plan | Structure; ranked top-5 blockers; assumption per question | Nothing removed. After I asked the recruiter what the two files mean, `intent.md` was updated with the answer (17:16) | ~2 h |
| 17:13 | Claude (Opus) | `plan.md` | Document the agreed plan, not the original | Decisions, failure cases F1–F5, priorities, change log vs first plan | I told Claude to base the plan on our latest agreement and not on the first plan, so the first plan was replaced. I also asked that all `.md` files are kept up to date | ~1 h |
| 17:16 | – (human) | Clarified the two undefined files | Asked the recruiter on LinkedIn | Recruiter confirmed: define them myself | – | – |
| 17:30 | Claude (Opus) | Tech stack | Asked which stack to use | Split proof stack vs production stack | No change. I went ahead with the proposed stack and ran it on my own Mac (17:49) | ~30 min |
| 17:35 | Claude (Opus) | Repo + contract + tests + deploy | Build the Day 1 proof step | `RewardToken.sol` on OpenZeppelin; 6 tests; deploy script; on-chain duplicate-reference check | Claude found the sandbox could not download the compiler and worked around it only in the sandbox, keeping the repo clean | ~3 h |
| 17:46 | Claude (Opus) | Triage `npm audit` warnings | Pasted my `npm install` output | All 12 are one `zod` advisory via Hardhat; don't force-fix (would downgrade to Hardhat 2); service must use patched `zod` directly | – | ~20 min |
| 17:49 | – (human) | Verified on my own machine | Ran `npm install`, `npm test` and `npm run deploy` on my Mac (Node 26) | 6/6 tests pass; deploy rewards 100 and redeems 40 (balance 60); compiler downloaded normally; the `esbuild` approval was not needed | – | – |

**What worked:** using a second model as a reviewer caught scope creep the first plan missed.
**What I checked myself:** I asked the recruiter what the two undefined files mean. I ran `npm install`, `npm test` and `npm run deploy` on my own Mac and pasted the results. I also asked what "deploy" does and if it is safe for my machine, before running it.

## Day 2 — started Fri 13 Nov (late), continues Sat 14 Nov

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 23:35 | Claude (Sonnet) | Research for `feasibility.md` | Six parallel web searches: embedded wallet vendors, MiCA and loyalty points, Apple App Store crypto rules, Base fees and paymasters, Starbucks Odyssey, FinCEN closed-loop rules | Non-transferable loyalty points are outside MiCA; transferable ones may not be; FinCEN "user" vs money transmitter; Odyssey closed 31 Mar 2024 | Could not open Apple's own guideline page (blocked), so the Apple points are marked "verify" and rated low-medium confidence | ~3 h |
| 23:50 | Claude (Sonnet) | Draft `feasibility.md` | Options, risks, dependencies, what fits in 6 weeks, using the research | "Ledger first, chain mirror second" with a week-2 legal gate and ledger-only fallback; refund rule option 2 (debt netted against future rewards) | Self-check caught a source that did not support a claim (Starbucks "simple rewards") and a regulatory figure stated more broadly than the source; both fixed | ~3 h |
| 00:10 | Claude (Sonnet) | Keep other `.md` files consistent | Update questions, plan, README after the feasibility decisions | New question P22, assumptions A11–A12, decision D11 | – | ~30 min |
| 00:40 | Claude (Sonnet) | Build `service/`: ledger, chain adapter, settler, API, tests | Design from `plan.md`: ledger first, chain second, idempotency, double-spend guard, crash recovery; test on a real local chain | Whole design; `node:sqlite` and `node:test` instead of extra dependencies; database trigger as an overspend backstop | My first test run had 1 failure of 11: Claude had asserted `inSync` false while an entry was merely waiting. The code was right and the test wrong, so the test was fixed and the meaning documented (D13) rather than bending the code | ~5 h |
| 01:10 | Claude (Sonnet) | Run the real server end to end | Start the chain, deploy, start the service, curl earn / repeat / spend and watch the background settler | Earn pending → repeat returns the same entry → spend → chain reaches 60 and matches the ledger | – | ~30 min |
| 14:00 | Claude (Sonnet) | Quiz on `feasibility.md` sections 1, 4 and 6 | Asked Claude to quiz me like an interviewer, one question at a time | The corrected answers | My first answers were wrong in three places. I said we promise a fully live app and could go live in week 2 with some bugs. I said that if the lawyers say no, we stop work. I said a blockchain means no single administrator. Claude showed me why each was wrong. For the refund question I chose the option that records the missing points as a debt | Not about time: I needed to understand my own document |
| 15:35 | Claude (Sonnet) | Write sections 1, 4 and 6 in simple English | Gave Claude my answers and asked for easy English that an 18-year-old can understand | Claude wrote the text from my corrected answers, in short simple sentences | The idea of the partner holding the admin key is not in the document. I have not decided on it yet | ~20 min |
| 15:46 | Claude (Sonnet) | Day 3 plan in plain words | I said I am new to this area and asked Claude to talk in easier English | A version of the three failure cases with everyday examples | – | – |
| 15:49 | – (human) | Ran the Day 2 tests on my Mac | `npm test` | 6 contract tests and 11 service tests pass, 0 failures | – | – |

**What I checked myself (Day 2):** I tested my own understanding of sections 1, 4 and 6 in the quiz and found three mistakes in my first answers. I ran `npm test` on my Mac and all 17 tests passed.

## Day 3 — Sat 14 Nov (a day ahead of the plan)

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 15:50 | Claude (Sonnet) | Build F3, F4 and F5 | Start Day 3 from `plan.md`: crash while sending, the refund rule in code, the check that finds differences between ledger and chain | A fake chain that fails at chosen moments; refunds with debt written as an extra ledger entry; a read-only reconcile route; a way to requeue stuck entries; 21 new tests (32 service tests in total) | The test files now run one at a time, because they share one chain and one issuer account. Claude also widened the database trigger so it blocks a clawback below zero, not only a spend | ~6 h |
| 15:54 | Claude (Sonnet) | Check that the new tests can fail | Break the code on purpose in a scratch copy and see which tests catch it | With both crash safety checks removed, 3 crash tests failed. When a refund took back more than the user held, 5 refund tests failed. When a repeated earn paid the debt twice, 1 test failed. The code was restored and the project folder was never touched by these changes | – | ~30 min |
| 15:55 | Claude (Sonnet) | Run everything in a scratch copy | All tests plus the TypeScript check | 32 service tests pass; TypeScript check has no errors | – | – |
| 15:57 | Claude (Sonnet) | Keep the other `.md` files consistent | Update plan, README and questions for Day 3 | Decisions D14 to D16; partner questions P23 to P26; BD question B9; assumption A13 | – | ~30 min |
| 16:01 | Claude (Sonnet) | Simple English for the rest of `feasibility.md` | I said yes to rewriting the whole file so that a beginner can follow it | The intro and sections 2, 3, 5, 7, 8, 9, 10 and 11 in short sentences, with hard words explained (MiCA, FinCEN, paymaster, webhook, runbook) | Claude wrote the text. All facts, numbers and source markers are unchanged, and the section numbers are the same | ~30 min |
| 16:04 | Claude (Sonnet) | Add the partner-holds-the-admin-key option | I said yes after Claude explained the idea in plain words | A short option table in `feasibility.md` section 4, decision D17, question P27, assumption A14, risk R12. Two new contract tests that prove the admin can replace the issuer, the issuer cannot give out roles, and the admin cannot create points (8 contract tests now) | Claude added an honest limit: this controls who can write to the token on the chain, not our ledger. I had said earlier that I wanted both sides to have control, and this makes clear how far it goes | ~45 min |

## Day 4 — Sat 14 Nov (two days ahead of the plan)

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 18:55 | Claude (Fable) | Start Day 4 from `plan.md` | "start day 4". Claude read the plan and all documents and code first, then did the four Day 4 items | – | – | – |
| 18:58 | Claude (Fable) | Demo page and `npm run demo` | One page that shows the ledger next to the chain, and one command that starts the chain, deploys a fresh token and starts the service | One plain HTML page with buttons that break things on purpose: the same payment twice, five checkouts at once, the chain worker paused, tokens created behind the ledger's back. 5 new tests (37 service tests) | **Claude did not follow my plan here:** the plan said React + Vite + Tailwind. Claude used plain HTML with no build step, so the proof still runs in 3 commands, and recorded it as decision D18. The demo-only routes are on only against a local chain, and a test checks they are absent otherwise | ~4 h |
| 19:00 | Claude (Fable) | Check the demo in a real browser | Run `npm run demo`, click through every button, read the numbers on the page | Pay 100/100 in sync; repeat changes nothing; paused worker shows ledger 160 and chain 60, then catches up; five checkouts give 1 accepted and 4 refused; refund after spending records a debt of 100 and the next reward pays it; 25 rogue tokens turn the check red and name the customer | – | ~30 min |
| 19:01 | Claude (Fable) | Draft `proposal.md` | One page BD can send, from `feasibility.md` and `questions.md` | Scope table, week-by-week gates, "the date is safe either way", what we need from the partner, the five blocker questions | Claude left out prices and company names because we do not know them. It says commercial terms follow separately. **My review: to do.** I must read it as BD would and edit it | ~2 h |
| 19:02 | Claude (Fable) | Draft `followup.md` | How I own delivery: checkpoints and a release quality bar | One gate per week with the proof I show and what happens if it fails; a 19-line quality bar that says which lines the proof already shows; cut order if we fall behind; when I escalate | The numbers marked *target* (7 clean days, 40,000 operations, 300 ms, 30 minutes) are Claude's proposals, not agreed facts. **My review: to do** | ~2 h |
| 19:03 | Claude (Fable) | Keep the other `.md` files consistent | Update README and plan for Day 4 | README "run in 3 commands" and a table of what to try on the demo page; plan decision D18 and the Day 4 row | – | ~20 min |
| 19:59 | Claude (Fable) | Rewrite `proposal.md` | I read the first draft, asked why the questions and the last line were in it, then said the proposal was not good and asked Claude to check the Day 4 plan again | A shorter version (about 550 words) written for the partner: what users get, what the partner gets, three phases, what we need, next step | **I rejected the first draft.** Claude agreed it missed the plan: it was longer than one page, it opened with scope and not with what the partner gains, it listed open questions, and it told the partner that plain points would do the same job. The questions became a short "this proposal assumes" section | – |

**What I still have to check myself (Day 4):** run `npm test` and `npm run demo` on my Mac and click through the page. Read `proposal.md` and `followup.md` line by line, change what does not sound like me, and write my changes in this table.

## Day 5 — Sun 15 Nov (two days ahead of the plan)

| Time | Tool | Task | What I asked | Kept | Changed / rejected | Time saved (est.) |
|---|---|---|---|---|---|---|
| 13:45 | Claude (Fable) | Day 5 plan | I asked what the plan for Day 5 is | The list from `plan.md`: final directive, final AI log, video, zip, submit. Claude suggested using the two spare days to prepare the video and to submit on Monday | – | – |
| 13:51 | Claude (Fable) | Draft `Final directive.md` | Start Day 5, and keep the English simple and easy to understand | The decision in one section, why, what we will not do, 14 next actions with an owner and a date, what would change the decision, what the proof shows and does not show, and a check against the success list I wrote in `intent.md` on Day 1 | Claude added a section "What I am still not sure about" (the law, Apple's rules, the partner's real numbers). **My review: to do** | ~2 h |
| 13:55 | Claude (Fable) | Keep the other `.md` files consistent | Update README and plan for Day 5, and check that numbers agree in every file | README now points to the final directive first. Plan Day 4 and Day 5 rows updated | – | ~15 min |
