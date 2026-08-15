export function buildWalletOwnershipMessage(walletAddress: string, userId: string, timestamp = Date.now()): string {
    return `PoDM Wallet Ownership Proof:\nWallet: ${walletAddress}\nUser: ${userId}\nTimestamp: ${timestamp}`;
}
