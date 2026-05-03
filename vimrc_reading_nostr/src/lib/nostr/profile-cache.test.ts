import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearProfileCache,
	getCachedProfile,
	getCachedRelayList,
	setCachedProfile,
	setCachedRelayList,
} from "./profile-cache";

// jsdomのlocalStorageがstorage APIを完全に実装していないため、
// テスト用のモックStorageを使う
const store = new Map<string, string>();
const mockStorage: Storage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => {
		store.set(key, value);
	},
	removeItem: (key: string) => {
		store.delete(key);
	},
	clear: () => {
		store.clear();
	},
	get length() {
		return store.size;
	},
	key: (index: number) => {
		const keys = [...store.keys()];
		return keys[index] ?? null;
	},
};

describe("profile-cache", () => {
	beforeEach(() => {
		store.clear();
		vi.stubGlobal("window", { localStorage: mockStorage });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("setCachedProfile / getCachedProfile", () => {
		it("プロフィールをlocalStorageに保存・読み込みできる", () => {
			setCachedProfile("pubkey1", {
				name: "Alice",
				picture: "https://example.com/alice.png",
			});
			const cached = getCachedProfile("pubkey1");
			expect(cached?.name).toBe("Alice");
			expect(cached?.picture).toBe("https://example.com/alice.png");
		});

		it("存在しないpubkeyはnullを返す", () => {
			expect(getCachedProfile("unknown")).toBeNull();
		});
	});

	describe("setCachedRelayList / getCachedRelayList", () => {
		it("リレーリストをlocalStorageに保存・読み込みできる", () => {
			setCachedRelayList("pubkey1", [
				"wss://relay1.example.com",
				"wss://relay2.example.com",
			]);
			const cached = getCachedRelayList("pubkey1");
			expect(cached).toEqual([
				"wss://relay1.example.com",
				"wss://relay2.example.com",
			]);
		});

		it("存在しないpubkeyはnullを返す", () => {
			expect(getCachedRelayList("unknown")).toBeNull();
		});
	});

	describe("clearProfileCache", () => {
		it("全キャッシュをクリアする", () => {
			setCachedProfile("pubkey1", { name: "Alice" });
			setCachedRelayList("pubkey1", ["wss://relay1.example.com"]);
			clearProfileCache();
			expect(getCachedProfile("pubkey1")).toBeNull();
			expect(getCachedRelayList("pubkey1")).toBeNull();
		});

		it("nostr_以外のlocalStorageキーは削除しない", () => {
			store.set("theme", "dark");
			setCachedProfile("pubkey1", { name: "Alice" });
			clearProfileCache();
			expect(store.get("theme")).toBe("dark");
		});
	});
});
