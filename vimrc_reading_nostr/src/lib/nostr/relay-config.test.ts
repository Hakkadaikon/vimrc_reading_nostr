import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RELAY_URLS, getRelayUrls } from "./relay-config";

describe("getRelayUrls", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("環境変数が未設定のときデフォルトのリレーURLを返す", () => {
		vi.stubEnv("VITE_RELAY_URLS", "");
		const urls = getRelayUrls();
		expect(urls).toEqual(DEFAULT_RELAY_URLS);
		expect(urls.length).toBeGreaterThanOrEqual(1);
	});

	it("環境変数にカンマ区切りのURLが設定されているとき、それをパースして返す", () => {
		vi.stubEnv(
			"VITE_RELAY_URLS",
			"wss://relay1.example.com,wss://relay2.example.com",
		);
		const urls = getRelayUrls();
		expect(urls).toEqual([
			"wss://relay1.example.com",
			"wss://relay2.example.com",
		]);
	});

	it("環境変数のURLの前後の空白を除去する", () => {
		vi.stubEnv(
			"VITE_RELAY_URLS",
			"  wss://relay1.example.com , wss://relay2.example.com  ",
		);
		const urls = getRelayUrls();
		expect(urls).toEqual([
			"wss://relay1.example.com",
			"wss://relay2.example.com",
		]);
	});

	it("空文字列のエントリを除外する", () => {
		vi.stubEnv("VITE_RELAY_URLS", "wss://relay1.example.com,,");
		const urls = getRelayUrls();
		expect(urls).toEqual(["wss://relay1.example.com"]);
	});
});
