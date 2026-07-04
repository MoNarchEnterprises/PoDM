## C-06: Platform Fee Calculation Flow

Shows how the 12.5% platform fee flows from the hardcoded constant through per-transaction calculation, DB recording, treasury accumulation, and eventual payout.

```mermaid
flowchart TD
    Const["DEFAULT_COMMISSION_RATE = 12.5<br/>lib/constants.ts"]
    Transaction["verifyAndRecordBasePayment<br/>cryptoPayment.service.ts"]
    FeeCalc["platformFee = Math.round(amount * 12.5 / 100)"]
    CreatorPayout["creatorPayout = amount - platformFee"]
    DBRecord["INSERT INTO transactions<br/>columns: platform_fee, creator_payout"]
    Treasury["Platform Treasury<br/>Fees implicit in transaction data<br/>No separate treasury table"]
    Payout["Eventual Payout<br/>Platform sends aggregated creatorPayout"]

    EnclaveOverride["Enclave 10% Override<br/>NOT IMPLEMENTED<br/>enclave_applications.status exists but no fee logic"]
    CreatorOverride["Per-Creator Commission Override<br/>NOT IMPLEMENTED<br/>profiles.commission_rate nullable and unused"]

    Const --> Transaction
    Transaction --> FeeCalc
    FeeCalc --> CreatorPayout
    CreatorPayout --> DBRecord
    DBRecord --> Treasury
    Treasury --> Payout

    EnclaveOverride -.->|"future"| FeeCalc
    CreatorOverride -.->|"future"| FeeCalc

    style EnclaveOverride fill:#ffe0e0,stroke:#333,stroke-width:1px
    style CreatorOverride fill:#ffe0e0,stroke:#333,stroke-width:1px
```

Traces the fee lifecycle from the hardcoded 12.5% constant through per-transaction calculation, DB insert, platform treasury (implicit), and eventual aggregated payout. Annotations highlight the unimplemented enclave 10% override and the unused per-creator `commission_rate` column.
