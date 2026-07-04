## C-04: Tipping and PPV Payment Flow

Shows the tipping and pay-per-view (PPV) unlock flows using crypto payments via the PoDMPaymentProtocol smart contract.

```mermaid
sequenceDiagram
    participant F as Frontend (React)
    participant W as Crypto Wallet (browser)
    participant SC as PoDMPaymentProtocol Contract
    participant CPC as Crypto Payment Controller
    participant CPS as Crypto Payment Service
    participant DB as Supabase DB
    participant CS as Content Service

    rect rgb(230, 240, 255)
        Note over F,DB: TIPPING FLOW
        F->>W: payTip(creatorWallet, amount, metadata)
        W->>SC: Signs and broadcasts payTip() transaction
        SC-->>W: txHash
        W-->>F: txHash
        F->>CPC: POST /api/v1/payments/crypto/verify { txHash, paymentType: 'tip' }
        CPC->>CPS: verifyAndRecordBasePayment(paymentInfo)
        CPS->>DB: Transaction recorded
        DB-->>CPS: success
        CPS-->>CPC: Success
        CPC-->>F: Tip confirmed
    end

    rect rgb(240, 255, 230)
        Note over F,CS: PPV FLOW
        F->>SC: payPPV(contentId, creatorWallet, amount)
        SC-->>F: txHash
        F->>CPC: POST /api/v1/payments/crypto/verify { txHash, paymentType: 'ppv' }
        CPC->>CPS: verifyAndRecordBasePayment(paymentInfo)
        CPS->>CPS: Checks paymentType == 'ppv'
        CPS->>CS: contentService.unlockContentForFan(fanId, contentId)
        CS->>DB: INSERT or update unlock record
        DB-->>CS: success
        CS-->>CPS: unlocked
        CPS-->>CPC: Success
        CPC-->>F: PPV unlocked
    end

    Note over F: Frontend also calls dead Stripe endpoints (POST /api/v1/payments/tip and /unlock-post) that return 404
    Note over W: Wallet interaction is mocked in current frontend (useCryptoWallet.ts returns fake txHash)
```

Shows both the tipping flow (wallet transaction to smart contract, verification, confirmation) and the PPV flow (with additional content unlock step). Annotations note the dead Stripe endpoints and the mocked wallet interaction.
