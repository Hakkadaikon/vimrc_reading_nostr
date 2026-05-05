import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileStore } from "./profile-store";

describe("useProfileStore", () => {
	beforeEach(() => {
		useProfileStore.getState().clearProfiles();
	});

	it("初期状態ではプロフィールが空", () => {
		expect(useProfileStore.getState().profiles).toEqual({});
	});

	it("プロフィールを設定できる", () => {
		useProfileStore.getState().setProfile("pubkey1", {
			name: "Alice",
			picture: "https://example.com/alice.png",
			about: "Hello",
		});
		const profile = useProfileStore.getState().getProfile("pubkey1");
		expect(profile?.name).toBe("Alice");
		expect(profile?.picture).toBe("https://example.com/alice.png");
	});

	it("存在しないプロフィールはundefinedを返す", () => {
		const profile = useProfileStore.getState().getProfile("unknown");
		expect(profile).toBeUndefined();
	});

	it("表示名を取得できる（nameがあればname、なければpubkey短縮）", () => {
		useProfileStore.getState().setProfile("pubkey1", { name: "Alice" });
		expect(useProfileStore.getState().getDisplayName("pubkey1")).toBe("Alice");
	});

	it("nameがないときはpubkeyの短縮を返す", () => {
		useProfileStore.getState().setProfile("a".repeat(64), {});
		const displayName = useProfileStore
			.getState()
			.getDisplayName("a".repeat(64));
		expect(displayName.length).toBeLessThan(64);
	});

	it("未取得のpubkeyをneedsFetch判定できる", () => {
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(true);
	});

	it("取得リクエスト済みのpubkeyはneedsFetchがfalse", () => {
		useProfileStore.getState().markRequested("pubkey1");
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(false);
	});

	it("プロフィール設定済みのpubkeyもneedsFetchがfalse", () => {
		useProfileStore.getState().setProfile("pubkey1", { name: "Alice" });
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(false);
	});

	it("clearProfilesで取得済みフラグもクリアされる", () => {
		useProfileStore.getState().markRequested("pubkey1");
		useProfileStore.getState().clearProfiles();
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(true);
	});

	it("リクエスト後30秒経過するとneedsFetchがtrueに戻る（TTL）", () => {
		vi.useFakeTimers();
		useProfileStore.getState().markRequested("pubkey1");
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(false);

		vi.advanceTimersByTime(31_000);
		expect(useProfileStore.getState().needsFetch("pubkey1")).toBe(true);
		vi.useRealTimers();
	});
});
