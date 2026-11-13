# Intent

> Written on Day 1 (13 Nov 2026), before any build work. It records what I understood, what I will deliver, how I will judge whether it worked, and what is out of scope. `Final directive.md` (Day 5) closes the loop against this file with the final recommendation, key decisions, what we are not pursuing, and next steps with owners.
>
> The brief does not define either file. I asked the recruiter on 13 Nov, who confirmed I should define them based on my own understanding, so this structure is mine.

## 1. The request, as heard

A partner told our BD team:

> "We want our users to pay and earn rewards with a token inside our app, and we want to launch in 6 weeks."

## 2. What I think the partner actually wants

The literal ask is "a token". The likely underlying goal is commercial:

- **Retention and engagement.** Users come back because they hold a balance they can spend.
- **Higher spend per user.** Rewards nudge the next purchase.
- **A story to tell.** "Web3 rewards" is a marketing angle, and possibly a step toward a tradable token later.

The token is the means, not the goal. So the proposal is judged by whether it moves those business metrics safely by week 6, not by how much blockchain it uses.

## 3. What "we" want (assumed: no information was given about our company)

- Win the partner and launch on time with **no security, money or compliance incident**, because one bad launch costs more than the deal.
- Reuse a pattern we can sell to the **next** partner (a repeatable rewards product, not a one-off build).
- Keep the scope small enough that BD does not over-promise.

## 4. My one-line interpretation

**Ship a capped pilot in 6 weeks: a closed-loop reward token that users earn on purchases and spend inside the partner's app, with card payments staying on the partner's existing provider. Crypto payments and token transferability are phase 2, subject to legal sign-off.**

This is a working hypothesis. `questions.md` lists what could change it, and `feasibility.md` tests it against the alternatives.

## 5. What I will deliver in 5 days

| Deliverable | Purpose |
|---|---|
| `questions.md` | Questions for the partner and BD, plus the assumptions I proceed on |
| `feasibility.md` | Options, risks, dependencies, what fits in 6 weeks |
| `proposal.md` | One page BD can send to the partner |
| Working proof (this repo) | Proves the riskiest part: keeping the app's balances and the on-chain token consistent under failures |
| `followup.md` | How I own delivery: checkpoints and release quality bar |
| `Final directive.md` | Final decision, what we will not do, next actions with owners |
| `ai-log.md` | Daily record of how AI was used |
| 5-minute video | Walkthrough |

## 6. Why the proof targets ledger consistency

Token launches rarely fail because a contract cannot be deployed. They fail because the app says one balance and the chain says another: duplicate rewards on retries, spending tokens twice, a purchase refunded after its reward was spent, or a transaction that silently fails. That is the hardest part to get right and the part a partner cannot see until it breaks in production, so that is what the proof demonstrates.

## 7. How I will know the submission worked

- A BD person could send `proposal.md` without rewriting it.
- Every scope decision traces back to a question or assumption.
- The proof runs in 3 commands with no keys or faucets, and its failure tests pass.
- The 6-week plan has a named go/no-go gate each week.
- Every day has an AI log entry.

## 8. Out of scope for the proof

- Real money, real users, mainnet deployment
- KYC, app-store review, production key management (covered in the documents, not built)
- A token that can be sold or traded

## 9. Schedule

| Day | Date | Work |
|---|---|---|
| 1 | Fri 13 Nov | `intent.md`, `questions.md`, `plan.md`, AI log, repo, token on a local chain ✅ |
| 2 | Sat 14 Nov | `feasibility.md`, earn and spend end to end |
| 3 | Sun 15 Nov | Failure cases and reconciliation |
| 4 | Mon 16 Nov | `proposal.md`, `followup.md`, demo page, README |
| 5 | Tue 17 Nov | `Final directive.md`, video, submit by midday |
