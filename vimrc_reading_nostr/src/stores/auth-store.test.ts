/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPair } from "#/lib/nostr/keys";
import {
	AUTH_STORAGE_KEY,
	loadAuthFromStorage,
	useAuthStore,
} from "./auth-store";

// Node 25+のbuilt-in localStorageとjsdomの競合を回避するためモックを使用
const mockStorage = new Map<string, string>();
const storageMock = {
	getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
	removeItem: vi.fn((key: string) => mockStorage.delete(key)),
	clear: vi.fn(() => mockStorage.clear()),
};

vi.stubGlobal("localStorage", storageMock);

describe("useAuthStore", () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.clearAllMocks();
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

	it("NIP-07ログイン時にlocalStorageへ保存される", () => {
		const { publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithNip07(publicKey);

		expect(storageMock.setItem).toHaveBeenCalledWith(
			AUTH_STORAGE_KEY,
			expect.any(String),
		);
		const stored = JSON.parse(mockStorage.get(AUTH_STORAGE_KEY) ?? "{}");
		expect(stored.publicKey).toBe(publicKey);
		expect(stored.loginMethod).toBe("nip07");
		expect(stored.secretKey).toBeUndefined();
	});

	it("鍵ペアログイン時にlocalStorageへ保存される", () => {
		const { secretKey, publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithKeys(secretKey, publicKey);

		const stored = JSON.parse(mockStorage.get(AUTH_STORAGE_KEY) ?? "{}");
		expect(stored.publicKey).toBe(publicKey);
		expect(stored.loginMethod).toBe("keys");
		expect(stored.secretKey).toBeDefined();
	});

	it("ログアウト時にlocalStorageがクリアされる", () => {
		const { publicKey } = generateKeyPair();
		useAuthStore.getState().loginWithNip07(publicKey);
		useAuthStore.getState().logout();

		expect(storageMock.removeItem).toHaveBeenCalledWith(AUTH_STORAGE_KEY);
		expect(mockStorage.get(AUTH_STORAGE_KEY)).toBeUndefined();
	});

	it("localStorageからNIP-07ログイン状態を復元できる", () => {
		const { publicKey } = generateKeyPair();
		mockStorage.set(
			AUTH_STORAGE_KEY,
			JSON.stringify({ publicKey, loginMethod: "nip07" }),
		);

		loadAuthFromStorage();

		const state = useAuthStore.getState();
		expect(state.publicKey).toBe(publicKey);
		expect(state.loginMethod).toBe("nip07");
		expect(state.secretKey).toBeNull();
	});

	it("localStorageから鍵ペアログイン状態を復元できる", () => {
		const { secretKey, publicKey } = generateKeyPair();
		const secretKeyHex = Array.from(secretKey)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		mockStorage.set(
			AUTH_STORAGE_KEY,
			JSON.stringify({
				publicKey,
				loginMethod: "keys",
				secretKey: secretKeyHex,
			}),
		);

		loadAuthFromStorage();

		const state = useAuthStore.getState();
		expect(state.publicKey).toBe(publicKey);
		expect(state.loginMethod).toBe("keys");
		expect(state.secretKey).toEqual(secretKey);
	});
});
