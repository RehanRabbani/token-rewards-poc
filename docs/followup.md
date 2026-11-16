# Follow-up: how I own delivery

> Day 4. The proposal says what we will deliver. This file says how I make sure it happens: who owns what, the checkpoint at the end of every week, how I report, and the quality bar the release must pass before real users see it.
> The numbers marked *target* are my proposals. I confirm them with the partner in week 1.

## 1. Who owns what

| Area | Owner | What that means |
|---|---|---|
| Technical delivery: scope, design, quality, the date | **Me** | One name for the partner's CTO to call. If it slips, it is mine to say so first |
| The partner relationship and the commercial deal | BD | I join every partner call that touches scope or dates |
| The app screens, the payment messages, their lawyers | Partner | I give them an SDK, a mock server and a weekly checklist so they are never waiting for us |
| Legal review on our side | Our legal owner (question B5) | I brief them in week 1 and chase the answer |

I do not hand over a risk by naming an owner. For every item that is not mine, I still track it every week and raise it when it turns amber.

## 2. The first 5 working days after the proposal is sent

| Day | What I do |
|---|---|
| 1 | Call with BD and the partner. Go through the four assumptions in the proposal and the five blocker questions in `questions.md`. Write down each answer or the assumption we use instead |
| 2 | Send a one-page scope note: what is in, what is out, and who signs. Send the legal briefing to both legal teams |
| 3 | Technical call with the partner's engineers: payment and refund messages, user IDs, their test setup. Give them the mock server |
| 4 | Choose the blockchain, the wallet vendor and the key storage, with a short written comparison |
| 5 | **Gate: scope signed, lawyers started.** If not signed, I tell BD the same day that the launch date starts to move |

## 3. Checkpoints: one gate per week

Each gate has proof that I show, not a status that I claim. A gate is passed or not passed. There is no "almost".

| Week | Gate | The proof I show | If the gate is not passed |
|---|---|---|---|
| 1 | Scope signed. Lawyers started | The signed scope note. The date of the legal briefing | The date moves by the same number of days. BD tells the partner |
| 2 | Legal yes or no. Ledger and token work on a test blockchain | The lawyers' written answer. All failure tests pass. Measured blockchain fees | Legal no, or no answer: we switch the token off and continue with plain points. Same date |
| 3 | Works end to end on the partner's test setup | A recorded run: buy, earn, redeem and refund in the partner's test app | We cut the admin tools to "look up a user" only, and keep the user flow |
| 4 | Release quality bar met (section 5) | The checklist in section 5, every line with a link to its proof | No real blockchain, no real users. We fix, or we lower the pilot cap and agree it in writing |
| 5 | Release approved by the partner | Their sign-off after testing. The runbook. The app store submission | Web first, if the app stores are late |
| 6 | Pilot live | The daily check is clean. The first numbers for the success measure | We stop with the kill switch, fix, and restart. The ledger keeps every balance |

## 4. How I report

- **Every Friday, one page** to BD and the partner: each gate green, amber or red; the top three risks; the decisions I need and from whom; what changed in scope.
- **Every week, one joint call** with BD and the partner (question B8). Decisions are written down in the same hour.
- **Every day during the pilot**, a short note: the daily check result, entries that got stuck, limits that were hit.
- **Bad news goes first.** If a gate is at risk, I say so when I know, not at the gate.

## 5. Release quality bar

Nothing goes to real users or to the real blockchain until every line is true. "In the proof" means the working proof in this repo already shows it; the others are built in weeks 2 to 5.

**The balances are right**

| # | The bar | In the proof? |
|---|---|---|
| Q1 | A payment message that arrives twice rewards the customer once | Yes (F1) |
| Q2 | Checkouts at the same moment cannot spend more than the balance | Yes (F2). Must be tested again on the production database |
| Q3 | A crash or a blockchain outage at any moment loses no points and creates none twice | Yes (F3) |
| Q4 | A refund is never blocked, and the points are taken back or recorded as debt | Yes (F4) |
| Q5 | The daily check finds every difference between the ledger and the blockchain | Yes (F5) |
| Q6 | 7 days in a row on the test setup with no unexplained difference (*target*) | No |
| Q7 | A load test at twice the expected busiest day (40,000 operations, *target*) with no difference, and the app answering in under 300 ms for 95 percent of requests (*target*) | No |

**The system is safe**

| # | The bar | In the proof? |
|---|---|---|
| Q8 | The signing key is in a managed key service. It is not in code, in a file, or on a laptop | No (the proof uses a public test key) |
| Q9 | The contract has a cap on total points, and the service has daily limits per user and for everyone | No |
| Q10 | The kill switch stops earning and spending, and we have tried it on the test setup | No |
| Q11 | An independent review of the contract and the service is done. No high-risk finding is open | No |
| Q12 | The API accepts only signed messages from the partner | No (the proof has no login) |

**We can run it**

| # | The bar | In the proof? |
|---|---|---|
| Q13 | An alert reaches a named person when the daily check finds a difference or an entry is stuck | Partly (the check exists, the alert does not) |
| Q14 | A runbook covers: a difference, a stuck entry, a stolen key, the blockchain down. We have practised each once | No |
| Q15 | We can go back to the previous version in under 30 minutes (*target*), and have done it once | No |
| Q16 | The partner's support team can look up a user and explain their balance | No |

**We are allowed to**

| # | The bar |
|---|---|
| Q17 | The lawyers' written yes for the countries in the pilot (or we launch plain points) |
| Q18 | The partner accepts in writing: pilot limits, no full outside audit before the pilot, the refund rule |
| Q19 | The app stores have approved the release, or the pilot starts on the web |

## 6. From proof to product

The proof uses simple stand-ins. Each one is replaced by a named week. The design and the tests stay the same.

| In the proof | In the product | Week |
|---|---|---|
| A local blockchain | A public test blockchain, then the real one (Base by default) | 2, then 5 |
| SQLite | Postgres, with the same overspend tests run against it | 2 |
| A public test key | A managed key service | 3 |
| A wallet address made from the user ID | A wallet vendor, behind our own interface | 3 |
| No login | Signed messages and admin login | 3 |
| A background loop | A queue with retries and alerts | 4 |
| A check you run by hand | A check that runs every day and alerts | 4 |

## 7. Running the pilot

- I look at the daily check every day (question B9). A difference or a stuck entry is looked at the same day.
- The check **reports and never repairs**. A person finds the cause first, because the fix for a bug, a lost write and a stolen key are different.
- **The kill switch rule:** if points exist on the blockchain that the ledger cannot explain, or the signing key may be stolen, I stop earning and spending first and ask questions after. Users keep their balances; nothing is lost while it is off.
- After any stop, the partner gets a short written note within one working day: what happened, what users saw, what we changed.

## 8. Go or no-go for more users (2 to 4 weeks after launch)

I recommend "go" only if all of these are true:

1. No unexplained difference between the ledger and the blockchain during the whole pilot.
2. No security incident, and no open high-risk finding.
3. The partner's success measure (question P4) is moving the right way. Our default: the share of active users who earn and redeem at least once.
4. Reward cost is inside the monthly budget, and refund abuse is low enough for the partner.
5. The full outside audit is booked or done.

If one is false, the answer is "not yet", with a date for the next decision.

## 9. If we fall behind

The date and the safety of balances are fixed. Scope is what gives. I cut in this order:

1. Admin tools beyond "look up a user".
2. The mobile release (the pilot starts on the web).
3. The size of the pilot (a smaller share of users, lower limits).
4. The token itself: launch plain points, add the token after the pilot.

I never cut: duplicate protection, the overspend guard, the refund rule, the daily check, the kill switch, key safety.

## 10. When I escalate

| What I see | Who I tell | How fast |
|---|---|---|
| A gate will be missed | BD, then the partner | The same day I know |
| The partner asks for something on the out-of-scope list | BD | Before I answer the partner |
| The lawyers are late or say no | BD and the partner's decision-maker | The same day. We switch to plain points |
| An unexplained difference, or a possible stolen key | BD and the partner's technical lead | Within one hour, after the kill switch |
| The partner's engineers are not available | BD | At the first missed weekly checklist |
