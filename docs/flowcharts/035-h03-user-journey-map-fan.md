## H-03: User Journey Map (Fan)

Journey diagram showing the fan's experience through 8 key milestones with emotional scoring and friction annotations.

```mermaid
journey
    title Fan User Journey
    section Signup
      Signup – Email + password → profile → feed: 3: Fan
    section Browse
      Browse creators – Search or suggested → view profile: 3: Fan
    section Subscribe
      Subscribe – Connect wallet → approve USDC → wait: 1: Fan
    section View Content
      View content – Browse posts → unlock content: 4: Fan
    section Tip
      Tip creator – Select amount → wallet → approve: 2: Fan
    section Message
      Message creator – Open DM → send → real-time: 4: Fan
    section Contest
      Enter contest – View → enter → wait for winner: 3: Fan
    section Refer
      Refer friend – Get code → share → friend signs up: 2: Fan
```

Key friction points: 🔴 **Subscribe** — mocked wallet returns fake txHash, real crypto wallet not integrated; 🔴 **Tip** — dead Stripe endpoints 404, crypto flow is mocked; 🔴 **Refer** — referral bonuses calculated but never paid out; 🟡 **View Content** — watermarking adds load delay, CSS blur is easy to bypass; 🟡 **Message** — no typing indicators, no offline delivery; 🟡 **Contest** — no visibility into winner selection, no audit trail.
