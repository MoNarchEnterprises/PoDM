## C-08: Smart Contract Structure (PoDMPaymentProtocol)

Shows the structure of the PoDMPaymentProtocol Solidity smart contract including properties, external functions, events, the PaymentType enum, and their relationships.

```mermaid
classDiagram
    class PoDMPaymentProtocol {
        - address owner
        - address platformTreasury
        - uint256 platformFeeBps
        + paySubscription(address creator, uint256 amount) external
        + payTip(address creator, uint256 amount) external
        + payPPV(bytes32 contentId, address creator, uint256 amount) external
        + updateTreasury(address newTreasury) external onlyOwner
        + updateFee(uint256 newFeeBps) external onlyOwner
    }

    class Events {
        <<events>>
        + PaymentSent(address indexed from, address indexed to, uint256 amount, PaymentType paymentType)
        + TipSent(address indexed from, address indexed creator, uint256 amount)
        + PPVUnlocked(address indexed from, bytes32 indexed contentId, uint256 amount)
        + TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury)
        + FeeUpdated(uint256 oldFee, uint256 newFee)
    }

    class PaymentType {
        <<enumeration>>
        + Subscription
        + Tip
        + PPV
    }

    PoDMPaymentProtocol --> Events : emits
    PoDMPaymentProtocol --> PaymentType : uses

    note for PoDMPaymentProtocol "Contract uses ERC-20 transferFrom to pull USDC from sender"
    note for PaymentType "PaymentType enum exists in events but is NOT stored on-chain per payment"
    note for PoDMPaymentProtocol "No SubscriptionExpired or SubscriptionCancelled events"
    note for PoDMPaymentProtocol "No pause mechanism for emergency stops"
    note for PoDMPaymentProtocol "Contract is immutable - no upgrade mechanism"
```

Diagrams the contract's storage properties (owner, treasury, fee), 5 external functions (paySubscription, payTip, payPPV, updateTreasury, updateFee), 5 events, and the PaymentType enum. Annotations highlight the lack of on-chain PaymentType storage, missing lifecycle events, absent pause mechanism, and immutability.
