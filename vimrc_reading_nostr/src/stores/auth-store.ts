import { bytesToHex, hexToBytes } from "nostr-tools/utils";
import { create } from "zustand";

export type LoginMethod = "keys" | "nip07" | "nsec";

export const AUTH_STORAGE_KEY = "nostr_auth";

type StoredAuth = {
	publicKey: string;
	loginMethod: LoginMethod;
	secretKey?: string;
};

function saveToStorage(
	publicKey: string,
	loginMethod: LoginMethod,
	secretKey: Uint8Array | null,
): void {
	if (typeof window === "undefined") return;
	const data: StoredAuth = { publicKey, loginMethod };
	if (secretKey) {
		data.secretKey = bytesToHex(secretKey);
	}
	window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

function clearStorage(): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function loadAuthFromStorage(): void {
	if (typeof window === "undefined") return;
	try {
		const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) return;
		const data: StoredAuth = JSON.parse(raw);
		if (!data.publicKey || !data.loginMethod) return;

		const secretKey = data.secretKey ? hexToBytes(data.secretKey) : null;
		useAuthStore.setState({
			publicKey: data.publicKey,
			loginMethod: data.loginMethod,
			secretKey,
		});
	} catch {
		clearStorage();
	}
}

type AuthState = {
	publicKey: string | null;
	secretKey: Uint8Array | null;
	loginMethod: LoginMethod | null;
	isLoggedIn: () => boolean;
	loginWithKeys: (secretKey: Uint8Array, publicKey: string) => void;
	loginWithNip07: (publicKey: string) => void;
	loginWithNsec: (secretKey: Uint8Array, publicKey: string) => void;
	logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
	publicKey: null,
	secretKey: null,
	loginMethod: null,

	isLoggedIn: () => get().publicKey !== null,

	loginWithKeys: (secretKey, publicKey) => {
		set({ secretKey, publicKey, loginMethod: "keys" });
		saveToStorage(publicKey, "keys", secretKey);
	},

	loginWithNip07: (publicKey) => {
		set({ secretKey: null, publicKey, loginMethod: "nip07" });
		saveToStorage(publicKey, "nip07", null);
	},

	loginWithNsec: (secretKey, publicKey) => {
		set({ secretKey, publicKey, loginMethod: "nsec" });
		saveToStorage(publicKey, "nsec", secretKey);
	},

	logout: () => {
		set({ secretKey: null, publicKey: null, loginMethod: null });
		clearStorage();
	},
}));
