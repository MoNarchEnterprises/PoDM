# Multi-Chain Payment Splitter Protocol Checklist

- `[x]` Create Solidity payment splitter contract `PoDMPaymentProtocol.sol` inside the backend contracts folder
- `[x]` Update backend `cryptoPayment.service.ts` to audit custom Solidity logs (`SubscriptionPaid`, `TipPaid`, `PPVPaid`) and route dynamically based on preferred creator network
- `[x]` Modify frontend settings (`WalletSettings.tsx`) to allow creators to choose Base (default), Monad, or MegaETH as payout networks
- `[x]` Refactor frontend checkout (`SubscriptionModal.tsx`) to check preferred network and trigger transient MetaMask/wallet network switch popups
- `[x]` Verify backend TypeScript compiles (`tsc`)
- `[x]` Verify frontend React client compiles (`npm run build`)
