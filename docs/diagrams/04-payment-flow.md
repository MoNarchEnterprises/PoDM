# Payment Processing Flow

> Phase 7 — Diagram Generation
> Generated: 2026-07-02

```mermaid
sequenceDiagram
  participant F as Frontend
  participant B as Backend API
  participant S as Stripe
  participant D as Database

  Note over F,D: STRIPE TIP / PPV UNLOCK FLOW

  F->>F: Step 1: Show payment form (or saved card)
  F->>F: Step 2: Submit
  alt No saved card
    F->>F: stripe.createPaymentMethod(CardElement)
  end
  F->>B: POST unlockPost(contentId, paymentMethodId)
  B->>S: stripe.paymentIntents.create({ amount, currency, paymentMethod, confirm: true })
  S-->>B: { clientSecret, status, id }
  B-->>F: { clientSecret, status, paymentIntentId }

  alt Requires 3D Secure / SCA
    F->>F: stripe.confirmCardPayment(paymentIntentId)
    F->>B: POST confirmTransaction(paymentIntentId)
    B->>D: Update transaction status to completed
    D-->>B: updated
    B-->>F: { success }
  else Immediate confirmation
    F->>B: POST confirmTransaction(paymentIntentId)
    B->>D: Mark as completed
    D-->>B: updated
    B-->>F: { success }
  end

  F->>F: Step 3: Show success

  Note over F,D: CRYPTO SUBSCRIPTION FLOW

  participant W as Wallet (MetaMask)
  participant R as RPC Node
  participant C as Smart Contract

  F->>W: Connect wallet
  W-->>F: walletAddress
  F->>W: approve USDC spend
  W-->>F: tx hash
  F->>W: contract.paySubscription(token, creator, amount, tierIdHash)
  W->>C: transferFrom(fan, platform, fee)
  W->>C: transferFrom(fan, creator, creatorAmount)
  C-->>W: emit SubscriptionPaid
  W-->>F: txHash

  F->>B: POST /verify { txHash, creatorId, amount, type }
  B->>R: eth_getTransactionReceipt(txHash)
  R-->>B: receipt
  B->>B: Verify status==0x1, to==contract, topics[2]==creator, data==amount
  B->>D: Create transaction + subscription record
  D-->>B: created
  B-->>F: { success }
```

> **See also:** `docs/flowcharts/009-c04-tipping-and-ppv-payment-flow.md` — crypto path (USDC smart contract) for parallel payment method.
