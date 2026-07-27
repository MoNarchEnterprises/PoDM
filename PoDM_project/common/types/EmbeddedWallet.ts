// /common/types/EmbeddedWallet.ts

// ── Wallet Provider Types ──────────────────────────────────────────────

/** Supported embedded wallet providers (extensible for future swaps). */
export type WalletProviderType = 'privy' | 'turnkey' | 'dynamic' | 'custom' | 'none';

/** Lifecycle status of an embedded wallet. */
export type WalletStatus = 'none' | 'creating' | 'active' | 'recovering' | 'error';

/** Information about a user's smart account (ERC-4337). */
export interface SmartAccountInfo {
    /** Counterfactual or deployed smart account address on Base. */
    address: string;
    /** Factory contract used to derive the smart account. */
    factoryAddress: string;
    /** Whether the smart account has been deployed on-chain (vs counterfactual). */
    isDeployed: boolean;
    /** Underlying embedded wallet EOA that owns the smart account. */
    ownerAddress: string;
    /**
     * initCode for the first UserOperation that deploys the smart account.
     * Format: factoryAddress (20 bytes) + factoryData (createAccount calldata).
     * Empty string when the account is already deployed.
     */
    initCode: string;
}

/** Full wallet state returned to the frontend. */
export interface EmbeddedWalletState {
    walletAddress: string | null;
    smartAccountAddress: string | null;
    walletProvider: WalletProviderType;
    walletStatus: WalletStatus;
    usdcBalance: number;
    isReady: boolean;
}

// ── Provider Interface ─────────────────────────────────────────────────

/** Vendor-neutral interface for embedded wallet operations. */
export interface IWalletProvider {
    /** Create a new embedded wallet for a user. Returns the EOA address. */
    createWallet(userId: string): Promise<{ address: string; providerWalletId: string }>;

    /** Retrieve the wallet address for an existing user. Returns null if none. */
    getWallet(userId: string): Promise<{ address: string; providerWalletId: string } | null>;

    /**
     * Sign a UserOperation hash using the user's embedded wallet key.
     * The provider handles passkey/biometric verification internally.
     */
    signUserOperation(userId: string, userOpHash: string): Promise<string>;

    /** Check if the provider is properly configured and reachable. */
    healthCheck(): Promise<boolean>;
}

// ── ERC-4337 UserOperation Types ───────────────────────────────────────

/** Parameters for building a UserOperation. */
export interface UserOperationParams {
    /** Smart account address that will execute the operation. */
    sender: string;
    /** Encoded calldata for the smart account to execute. */
    callData: string;
    /** Target chain ID (8453 = Base Mainnet, 84532 = Base Sepolia). */
    chainId: number;
}

/** A fully constructed ERC-4337 UserOperation (v0.7 expanded format). */
export interface UserOperation {
    sender: string;
    nonce: string;
    initCode: string;
    factory?: string;
    factoryData?: string;
    callData: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymaster?: string | null;
    paymasterVerificationGasLimit?: string | null;
    paymasterPostOpGasLimit?: string | null;
    paymasterData?: string | null;
    signature: string;
}

/** Result of submitting a UserOperation to the bundler. */
export interface UserOperationResult {
    /** UserOperation hash returned by the bundler. */
    userOpHash: string;
    /** Actual on-chain transaction hash (available after mining). */
    transactionHash: string | null;
    /** Whether gas was sponsored by the paymaster. */
    gasSponsored: boolean;
    /** Status of the operation. */
    status: 'pending' | 'confirmed' | 'failed';
}

// ── Bundler Interface ──────────────────────────────────────────────────

/** Vendor-neutral interface for ERC-4337 bundler operations. */
export interface IBundlerService {
    /** Submit a signed UserOperation to the bundler for on-chain execution. */
    sendUserOperation(op: UserOperation, entryPoint: string): Promise<string>;

    /** Retrieve the receipt for a previously submitted UserOperation. */
    getUserOperationReceipt(userOpHash: string): Promise<{
        success: boolean;
        transactionHash: string;
        blockNumber: number;
    } | null>;

    /** Estimate gas limits for a UserOperation. */
    estimateUserOperationGas(op: Partial<UserOperation>, entryPoint: string): Promise<{
        callGasLimit: string;
        verificationGasLimit: string;
        preVerificationGas: string;
    }>;

    /** Get the supported EntryPoint address for this bundler. */
    getEntryPointAddress(): string;

    /** Fetch current gas price fields the bundler will accept for a UserOperation. */
    getUserOperationGasPrice(): Promise<{ maxFeePerGas: string; maxPriorityFeePerGas: string; }>;

    /** Fetch the current EntryPoint nonce for a sender + key. */
    getSenderNonce(sender: string, entryPoint: string, nonceKey?: number): Promise<string>;
}

// ── Paymaster Interface ────────────────────────────────────────────────

/** Vendor-neutral interface for ERC-4337 paymaster (gas sponsorship). */
export interface IPaymasterService {
    /**
     * Request gas sponsorship for a UserOperation.
     * Returns paymaster-specific fields to include in the UserOperation.
     */
    sponsorUserOperation(op: Partial<UserOperation>, entryPoint: string): Promise<{
        paymaster: string;
        paymasterData: string;
        paymasterVerificationGasLimit: string;
        paymasterPostOpGasLimit: string;
        callGasLimit: string;
        verificationGasLimit: string;
        preVerificationGas: string;
    }>;

    /** Check whether a specific operation is eligible for gas sponsorship. */
    isEligibleForSponsorship(amountInCents: number, userId: string): Promise<boolean>;
}

// ── Payment Intent Types ───────────────────────────────────────────────

/** High-level payment intent sent from the frontend (no blockchain details). */
export interface PaymentIntent {
    /** Type of payment. */
    type: 'Tip' | 'Subscription' | 'PPV Post' | 'PPV Message';
    /** Amount in cents (USD). */
    amountInCents: number;
    /** Creator receiving the payment. */
    creatorId: string;
    /** Related entity (tier ID for subscriptions, content ID for PPV). */
    relatedId?: string;
    /** Optional message (tips). */
    message?: string;
}

/** Result returned to the frontend after a payment is processed. */
export interface PaymentIntentResult {
    success: boolean;
    transactionId?: string;
    txHash?: string;
    userOpHash?: string;
    status?: 'Pending' | 'Cleared';
    error?: string;
}

// ── Wallet Event Types ─────────────────────────────────────────────────

/** Events logged to the wallet_events audit table. */
export type WalletEventType =
    | 'WalletCreated'
    | 'SmartAccountDeployed'
    | 'PaymentInitiated'
    | 'PaymentConfirmed'
    | 'PaymentFailed'
    | 'GasSponsored'
    | 'WalletRecoveryStarted'
    | 'WalletRecoveryCompleted';

export interface WalletEvent {
    id: string;
    userId: string;
    event: WalletEventType;
    walletAddress?: string;
    smartAccountAddress?: string;
    transactionHash?: string;
    userOperationHash?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}

// ── Feature Flag Types ─────────────────────────────────────────────────

/** Available feature flag keys for the embedded wallet system. */
export type WalletFeatureFlag =
    | 'embedded_wallet_enabled'        // Master: allow embedded wallet creation
    | 'gas_sponsorship_enabled'        // Allow gas sponsorship via paymaster
    | 'embedded_payment_enabled'       // Allow payments via embedded wallet
    | 'wallet_recovery_enabled'        // Allow wallet recovery flow
    | 'smart_account_enabled';         // Deploy smart accounts (vs EOA-only)

/** Feature flag record stored in the database. */
export interface FeatureFlag {
    id: string;
    key: WalletFeatureFlag | string;
    enabled: boolean;
    rolloutPercentage: number;
    description: string;
    createdAt: string;
    updatedAt: string;
}

/** Per-user feature flag override. */
export interface UserFeatureFlagOverride {
    id: string;
    userId: string;
    flagKey: WalletFeatureFlag | string;
    enabled: boolean;
    reason?: string;
    createdAt: string;
}
