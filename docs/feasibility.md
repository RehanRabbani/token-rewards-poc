# Feasibility check

> Day 2. Answers: *what are the options, what could go wrong, what does it depend on, and what is realistic in 6 weeks?*
> Built on the assumptions in `questions.md` (A1–A10). Where an answer needs the partner, BD or a lawyer, it says so. **This is a technical and commercial assessment, not legal advice.**
> Regulatory and vendor facts were checked against public sources on Day 2; they are listed at the end with a confidence note.

## 1. Recommendation in one paragraph

**Build the ledger first, mirror it on-chain second, and decide at the end of week 2.** The core of the product is a reward *ledger* (who earned what, who spent what), and that is the same whether the "token" is a database row or an on-chain ERC-20. So we build the ledger and a closed-loop token on an EVM layer-2 in parallel. At the **week-2 legal gate**, if counsel confirms the closed-loop design, we keep the on-chain mirror and launch a **capped pilot** (5–10% of users) in week 6. If not, we switch the mirror off and still launch the same pilot on the ledger alone, on the same date. The date is protected either way, and the partner gets the token story if it is allowed.

**What is not feasible in 6 weeks, and we say so up front:** a token users can transfer, sell or cash out; accepting crypto or stablecoins as payment; a full general launch with an external security audit.

## 2. What the partner asked, and what each part really means

| The partner said | Could mean | What we assume (and how it fits 6 weeks) |
|---|---|---|
| "pay … with a token" | (a) pay for goods with crypto, or (b) redeem reward points as payment | **(b).** Redeem tokens as a discount on in-app purchases. (a) is phase 2: it needs licensing, accounting and, on iOS, care around in-app-purchase rules |
| "earn rewards" | Tokens granted on purchases and maybe other actions | Purchases only in v1; each earning trigger is an integration and an abuse vector |
| "a token" | A real crypto asset, or a branded point | A **closed-loop token**: earned, never bought, sold, transferred or cashed out |
| "inside our app" | Users see crypto, or just a balance | Users see a **balance**; the wallet is created and held for them |
| "launch in 6 weeks" | Everyone, or a pilot | **Capped pilot** with a go/no-go gate before wider rollout |

## 3. Options

| | **A. Points (ledger only)** | **B. Closed-loop token on an L2 (recommended)** | **C. Transferable / tradable token** | **D. Pay in stablecoin + reward token** |
|---|---|---|---|---|
| What it is | Balances in our database, no chain | Same ledger, plus an on-chain token mirroring every balance change | Token users can send, sell or list on exchanges | Users pay with USDC or similar; rewards in a token |
| Fits the "token" ask | Weak | **Good** | Strong | Strong |
| Realistic by week 6 | Yes | **Yes, as a capped pilot** | No | No |
| Regulatory exposure | Lowest | Low *if* closed-loop holds (legal sign-off needed) | High: crypto-asset, securities, money-transmission rules | High: payments and money-transmission licensing |
| Build and run cost | Lowest | Medium: adds contract, key custody, chain worker, reconciliation | High: audit, legal, exchange/market-making issues | High |
| Reusable for the next partner | Yes (the ledger) | **Yes (ledger plus the on-chain layer)** | Partly | Partly |
| Main risk | Looks like "just points" | Ledger and chain drift apart; key theft | Legal, price volatility, speculation | Licensing, refunds, accounting, app-store rules |

My judgment, to validate on the first partner call. **B is built on top of A**: if B is blocked, the pilot ships as A on the same date. That makes B a low-regret choice. C and D are phase 2 at the earliest and only after legal sign-off.

## 4. Why use a blockchain at all?

BD will be asked this first, so here is the honest answer.

**For a closed-loop token in v1, the blockchain adds very little for the end user.** The user sees a balance either way. A database can do everything the pilot needs. The reasons to go on-chain are about what comes *after* v1:

1. **A path to later features** (transferability, partner-to-partner use, public verifiability) without re-issuing everyone's balance. This is only worth paying for if the partner genuinely wants it later.
2. **An independent audit trail** the partner can check without trusting our database.
3. **A reusable platform** for our next partner, which is the commercial reason for us.
4. **The partner asked for a token.**

**The costs:** key management for the minting key, a chain worker, reconciliation, a security review of the contract, and more to explain to users and regulators.

**What the market says.** Starbucks closed its NFT-based loyalty beta, Odyssey, on 31 March 2024 [8][9]. Commentary at the time pointed to the lack of a clear need for the blockchain part, and to ordinary members wanting simple rewards [9]. The lesson for us is not "avoid blockchain" but **"don't make the user care about it, and be able to say what it is for."**

**Decision rule:** if the partner answers question P2 ("why a token rather than points?") with "no particular reason", we recommend **Option A** and keep the on-chain layer as a switchable add-on.

## 5. Regulation: what we know and what must be confirmed

> Rules differ by country and change quickly. Everything here goes to counsel for the partner's actual markets (question P11).

| Area | What public sources say | What it means for our design |
|---|---|---|
| **EU (MiCA)** | Digital assets that cannot be transferred to other holders are outside MiCA; the example given is loyalty points that can be exchanged for benefits only with the issuer [1][2]. But reward and loyalty tokens that *are* transferable can fall under MiCA's "other crypto-asset" category [3] | Closed-loop and non-transferable keeps us out of scope. **Making the token transferable is the line that changes the answer.** |
| **US (FinCEN)** | A person who creates units of virtual currency and uses them to buy goods and services is a "user", not a money transmitter; selling convertible virtual currency for real currency is money transmission [4]. Closed-loop prepaid access is exempt only up to $2,000 per day [5] | **Never sell the token for money; never allow cash-out.** State money-transmitter laws are separate and can differ |
| **Apple App Store** | Crypto apps may not offer currency for completing tasks such as downloading apps or posting to social networks [6]. Where payment unlocks features or functionality, apps may only use in-app purchase currencies [7]. Coverage also notes crypto cannot be an alternative to in-app purchase [6] | Rewards for **purchases** are lower risk than rewards for social tasks. If the partner sells **digital goods**, redeeming tokens for them needs an App Store review of how it works. **Verify against Apple's current guidelines**: they changed after recent court rulings and I could not open Apple's page directly |
| **Consumer law, tax and accounting** | Not researched | Outstanding points are a liability on the partner's books; expiry and refund rules need local legal review |

**Result:** our closed-loop, earn-only, no-cash-out, purchase-triggered design is the version most likely to pass legal review. That is why it is the recommendation, not just because it is simpler.

## 6. Token economics (the questions BD gets asked first)

| Question | Proposed default (confirm with the partner) |
|---|---|
| Who pays for rewards? | The partner, at a fixed % of purchase value (for example 2%), with a **monthly budget cap** |
| What is the value of a token? | Fixed: 1 token = 1 point = a fixed amount of discount. No market price |
| Expiry | 12 months after earning, with a warning before expiry |
| What stops reward farming? | Rewards only on **settled** payments (webhook, not button click); per-user daily earn cap; global daily cap; no reward on self-referrals; alert on unusual patterns |
| **Refund after the reward was spent** | **Decision below** |
| Kill switch | One setting stops all earning and redeeming; the ledger keeps working, so nothing is lost |

### Decision: refund after the reward was spent

| Option | Result | Verdict |
|---|---|---|
| 1. Block the refund | Customer cannot get their money back | Rejected: bad experience and likely a consumer-law problem |
| 2. Allow the refund; claw back what the user still holds; **record the shortfall as a debt netted against future rewards** | Customer is never blocked; the chain never goes negative; the partner's loss is bounded | **Recommended** |
| 3. Allow the refund and absorb the loss | Simple, but invites abuse (earn, spend, refund, repeat) | Fallback if the partner prefers it |

The proof will implement option 2 (failure case F4). It becomes a line in `questions.md` for the partner to confirm (P9).

## 7. Cost sketch

| Item | Estimate | Basis |
|---|---|---|
| Chain fees | Base says its fees are under a cent per transaction [10]. At the assumed 20,000 on-chain operations a day, that is **at most about $200/day**, probably far less | Upper bound. **To measure in week 2.** Batching settlements (the ledger is the source of truth, so the chain can settle in batches) can cut this |
| Gas sponsorship for users | Coinbase's paymaster has been reported at $15 of sponsored gas per app per month free, then $0.0001 per sponsored transaction [11]; Base documents a monthly sponsorship limit but its figure varies between pages ($10k–$15k) [10][12] | Check current terms when choosing a vendor. In the proof our service pays gas directly, so users never need it |
| Wallet vendor | Coinbase's embedded wallets reached general availability in October 2025 and list the first 5,000 wallet operations per month free [13] | Pricing and ownership change often (Privy was acquired by Stripe in 2025 [14]; Dynamic by Fireblocks [13]). Compare at week 1, don't lock in now |
| Security review | Not priced | A full external audit usually does not fit in 6 weeks; see section 9 |

## 8. Risks

*Likelihood and impact: H, M, L. These are my estimates.*

| # | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Legal does not approve the closed-loop design by week 2 | M | H | Brief counsel in week 1; **fallback: ship as ledger-only (Option A)** on the same date | BD + partner legal |
| R2 | Scope creep: partner asks for transfers, cash-out or crypto payments | H | H | "Out of scope" list signed in week 1; changes go to phase 2 | Tech lead + BD |
| R3 | Ledger and chain drift apart | M | H | Ledger is the source of truth; unique references on both sides; daily reconciliation with alerts. **This is what the proof demonstrates** | Tech lead |
| R4 | Minting key stolen | L | H | Key in a managed key service, never in code; spend caps; a total supply cap in the contract; kill switch | Tech lead |
| R5 | Contract bug | L | H | Built on audited OpenZeppelin code with minimal custom logic; tests; independent review before mainnet; a pilot cap limits the damage | Tech lead |
| R6 | Reward abuse (self-purchase and refund loops, fake accounts) | H | M | Rewards only on settled payments; caps; clawback rule; monitoring | Tech lead + partner |
| R7 | Partner's engineers are not available for the app integration | M | H | Agree their capacity in week 1; provide a small SDK and a mock server so they can start early | BD + partner |
| R8 | App Store review problems | M | M | Early check of the rules; submit early with a feature flag; rewards tied to purchases | Partner |
| R9 | Chain or RPC outage | M | L | The app never waits on the chain: users see ledger balances; the chain worker retries | Tech lead |
| R10 | Vendor lock-in or vendor change (wallets, custody) | M | M | Wallet and key service sit behind our own interface; compare vendors in week 1 | Tech lead |
| R11 | Gas costs higher than expected | L | M | Measure in week 2; batch settlements | Tech lead |

## 9. What is realistic in 6 weeks

**Definition of "launch": a capped pilot** (5–10% of users, a spending cap and a kill switch), judged by a go/no-go after 2–4 weeks. A **full external security audit** is not planned inside the 6 weeks; it moves to before wider rollout. The pilot's limits (a hard supply cap, daily caps, a kill switch) are what make launching without a full audit acceptable. The partner must agree to that explicitly.

| Week | Work | Gate at the end |
|---|---|---|
| **1** | Close open questions; sign scope and out-of-scope list; brief legal; choose chain, wallet and key vendors; agree the API contract and the partner's webhooks; set up environments | **Scope signed; legal engaged** |
| **2** | Ledger service and contract on a public test network; payment and refund webhooks wired in; measure gas cost | **Legal go/no-go.** No: switch off the on-chain mirror and continue as ledger-only |
| **3** | Wallet and key-service integration; partner app shows balance and redeems at checkout; admin tools (look-up, freeze, adjust) | End-to-end working on the partner's staging |
| **4** | Hardening: failure tests, reconciliation, monitoring, caps, kill switch; independent review of contract and service; load test | **Release quality bar met** (see `followup.md`) |
| **5** | Partner user-acceptance testing; app-store submission; runbook and support training; deploy to mainnet only after the bar is met | **Release candidate approved** |
| **6** | **Pilot launch** behind a flag; daily reconciliation; track the success metric from question P4 | **Pilot live**; go/no-go on wider rollout set for 2–4 weeks later |

### In and out of scope for the 6 weeks

| In | Out (phase 2 or later) |
|---|---|
| Earn on settled purchases; redeem as a discount | Transfers between users; cash-out; selling the token |
| Ledger service, closed-loop token, reconciliation | Accepting crypto or stablecoins as payment |
| Hidden wallets, no gas for users | Self-custody wallets; users seeing crypto |
| Caps, kill switch, monitoring, runbook | KYC (unless legal requires it) |
| Capped pilot | General launch; external audit; multiple chains |

## 10. Dependencies

| Dependency | Needed by | Owner | If late |
|---|---|---|---|
| Legal view on the closed-loop design in the partner's markets | End of week 2 | Partner legal + our legal | Fall back to ledger-only |
| Payment and refund webhooks with unique event IDs | Week 2 | Partner | Reward duplicates become harder to prevent; delay |
| Partner engineers for the app integration | Week 3 | Partner | Pilot slips; offer SDK and mock server |
| Wallet and key-service vendor decision | Week 1 | Tech lead | Use the simple custodial path for the pilot |
| Chain and RPC provider | Week 1 | Tech lead | Default to Base with a managed provider |
| Independent review of contract and service | Week 4 | Tech lead | Smaller pilot cap |
| App Store policy check | Week 1; submission week 5 | Partner | Launch web-first |

## 11. What I need decided

1. **BD:** agree that "launch" means a **capped pilot**, and tell the partner now.
2. **BD + partner:** confirm the closed-loop, earn-only design, or tell us now if transfers or cash-out are required, because that changes the timeline.
3. **Partner:** confirm the refund rule (option 2), the reward rate and the monthly budget cap.
4. **Partner legal:** start the review in week 1.

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

**Not verified:** Apple's own guideline text; current vendor price pages; tax and accounting treatment; the partner's actual markets. Each is a week-1 action.
