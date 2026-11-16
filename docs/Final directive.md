# Final directive

> Day 5. The brief does not say what this file is. The recruiter confirmed I should define it myself. My definition: **the final decision, what we will not do, and who does what next.** It closes the loop with `intent.md`, which I wrote on Day 1 before any work started.
> If you read only one file, read this one. It points to the others for the details.

## 1. The decision

**We say yes to the partner, with a smaller first step than they asked for.**

In 6 weeks we launch a **pilot** for 5 to 10 percent of their users. A user buys something, earns reward tokens, and uses the tokens as a discount on the next order. The tokens are **closed-loop**: users can only earn them and spend them in the partner's app. They cannot send them to other people, sell them, or turn them into cash. Users see a balance in the app and nothing about crypto.

If the partner's lawyers do not approve the token by the end of week 2, we launch the same pilot with plain points, on the same date.

## 2. Why this is the right answer

- **It gives the partner what they really want.** They said "a token". What they want is customers who come back and buy again (`intent.md`, section 2). A balance that users can only spend with them does that.
- **It fits in 6 weeks.** A token that users can trade, or paying with crypto, does not. Those need licences, an outside security audit, and legal work that takes longer (`feasibility.md`, sections 3 and 5).
- **The date is safe.** The ledger, which is our list of who earned and spent what, is the main part of the product. We build it in both cases. The token is a copy of the ledger on a blockchain, and we can switch it off without moving the date.
- **A mistake stays small.** The pilot has a cap on total points, daily limits, and one switch that stops everything.
- **The hardest part already works.** The proof in this repo shows that the app and the blockchain stay in agreement when things go wrong.

## 3. The decisions that matter most

| Decision | Why |
|---|---|
| "Launch" means a small pilot, not all users | A launch for everyone needs a full outside audit, and that does not fit in 6 weeks |
| "Pay with a token" means using earned tokens as a discount | Paying for goods with crypto needs payment licences and new accounting |
| The token is closed-loop: earn and spend only | This is the version most likely to pass a legal review. Letting users transfer tokens is the line that changes the legal answer |
| Our ledger is the truth; the blockchain is a copy that can be checked | The app never waits for the blockchain, and a blockchain problem never stops a customer |
| A refund is never blocked | If the points were already spent, the missing points become a debt, and the user's next rewards pay it. The customer never pays extra cash |
| The daily check reports problems and does not fix them | The right fix depends on the cause. An automatic fix could hide a real problem, like a stolen key |
| We hold both token keys in the pilot; the partner can take the admin key if they want | Simplest to start. The option gives the partner real control over the token later |

The full list, D1 to D18, is in `plan.md`.

## 4. What we will not do

| We will not | Why | When it could change |
|---|---|---|
| Let users send, sell or cash out tokens | Crypto and money-transfer laws start to apply | Phase 2, after a lawyer says yes |
| Accept crypto or stablecoins as payment | Needs licences, and has app store limits | Phase 2 |
| Launch to all users in week 6 | No time for a full outside audit | After the pilot's go or no-go decision |
| Show users wallets, keys or fees | It makes the product harder to use and adds support work | Only if the partner asks for it |
| Give rewards for anything other than purchases | Every other way to earn is easier to cheat | After the pilot |
| Go live on the real blockchain before the quality bar is met | A mistake with real tokens is hard to undo | Never. This one is fixed |
| Promise the token if the partner cannot say why they want one | Plain points are cheaper and do the same for users | If they give a reason |

## 5. Who does what next

"Day 1" is the day BD sends the proposal.

| # | Action | Owner | By when |
|---|---|---|---|
| 1 | Read `proposal.md` and send it to the partner | BD | Day 1 |
| 2 | Tell the partner clearly that "launch" means a pilot | BD | In the same message |
| 3 | First call: confirm the four assumptions in the proposal | BD and me | Within 3 working days |
| 4 | Sign the scope and the list of what is out | Partner's decision-maker | End of week 1 |
| 5 | Start the legal review of the closed-loop token | Partner's lawyers and ours | Week 1. Answer by end of week 2 |
| 6 | Say which countries the users are in | Partner | First call. The lawyers cannot start without it |
| 7 | Set the reward rate, the monthly budget and the expiry | Partner | End of week 1 |
| 8 | Give us test payment and refund messages | Partner's engineers | Week 2 |
| 9 | Choose the blockchain, the wallet vendor and the key storage | Me | End of week 1 |
| 10 | Check Apple's and Google's current rules for reward tokens | Partner, with my help | Week 1 |
| 11 | Turn the proof into the real service (the list is in `followup.md`, section 6) | Me and 2 engineers | Weeks 2 to 4 |
| 12 | Book the independent review for week 4 | Me | Week 1 |
| 13 | Decide who holds the admin key | Partner | Before week 3 |
| 14 | Decide go or no-go for more users | Partner, BD and me | 2 to 4 weeks after the pilot starts |

## 6. What would change this directive

| If we hear this | Then |
|---|---|
| "Users must be able to sell or cash out the token" | We recommend points now and the token later, or a later date |
| "Users pay for goods with the token, and buy it with money" | That is phase 2, with licences. Version 1 stays rewards only |
| "It must be all users in week 6" | We offer all users with stricter limits and a kill switch, or a later date with an audit |
| The lawyers say no to the token | Plain points, same date |
| The partner cannot give us payment messages with a unique ID | The date is at risk. We agree another way to stop double rewards before we start building |

## 7. What the proof shows, and what it does not

**It shows** that the app's ledger and the blockchain do not disagree without us knowing:

| Case | Result |
|---|---|
| The same payment message arrives twice | The customer is rewarded once |
| Five checkouts at the same moment for the whole balance | One succeeds, four are refused |
| The service crashes in the middle of a blockchain transaction | Nothing is lost and nothing is created twice |
| A refund after the points were spent | The refund goes through, and the missing points become a debt |
| Tokens appear on the blockchain that the ledger never recorded | The check finds them and names the customer |

45 automated tests pass (8 for the contract, 37 for the service). It runs in three commands: `npm install`, `npm test`, `npm run demo`.

**It does not show** these things, and I do not claim it does:

- It runs on a local test blockchain, not a real one.
- It uses a public test key. A real key must live in a managed key service.
- It has no login and no real wallet vendor.
- Nobody outside has reviewed the contract or the service.
- It was not tested with many users at the same time.

Each of these has a week and an owner in `followup.md`.

## 8. Closing the loop with Day 1

In `intent.md` I wrote how I would know the work was good. Here is the check.

| What I said on Day 1 | Result |
|---|---|
| BD could send `proposal.md` without rewriting it | Yes. One page, written for the partner |
| Every scope decision traces back to a question or an assumption | Yes. For example: the pilot is A4, closed-loop is A1 and P7, the refund rule is A12 and P9, the admin key is A14 and P27 |
| The proof runs in 3 commands, with no keys or faucets, and the failure tests pass | Yes. 45 of 45 tests pass |
| The 6-week plan has a named go or no-go gate each week | Yes. `followup.md`, section 3 |
| Every day has an AI log entry | Yes. `ai-log.md` |

My one-line reading of the request on Day 1 was: a capped pilot of a closed-loop reward token in 6 weeks, with crypto payments and transfers in phase 2. After five days of work, **the recommendation is the same.** What changed is how much I can stand behind it: the legal reason is checked against public sources, the hardest part is built and tested, and there is a backup that keeps the date.

## 9. What I am still not sure about

- **The law.** I checked public sources, and I am not a lawyer. The answer depends on the partner's countries, which we do not know yet.
- **Apple's rules.** I could not open Apple's own page, so that part of `feasibility.md` is marked "verify".
- **The partner's real numbers.** Users, purchases per day and the reward budget are all my assumptions until the first call.
- **Whether the partner needs a token at all.** If they cannot say why, plain points are the honest recommendation.

## 10. Where to find the details

| File | What is in it |
|---|---|
| `intent.md` | What I understood on Day 1 |
| `questions.md` | Questions for the partner and BD, and the assumptions I used |
| `feasibility.md` | Options, laws, costs, risks, and what fits in 6 weeks |
| `proposal.md` | The page BD sends to the partner |
| `followup.md` | How I own delivery: weekly gates and the release quality bar |
| `plan.md` | The 5-day plan and decisions D1 to D18 |
| `ai-log.md` | How I used AI each day, and where I overruled it |
| `README.md` | How to run the proof and the demo page |
