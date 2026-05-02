import { decode, npubEncode, nsecEncode } from "nostr-tools/nip19";
import { generateSecretKey, getPublicKey } from "nostr-tools/pure";

export type KeyPair = {
	secretKey: Uint8Array;
	publicKey: string;
};

export function generateKeyPair(): KeyPair {
	const secretKey = generateSecretKey();
	const publicKey = getPublicKey(secretKey);
	return { secretKey, publicKey };
}

export function publicKeyToNpub(publicKey: string): string {
	return npubEncode(publicKey);
}

export function secretKeyToNsec(secretKey: Uint8Array): string {
	return nsecEncode(secretKey);
}

export function nsecToSecretKey(nsec: string): Uint8Array | null {
	try {
		const decoded = decode(nsec);
		if (decoded.type !== "nsec") {
			return null;
		}
		return decoded.data;
	} catch {
		return null;
	}
}
