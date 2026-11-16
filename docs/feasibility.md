# Feasibility check

> Day 2. This file answers four questions: what are our options, what could go wrong, what do we depend on, and what can we really do in 6 weeks?
> It is built on the assumptions in `questions.md` (A1 to A14). When an answer needs the partner, BD or a lawyer, the file says so. **This is a technical and business check. It is not legal advice.**
> I checked the rules and vendor facts against public sources on Day 2. The sources are listed at the end, with how much I trust each one.

## 1. Recommendation in one paragraph

We launch a small pilot with one main flow: a user buys something, earns reward points, and uses the points as a discount on the next order. Only 5 to 10 percent of the users get it at the start. In week 1 we agree the scope and ask the partner's lawyers to look at the token idea. In week 2 we build the ledger (the list of who earned and spent what) and the token on a test blockchain, while the lawyers do their review. They give us their answer at the end of week 2. If it is yes, the points also live on the blockchain as a token. If it is no, we switch the blockchain part off and launch the same pilot with plain points, on the same date. The date does not move either way, because the ledger is the main part of the product and we build it in both cases.

Some things we cannot do in 6 weeks, and we say so now: a token that users can send to each other, sell or cash out; paying with crypto or stablecoins; and a launch to all users with a full outside security check (an audit).

## 2. What the partner asked, and what each part could mean

| The partner said | It could mean | What we assume |
|---|---|---|
| "pay … with a token" | (a) pay for goods with crypto, or (b) use reward points to pay | **(b).** Users use tokens as a discount on purchases in the app. (a) is phase 2. It needs licenses, accounting, and extra care with Apple's in-app purchase rules |
| "earn rewards" | Points for purchases, and maybe for other actions too | Purchases only in version 1. Every other way to earn needs extra work and is easier to cheat |
| "a token" | A real crypto coin, or just a branded point | A **closed-loop token**: users can only earn it. It cannot be bought, sold, sent to others or cashed out |
| "inside our app" | Users see crypto, or only see a balance | Users see a **balance**. We create and hold the wallet for them |
| "launch in 6 weeks" | Everyone gets it, or a small pilot | A **small pilot**, with a go or no-go decision before we open it to more users |

## 3. Our options

We compared four ways to build this.

| | **A. Points only** | **B. Closed-loop token (recommended)** | **C. Token users can trade** | **D. Pay with a stablecoin, earn a token** |
|---|---|---|---|---|
| What it is | Balances kept in our database. No blockchain | The same ledger, plus a token on a blockchain that copies every balance change | A token users can send, sell, or list on exchanges | Users pay with a dollar-linked coin (a stablecoin, like USDC) and earn a token as a reward |
| Fits the "token" ask? | Weak | **Good** | Strong | Strong |
| Possible by week 6? | Yes | **Yes, as a small pilot** | No | No |
| Legal risk | Lowest | Low, *if* the token stays closed (a lawyer must confirm) | High. Crypto, securities and money-transfer laws can apply | High. Payment and money-transfer licenses |
| Cost to build and run | Lowest | Medium. We add a contract, key storage, a worker that sends entries to the chain, and a check that both sides agree | High. Audit, legal work, trading problems | High |
| Can we reuse it for the next partner? | Yes (the ledger) | **Yes (the ledger and the blockchain part)** | Partly | Partly |
| Biggest risk | Looks like "just points" | The app and the blockchain stop agreeing, or the signing key is stolen | Legal trouble, price swings, speculation | Licenses, refunds, accounting, app store rules |

My view, to check on the first call with the partner: **B is built on top of A.** If B is blocked, we launch A on the same date. So B is a safe choice. C and D wait for phase 2, and only after a lawyer says yes.

## 4. Why use a blockchain at all?

The partner's CTO will ask this first, so here is the honest answer.

For the first version, the blockchain does not add much for the user. The user sees a points balance either way, and a normal database can do the whole job. It also does not mean "no single boss" here. In our design only our service can create or remove tokens, so we are the one administrator, unless the partner takes the admin key (see the option below).

There are still some reasons to use it. They are about what comes after version 1:

1. The partner gets a record they can check by themselves, without trusting our database.
2. It keeps the door open for later features, like letting users send tokens to each other, without giving everyone new balances.
3. It gives us a base we can reuse for the next partner. This reason is more for us than for the partner.
4. The partner asked for a token.

It also costs us something. We must keep the signing key safe, run a worker that sends entries to the chain, check that the app and the chain agree, get the contract reviewed, and explain it to users and lawyers.

What happened to others: Starbucks closed its NFT loyalty test, called Odyssey, on 31 March 2024 [8]. One commentator asked if the blockchain part was needed at all [9], and another said that good loyalty programs are simple [15]. The lesson is not "never use a blockchain". It is "do not make the user care about it, and know what it is for."

Our rule: if the partner cannot say why they want a token, we recommend plain points.

### An option: the partner holds the admin key

The token has two keys, like two keys to a shop:
- The **issuer key** gives points to users and takes them back. Our service uses it every day.
- The **admin key** decides who holds the issuer key. It can take the issuer key away and give it to someone else. It cannot create or remove points itself.

| | Pilot default: we hold both keys | Option: the partner holds the admin key |
|---|---|---|
| Who does the daily work | Us | Us |
| Who can replace the issuer key | Us | The partner |
| What the partner must do | Nothing | Keep one key very safe. If they lose it, nobody can replace a broken or stolen issuer key |
| Extra setup | None | Some extra work in week 1 to set up safe key storage (to estimate with the partner) |
| Why choose it | Simplest and fastest | Neither side has full control alone. It is a real answer to "why a blockchain?" |

The contract tests show that this works. The admin can take the issuer's key away, and the old issuer can no longer give points. The issuer cannot give out roles. The admin cannot create points.

One honest limit: this controls who can write to the token on the blockchain. The ledger is still our database, so it does not give the partner control of the ledger. The partner can stop us from changing the token, and can check the token's records. We say this clearly, so nobody thinks it gives more.

Our suggestion: in the pilot we hold both keys, because it is simpler. We offer the partner-holds-admin version as a choice, now or later. The partner decides (question P27).

## 5. Rules and laws: what we know and what we must confirm

> Rules differ by country and change fast. A lawyer must check everything here for the partner's real countries (question P11).

| Area | What public sources say | What it means for us |
|---|---|---|
| **EU (MiCA, the EU crypto law)** | Digital assets that cannot be passed to other holders are outside MiCA. The example given is loyalty points that can only be swapped for benefits with the company that issued them [1][2]. But reward tokens that *can* be passed on may be covered, as "other crypto-assets" [3] | If the token is closed and cannot be transferred, we stay outside MiCA. **Letting users transfer the token is the line that changes the answer.** |
| **US (FinCEN, the US agency against money crime)** | Someone who creates virtual currency units and uses them to buy goods and services is a "user", not a money transmitter. Selling convertible virtual currency for real money is money transmission [4]. A closed-loop prepaid access program is exempt only up to $2,000 per day [5] | **Never sell the token for money. Never allow cash-out.** Each US state also has its own money-transfer laws, and they can be different |
| **Apple App Store** | Crypto apps may not give currency for tasks like downloading apps or posting on social networks [6]. When payment unlocks features, apps may only use in-app purchase currencies [7]. News coverage also says crypto cannot replace in-app purchase [6] | Rewards for **purchases** are lower risk than rewards for social tasks. If the partner sells **digital goods**, using tokens for them needs an App Store check of how it works. **Please verify against Apple's current rules.** They changed after recent court rulings, and I could not open Apple's own page |
| **Consumer law, tax and accounting** | I did not research this | Points the user has not spent are a debt on the partner's books. Expiry and refund rules need a local legal review |

**Result:** the closed-loop version (earn only, no cash-out, rewards for purchases) is the one most likely to pass a legal review. That is the real reason we recommend it. It is simpler too, but that is not the main reason.

## 6. Token economics (the questions BD gets asked first)

These are our starting answers. The partner must confirm them.

| Question | Our default |
|---|---|
| Who pays for the rewards? | The partner. A fixed share of each purchase, for example 2 percent, with a monthly budget limit |
| What is a token worth? | A fixed amount. 1 token = 1 point = a fixed amount of discount (1 cent in our test). It has no market price |
| When do points expire? | 12 months after the user earns them. We warn the user before that |
| How do we stop cheating? | Points are given only after a payment is confirmed, not when a button is clicked. Each user has a daily limit, and there is a daily limit for everyone. No points for inviting yourself. We watch for strange patterns |
| What if a purchase is refunded after the points were spent? | See the decision below |
| How do we stop everything fast? | One switch stops earning and spending. The ledger keeps working, so nothing is lost |

### Decision: a refund after the points were spent

Here is an example. A user earns 100 points on a $50 purchase. The 100 points are worth $1. The user spends all 100 points on another order. Then the user returns the $50 purchase. We want the 100 points back, because the purchase was cancelled, but the user has no points left.

| Option | What happens | Our view |
|---|---|---|
| 1. Block the refund | The customer cannot get their money back | Rejected. It is unfair, and in some countries it may be against the law |
| 2. Give the refund and take back the points the user still has. If some points are missing, write them down as a debt and take them from the user's next rewards | The customer is never blocked. The balance on the blockchain never goes below zero. The partner loses at most the value of the points that were spent (here $1) | **Our choice** |
| 3. Give the refund and let the partner take the loss | It is simple, but people could cheat: earn, spend, return, and repeat | Backup, if the partner prefers it |

The customer does not pay any extra cash. The missing points are only taken from their next rewards. The proof tests this in failure case F4, and the partner confirms it in question P9.

## 7. Cost sketch

| Item | Estimate | Where it comes from |
|---|---|---|
| Blockchain fees | Base (the blockchain we would use) says its fees are under one cent per transaction [10]. With the 20,000 operations a day that we assumed, that is **at most about $200 a day**, probably much less | This is an upper limit. **We measure the real cost in week 2.** We can send entries in batches to cut it, because our ledger is the source of truth |
| Paying fees for users ("gas") | A paymaster is a service that pays blockchain fees for users. One report says Coinbase's paymaster gives $15 of sponsored fees per app per month for free, then charges $0.0001 per sponsored transaction [11]. Base's own pages mention a monthly limit, but the number differs between pages ($10k to $15k) [10][12] | Check the current terms when we pick a vendor. In the proof, our service pays the fees itself, so users never need to |
| Wallet vendor | Coinbase's embedded wallets became generally available in October 2025. The first 5,000 wallet operations each month are free [13] | Prices and owners of these companies change often. Stripe bought Privy in 2025 [14], and Fireblocks bought Dynamic [13]. We compare vendors in week 1 and do not commit yet |
| Security review | Not priced | A full outside audit usually does not fit in 6 weeks (see section 9) |

## 8. Risks

*Chance and damage: H = high, M = medium, L = low. These are my own estimates.*

| # | Risk | Chance | Damage | What we do | Owner |
|---|---|---|---|---|---|
| R1 | The lawyers do not approve the closed-loop design by week 2 | M | H | Brief the lawyers in week 1. **Backup: launch with plain points (option A) on the same date** | BD + partner legal |
| R2 | The scope grows: the partner asks for transfers, cash-out or crypto payments | H | H | Sign an "out of scope" list in week 1. New asks go to phase 2 | Tech lead + BD |
| R3 | The ledger and the blockchain stop agreeing | M | H | The ledger is the source of truth. Both sides refuse a repeated reference. A check every day sends an alert if they differ. **This is what the proof shows** | Tech lead |
| R4 | The signing key is stolen (the key that can create tokens) | L | H | Keep the key in a managed key service, never in code. Spending limits, a cap on the total number of tokens in the contract, and a kill switch | Tech lead |
| R5 | A bug in the contract | L | H | We use OpenZeppelin code (a widely used, audited library) and add very little of our own. Tests. An independent review before the real launch. The pilot cap limits the damage | Tech lead |
| R6 | Cheating: buying and refunding in a loop, fake accounts | H | M | Rewards only after a payment is confirmed. Limits. The refund rule in section 6. We watch for strange patterns | Tech lead + partner |
| R7 | The partner's engineers are not free to build the app part | M | H | Agree their time in week 1. We give them a small SDK (a ready-made code package) and a mock server (a fake copy of our service) so they can start early | BD + partner |
| R8 | Apple or Google reject the app | M | M | Check the rules early. Submit early, behind a feature switch. Rewards only for purchases | Partner |
| R9 | The blockchain or its access provider goes down | M | L | The app never waits for the chain. Users see ledger balances, and our worker tries again later | Tech lead |
| R10 | We get locked in to a vendor, or a vendor changes (wallets, key storage) | M | M | Keep wallets and keys behind our own interface. Compare vendors in week 1 | Tech lead |
| R11 | Blockchain fees are higher than expected | L | M | Measure in week 2. Send entries in batches | Tech lead |
| R12 | The partner loses the admin key (only if they hold it) | L | M | Keep it in a managed key service with a backup. Write the recovery steps in the runbook | Partner |

## 9. What we can do in 6 weeks

**"Launch" means a small pilot:** 5 to 10 percent of users, a spending limit, and a kill switch (one switch that stops earning and spending). After 2 to 4 weeks we decide go or no-go for more users.

We do **not** plan a full outside security audit inside the 6 weeks. It moves to before the wider rollout. We can launch without it because the pilot has hard limits: a cap on the total number of tokens, daily limits, and the kill switch. The partner must clearly agree to this.

| Week | Work | Gate at the end |
|---|---|---|
| **1** | Answer the open questions. Sign the scope and the out-of-scope list. Brief the lawyers. Choose the blockchain, wallet and key vendors. Agree how the partner's payment messages (webhooks) reach us. Set up test environments | **Scope signed. Lawyers started** |
| **2** | Build the ledger service and the contract on a public test blockchain. Connect the payment and refund messages. Measure the fees | **Legal go or no-go.** If no, we switch off the blockchain copy and continue with plain points |
| **3** | Connect the wallet and key service. The partner's app shows the balance and lets users redeem at checkout. Admin tools: look up a user, freeze, adjust | Works from start to finish on the partner's test setup (staging) |
| **4** | Make it strong: failure tests, the daily check, monitoring, limits, the kill switch. An independent review of the contract and the service. A load test | **Release quality bar met** (see `followup.md`) |
| **5** | The partner tests it (user-acceptance testing). Submit to the app stores. Write the runbook (a step-by-step guide for problems) and train support. Go live on the real blockchain only after the bar is met | **Release candidate approved** |
| **6** | **Pilot launch**, behind a feature switch. Check every day that the ledger and the chain agree. Track the success measure from question P4 | **Pilot is live.** The go or no-go for more users comes 2 to 4 weeks later |

### What is in and out of the 6 weeks

| In | Out (phase 2 or later) |
|---|---|
| Earn points on confirmed purchases. Use them as a discount | Sending tokens between users. Cash-out. Selling the token |
| Ledger service, closed-loop token, the daily check | Paying with crypto or stablecoins |
| Hidden wallets. No blockchain fees for users | Wallets that users control themselves. Users seeing crypto |
| Limits, kill switch, monitoring, runbook | KYC (identity checks), unless the law says we need it |
| Small pilot | Launch to everyone. Full outside audit. More than one blockchain |

## 10. What we depend on

| We need | Needed by | Owner | If it is late |
|---|---|---|---|
| A legal opinion on the closed-loop design in the partner's countries | End of week 2 | Partner legal + our legal | Launch with plain points |
| Payment and refund messages (webhooks) with a unique event ID | Week 2 | Partner | Duplicate rewards are harder to stop, and we may be delayed |
| Partner engineers for the app part | Week 3 | Partner | The pilot slips. We offer the SDK and the mock server |
| A decision on the wallet and key vendor | Week 1 | Tech lead | Use the simple custodial path (we hold the wallets) for the pilot |
| A choice of blockchain and access provider | Week 1 | Tech lead | Use Base with a managed provider |
| An independent review of the contract and service | Week 4 | Tech lead | A smaller pilot cap |
| An App Store rule check | Week 1. Submit in week 5 | Partner | Launch on the web first |

## 11. What I need decided

1. **BD:** agree that "launch" means a **small pilot**, and tell the partner now.
2. **BD and partner:** confirm the closed-loop, earn-only design. If users must be able to send tokens or cash out, tell us now, because that changes the timeline.
3. **Partner:** confirm the refund rule (option 2), the reward rate, and the monthly budget limit.
4. **Partner lawyers:** start the review in week 1.
5. **Partner:** say if you want to hold the admin key (the option in section 4). If you do not answer, we hold both keys in the pilot.

## Sources and confidence

| # | Source | Used for | Confidence |
|---|---|---|---|
| [1] | A&O Shearman, *MiCAR under the microscope, part 2*: https://www.aoshearman.com/en/insights/micar-under-the-microscope-part-2-are-you-in-or-out-of-scope | MiCA excludes non-transferable assets, loyalty points redeemable only with the issuer | High |
| [2] | ESMA / EBA / EIOPA joint factsheet (Oct 2025): https://www.esma.europa.eu/sites/default/files/2025-10/Updated_Joint_ESAs_Factsheet_on_crypto-assets_FI_EN.pdf | Same, from the regulators | High |
| [3] | CSB Group on MiCA categories: https://www.csbgroup.com/?p=44965 | Transferable reward tokens may be "other crypto-assets" | Medium (law firm commentary) |
| [4] | FinCEN, FIN-2013-G001: https://fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering | "User" vs money transmitter | High, but dated 2013; later guidance may add detail |
| [5] | Perkins Coie on FinCEN's prepaid access rule: https://perkinscoie.com/en/news-insights/fincen-issues-final-rule-regarding-prepaid-access.html | $2,000 closed-loop threshold | Medium (secondary) |
| [6] | Decrypt on Apple's guideline update: https://decrypt.co/?p=317589 ; AppleInsider: https://appleinsider.com/articles/22/10/24/apple-has-new-app-store-rules-for-nfts-and-cryptocurrency | Apple's crypto rules | **Low-medium: news coverage, not Apple's page; verify** |
| [7] | Digital Money Box on Apple's guidelines: https://digitalmoneybox.com/news/nft/apple-unveils-stricter-app-store-rules-for-crypto-and-nfts-critic-says-firm-wants-to-keep-money-in-its-ecosystem | In-app purchase currency rule | **Low-medium; verify** |
| [8] | Restaurant Dive on Starbucks Odyssey: https://www.restaurantdive.com/news/starbucks-shutters-nft-beta-test/710544/ | Closure date | High |
| [9] | TPAN newsletter on Odyssey: https://tpan.substack.com/p/280-starbucks-sunsets-odyssey | Lessons | Low (opinion) |
| [10] | Base docs, gasless transactions: https://docs.base.org/tutorials/gasless-transaction-on-base-using-a-paymaster | Fees under a cent; sponsorship limit | Medium; limit differs between Base pages |
| [11] | Eco, gas sponsorship 2026: https://eco.com/support/support/en/articles/15254045 | Paymaster pricing | Low-medium (third party); check vendor page |
| [12] | Base docs, go gasless: https://docs.base.org/use-cases/go-gasless | Sponsorship limit | Medium |
| [13] | Markaicode, wallet comparison (verified Sept 2026): https://markaicode.com/web3/developer-tools/wallets-and-account-abstraction/ | Coinbase embedded wallet GA and free tier; vendor ownership changes | Medium (third party) |
| [14] | Crossmint on Privy alternatives: https://crossmint.com/learn/privy-alternatives-for-programmable-wallets | Privy acquired by Stripe (June 2025) | Medium (competitor's page) |
| [15] | Sparta Loyalty on the Odyssey closure: https://spartaloyalty.com/articles/starbucks-closing-odyessey/ | Good loyalty programs are simple | Low (opinion from a loyalty software vendor) |

**Not checked:** Apple's own rule text, current vendor price pages, tax and accounting rules, and the partner's real countries. Each one is a week-1 task.
