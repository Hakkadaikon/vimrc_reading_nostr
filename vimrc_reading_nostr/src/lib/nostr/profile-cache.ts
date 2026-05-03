import type { UserProfile } from "#/stores/profile-store";

const PROFILE_PREFIX = "nostr_profile_";
const RELAY_LIST_PREFIX = "nostr_relaylist_";

function getStorage(): Storage | null {
	try {
		return typeof window !== "undefined" ? window.localStorage : null;
	} catch {
		return null;
	}
}

export function setCachedProfile(pubkey: string, profile: UserProfile): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.setItem(`${PROFILE_PREFIX}${pubkey}`, JSON.stringify(profile));
	} catch {
		// storage full
	}
}

export function getCachedProfile(pubkey: string): UserProfile | null {
	const storage = getStorage();
	if (!storage) return null;
	try {
		const raw = storage.getItem(`${PROFILE_PREFIX}${pubkey}`);
		if (!raw) return null;
		return JSON.parse(raw) as UserProfile;
	} catch {
		return null;
	}
}

export function setCachedRelayList(pubkey: string, relays: string[]): void {
	const storage = getStorage();
	if (!storage) return;
	try {
		storage.setItem(`${RELAY_LIST_PREFIX}${pubkey}`, JSON.stringify(relays));
	} catch {
		// storage full
	}
}

export function getCachedRelayList(pubkey: string): string[] | null {
	const storage = getStorage();
	if (!storage) return null;
	try {
		const raw = storage.getItem(`${RELAY_LIST_PREFIX}${pubkey}`);
		if (!raw) return null;
		return JSON.parse(raw) as string[];
	} catch {
		return null;
	}
}

function isCacheKey(key: string): boolean {
	return key.startsWith(PROFILE_PREFIX) || key.startsWith(RELAY_LIST_PREFIX);
}

export function getCacheEntryCount(): number {
	const storage = getStorage();
	if (!storage) return 0;
	let count = 0;
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key && isCacheKey(key)) {
			count++;
		}
	}
	return count;
}

export function clearProfileCache(): void {
	const storage = getStorage();
	if (!storage) return;
	const keysToRemove: string[] = [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key && isCacheKey(key)) {
			keysToRemove.push(key);
		}
	}
	for (const key of keysToRemove) {
		storage.removeItem(key);
	}
}
