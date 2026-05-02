import { beforeEach, describe, expect, it } from "vitest";
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

	it("表示名を取得できる（nameがあればname、なければnpub短縮）", () => {
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
});
