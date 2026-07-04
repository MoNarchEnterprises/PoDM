## C-02: Crypto Verification Sequence (11-Step)

Details the 11-step verifyAndRecordBasePayment flow for on-chain crypto payment verification on the Base network, including the critical sandbox bypass vulnerability.

```mermaid
sequenceDiagram
    participant CPC as Crypto Payment Controller
    participant CPS as Crypto Payment Service
    participant ERC as Ethereum JSON-RPC (Base)
    participant DB as Supabase DB

    CPC->>CPS: verifyAndRecordBasePayment(paymentInfo)

    alt txHash starts with 0x0000
        Note over CPS: SANDBOX BYPASS<br/>Skips all on-chain verification<br/>Creates verified transaction directly
    else
        Note over CPS: Step 1: Hash format check<br/>0x followed by 64 hex chars

        Note over CPS: Step 2: Dedup check<br/>Query transactions table for existing txHash

        CPS->>DB: Step 3: Fetch creator's crypto_wallet from profiles
        DB-->>CPS: wallet address

        Note over CPS: Step 4: Network selection by CHAIN_ID env var

        CPS->>ERC: Step 5: eth_getTransactionReceipt(txHash)
        ERC-->>CPS: Transaction receipt { status, to, logs[] }

        Note over CPS: Step 6: Receipt status check<br/>status !== '0x1' -> reject
        Note over CPS: Step 7: Contract address match<br/>receipt.to !== contractAddress -> reject
        Note over CPS: Step 8: Event parsing<br/>logs[0].topics[2] = expected recipient (padded)<br/>decode logs[0].data to extract amount
        Note over CPS: Step 9: Amount match<br/>Compare decoded amount with expectedAmount (1 cent tolerance)
        Note over CPS: Step 10: Fee calculation<br/>platformFee = amount * DEFAULT_COMMISSION_RATE / 100<br/>creatorPayout = amount - platformFee

        CPS->>DB: Step 11: INSERT INTO transactions { txHash, amount, platformFee, creatorPayout, status: 'completed' }
        DB-->>CPS: Transaction record
    end

    CPS-->>CPC: Success with transaction record

    Note over CPS: CRITICAL: Any authenticated user can submit txHash starting with 0x0000<br/>to bypass all on-chain verification and create fake transactions
```

Shows the full verification pipeline from initial call through hash validation, dedup check, RPC receipt verification, event parsing, fee calculation, and DB recording. Annotations highlight the critical sandbox bypass where `0x0000`-prefixed hashes skip all on-chain checks.
