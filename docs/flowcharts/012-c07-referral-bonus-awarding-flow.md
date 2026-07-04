## C-07: Referral Bonus Awarding Flow

Shows the full referral bonus lifecycle from code generation through signup validation, bonus awarding, and milestone checks.

```mermaid
flowchart TD
    subgraph CodeGen["1. Code Generation"]
        direction TB
        RefModel["referral.model.ts generates code<br/>{USERNAME}-CASH or {USERNAME}-PERCENT"]
        CashType["Cash type: fixed bonus per referred spender"]
        PercentType["Percent type: % of referred user's spending"]
        UsesCount["uses_count column tracks redemption count"]
    end

    subgraph SignupVal["2. Signup Validation"]
        direction TB
        NewUser["New user submits referral code during signup"]
        AuthService["auth.service.ts validates code exists and is active"]
        TrackUse["referral.model.ts:trackReferralUse(code)<br/>increments uses_count"]
    end

    subgraph BonusAward["3. Bonus Awarding (async)"]
        direction TB
        PaymentCheck["Referred user makes a payment"]
        AwardFunc["awardReferralBonus(referralCode, referredUserId, paymentAmount)"]
        CashBonus["Cash: bonus = fixedAmount"]
        PercentBonus["Percent: bonus = paymentAmount * percentRate / 100"]
    end

    subgraph Milestone["4. Milestone Check"]
        direction TB
        EarningsCheck["Did referrer reach $750 total earnings?"]
        WindowCheck["Is the 30-day window since first referral still open?"]
        SpeedBonus["Is the $25 speed bonus applicable?<br/>(first referral within 7 days)"]
    end

    RefModel --> CashType
    RefModel --> PercentType
    RefModel --> UsesCount
    NewUser --> AuthService
    AuthService --> TrackUse
    PaymentCheck --> AwardFunc
    AwardFunc --> CashBonus
    AwardFunc --> PercentBonus
    CashBonus --> Milestone
    PercentBonus --> Milestone
    Milestone --> EarningsCheck
    Milestone --> WindowCheck
    Milestone --> SpeedBonus

    Note1["No actual payout mechanism - bonuses calculated and logged but never disbursed"]
    Note2["2 unprotected referral routes at /api/v1/referrals - missing protect middleware"]
    Note3["PII in codes: username embedded directly in referral code string"]
```

Covers the 4 stages: code generation with cash/percent types and usage tracking, signup validation, async bonus awarding when referred users pay, and milestone checks for earnings thresholds and speed bonuses. Annotations highlight the missing payout mechanism, unprotected routes, and embedded PII.
