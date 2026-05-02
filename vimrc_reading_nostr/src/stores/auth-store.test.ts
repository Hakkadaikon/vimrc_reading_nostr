import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPair, secretKeyToNsec } from "#/lib/nostr/keys";
import { useAuthStore } from "./auth-store";

describe("useAuthStore", () => {
	beforeEach(() => {
		useAuthStore.setState({
			publicKey: null,
			secretKey: null,
			loginMethod: null,
		});
	});

	it("初期状態は未ログイン", () => {
		const state = useAuthStore.getState();
		expect(state.publicKey).toBeNull();
		expect(state.secretKey).toBeNull();
		expect(state.loginMethod).toBeNull();
		expect(state.isLoggedIn()).toBe(false);
	});

	it("鍵ペアでログインできる", () => {
		const { secretKey, publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithKeys(secretKey, publicKey);

		const state = useAuthStore.getState();
		expect(state.publicKey).toBe(publicKey);
		expect(state.secretKey).toEqual(secretKey);
		expect(state.loginMethod).toBe("keys");
		expect(state.isLoggedIn()).toBe(true);
	});

	it("ログアウトすると状態がクリアされる", () => {
		const { secretKey, publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithKeys(secretKey, publicKey);
		useAuthStore.getState().logout();

		const state = useAuthStore.getState();
		expect(state.publicKey).toBeNull();
		expect(state.secretKey).toBeNull();
		expect(state.loginMethod).toBeNull();
	});

	it("NIP-07で公開鍵のみでログインできる", () => {
		const { publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithNip07(publicKey);

		const state = useAuthStore.getState();
		expect(state.publicKey).toBe(publicKey);
		expect(state.secretKey).toBeNull();
		expect(state.loginMethod).toBe("nip07");
		expect(state.isLoggedIn()).toBe(true);
	});
});
