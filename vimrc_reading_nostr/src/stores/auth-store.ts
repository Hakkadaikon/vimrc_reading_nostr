import { create } from "zustand";

export type LoginMethod = "keys" | "nip07" | "nsec";

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
	},

	loginWithNip07: (publicKey) => {
		set({ secretKey: null, publicKey, loginMethod: "nip07" });
	},

	loginWithNsec: (secretKey, publicKey) => {
		set({ secretKey, publicKey, loginMethod: "nsec" });
	},

	logout: () => {
		set({ secretKey: null, publicKey: null, loginMethod: null });
	},
}));
