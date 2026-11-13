# Questions and assumptions

> Day 1. Questions are ranked so the first call with the partner covers the blockers. Every question carries the assumption I proceed on if it goes unanswered, so work never stalls waiting for a reply.

## Top 5 blockers (ask in the first call)

These five can change the architecture or the 6-week date. Everything else can be answered during the build.

1. **What does "pay with a token" mean to you?** Paying for goods with the token, or redeeming rewards as a discount?
2. **Can users cash out, sell or transfer the token to someone else?**
3. **Which countries are your users in?** This decides the regulatory regime.
4. **What does "launch in 6 weeks" mean?** All users, or a limited pilot? Is the date tied to a marketing event?
5. **Who funds the rewards, and what is the budget?** For example, 2% of purchase value, capped per month.

---

## A. Questions for the partner

### Business goal

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| P1 | What business result should this move: retention, spend per user, new users, or a token launch itself? | Decides what we measure at the pilot gate | Retention and repeat purchases |
| P2 | Why a token rather than a points programme? | If there is no reason, points are faster and cheaper | Marketing angle plus option to go on-chain later |
| P3 | Is the 6-week date tied to an event (campaign, funding round, season)? | Decides whether the date or the scope is fixed | Date is fixed, scope flexes |
| P4 | How will you judge success after 30 days? | Becomes the pilot's success metric | % of active users who earn and redeem at least once |

### Product: what "pay" and "earn" mean

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| P5 | Pay for goods with the token, or redeem the token as a discount? | Accepting a token as payment is the biggest regulatory and accounting step | Redeem as a discount (partial or full) on in-app purchases |
| P6 | Do users ever buy the token with money? | Selling a token for money can make it e-money or a security | No. Tokens are only earned |
| P7 | Can users transfer, sell or cash out tokens? | Transferable tokens with value trigger the heaviest rules | No. Closed loop in v1 |
| P8 | What earns rewards: purchases only, or also referrals, streaks, actions? | Each trigger is an integration point and an abuse vector | Purchases only in v1 |
| P9 | Reward rate, expiry, and what happens on refunds? | Refunds after a reward was spent is a real edge case | Fixed %, 12-month expiry. On refund: claw back what the user still holds and record any shortfall as a debt netted against future rewards (`feasibility.md` section 6) |
| P10 | Must users see the token as crypto (wallet address, on-chain explorer)? | Visible wallets add onboarding friction and support load | No. Users see a balance; wallet is created silently |

### Users and markets

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| P11 | Which countries are users in? Any in the US, EU or UK? | MiCA (EU), FCA (UK), SEC/state money-transmission (US) differ | Multiple markets; design for the strictest (closed-loop, non-transferable) |
| P12 | How many monthly active users, and how many purchases per day? | Sizes infrastructure and on-chain cost | 100k MAU, up to 20k reward events per day |
| P13 | Any users under 18? | Age rules for financial-like features | No |

### Technical setup

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| P14 | Mobile (iOS/Android), web, or both? | App-store rules restrict crypto features and in-app purchases | Both; mobile is the main surface |
| P15 | Which payment provider (Stripe, Adyen, other)? Do you get payment and refund webhooks? | Rewards are triggered from payment events | Yes, Stripe-like webhooks |
| P16 | How do users log in today? | Wallets attach to the existing user account | Existing account with a stable user ID |
| P17 | Do you already do KYC? | Needed if the token ever becomes transferable or cashable | No KYC today |
| P18 | Who on your side can build the integration, and how many hours per week? | The integration is their work too; their capacity sets the timeline | 1 mobile and 1 backend engineer, part-time |
| P19 | Any required blockchain, existing wallet vendor, or security/compliance standards (SOC 2, PCI)? | Constrains the stack | None |

### Decision and process

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| P20 | Who signs off on scope, legal and launch? | Avoids late surprises | One product owner plus their legal counsel |
| P21 | Has your legal team reviewed a token programme? | Legal sign-off is on the critical path | Not yet; must happen by week 2 |
| P22 | What do users redeem tokens for: physical goods and services, or digital goods and features unlocked inside the app? | iOS in-app-purchase rules may apply to digital goods | Physical goods and services consumed outside the app |

---

## B. Questions for our BD team

| # | Question | Why it matters | Assumption if unanswered |
|---|---|---|---|
| B1 | What exactly was promised or implied to the partner already? | We cannot plan against expectations we do not know | Nothing beyond the quoted sentence |
| B2 | How important is this partner: revenue, logo, or entry to a new market? | Decides how much custom work we accept | Strategic: worth doing well, must be reusable |
| B3 | What is our commercial model: build fee, revenue share, per-transaction fee? | Affects architecture (metering, multi-tenant) | Platform fee plus per-transaction fee, so metering is needed |
| B4 | Do we have our own chain, token standard, wallet product or preferred vendors? | Our priorities should shape the stack | None; stay chain-neutral, on an EVM layer-2 |
| B5 | Who in our company owns legal and compliance review, and how fast can they turn around? | On the critical path | Available, 1-week turnaround |
| B6 | What engineering capacity do we have for 6 weeks? | Sets what is realistic | Me plus 2 engineers |
| B7 | Are other partners asking for the same thing? | Justifies building a product rather than a project | Yes, at least one |
| B8 | Who talks to the partner day to day: BD or me? | Ownership of the follow-up | BD owns the relationship, I own technical delivery, weekly joint call |

---

## C. Assumptions I proceed on

Each assumption names the risk if it is wrong, so it can be checked first.

| # | Assumption | If wrong |
|---|---|---|
| A1 | **Closed-loop token:** earned only, never bought, sold, transferred or cashed out in v1 | Regulatory review and KYC enter scope; 6 weeks is no longer realistic |
| A2 | **"Pay" means redeeming tokens as a discount**; money payments stay on the partner's existing provider | Accepting the token as payment needs settlement, accounting and likely licensing; phase 2 |
| A3 | **Rewards are funded by the partner** at a fixed rate with a monthly budget cap | Without a cap, reward farming becomes a financial risk |
| A4 | **Launch = capped pilot** (for example 5–10% of users) at week 6, wider rollout after a go/no-go | A full launch needs a security audit that rarely fits in 6 weeks |
| A5 | **Users never see crypto:** wallets are created and held for them; no gas fees, no seed phrases | Self-custody wallets add onboarding friction and support load |
| A6 | **Our ledger is the source of truth** for balances; the chain is the settlement and audit record | If the chain must be the only truth, every user action waits on block confirmation |
| A7 | **EVM layer-2 chain** (for example Base or Polygon) for low fees; design stays chain-neutral | A required non-EVM chain changes contract and tooling |
| A8 | **Partner sends payment and refund webhooks** with a unique event ID | Without unique IDs, preventing duplicate rewards is much harder |
| A9 | **Partner legal sign-off by end of week 2** | The launch date moves |
| A10 | **About 100k MAU, up to 20k reward events per day** | Higher volume changes batching and cost, not the design |
| A11 | **Tokens are redeemed on physical goods or services**, not digital goods unlocked inside the iOS app | App Store in-app-purchase rules may apply; needs an App Store check, with web-first as the fallback |
| A12 | **Refund after a reward was spent:** the refund is never blocked; we claw back what the user still holds and record the shortfall as debt netted against future rewards | If the partner prefers to absorb the loss, the proof changes in one place (decision D11 in `plan.md`) |

## D. What would change the plan most

- **"Users must be able to sell or cash out the token"** (A1 wrong): recommend points-now, token-later, or move the date.
- **"Users pay for goods with the token, and buy it with money"** (A2 wrong): phase 2 with licensing; v1 stays rewards-only.
- **"Full launch to all users in 6 weeks"** (A4 wrong): offer full launch with stricter caps and a kill switch, or a later date with an audit.
