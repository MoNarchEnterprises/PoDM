export interface WalletOwnershipChallengeParams {
    challengeId: string;
    userId: string;
    walletAddress: string;
    nonce: string;
    issuedAt: string;
    expiresAt: string;
}

/**
 * Builds the canonical domain-separated message for cryptographic wallet ownership proof.
 */
export function buildWalletOwnershipChallengeMessage(params: WalletOwnershipChallengeParams): string {
    return [
        'PoDM Wallet Ownership Verification',
        '',
        'Domain: podm.app',
        `User: ${params.userId}`,
        `Wallet: ${params.walletAddress}`,
        `Challenge: ${params.challengeId}`,
        `Nonce: ${params.nonce}`,
        `Issued At: ${params.issuedAt}`,
        `Expires At: ${params.expiresAt}`,
        '',
        'I authorize PoDM to associate this wallet address with my account.'
    ].join('\n');
}

/**
 * Legacy builder kept for backward compatibility if referenced.
 */
export function buildWalletOwnershipMessage(walletAddress: string, userId: string, timestamp = Date.now()): string {
    return `PoDM Wallet Ownership Proof:\nWallet: ${walletAddress}\nUser: ${userId}\nTimestamp: ${timestamp}`;
}
