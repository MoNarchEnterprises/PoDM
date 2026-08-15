/**
 * Canonical bytes32 encoding used by both browser-wallet calldata and backend
 * receipt verification. IDs that do not fit in 31 UTF-8 bytes are rejected
 * instead of being silently truncated into a different identifier.
 */
export function canonicalPaymentIdentifier(identifier: string): string {
    if (!identifier || typeof identifier !== 'string') {
        throw new Error('Payment identifier is required.');
    }

    const normalized = identifier.replace(/-/g, '');
    if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
        return `0x${normalized.toLowerCase()}`;
    }

    const bytes = new TextEncoder().encode(identifier);
    if (bytes.length > 31) {
        throw new Error('Payment identifier exceeds the 31-byte contract limit.');
    }

    let encoded = '';
    for (const byte of bytes) encoded += byte.toString(16).padStart(2, '0');
    return `0x${encoded.padEnd(64, '0')}`;
}
