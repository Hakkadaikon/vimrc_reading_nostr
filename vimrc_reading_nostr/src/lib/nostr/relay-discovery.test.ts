import { describe, expect, it } from "vitest";
import { parseRelayListEvent } from "./relay-discovery";

describe("parseRelayListEvent", () => {
	it("kind:10002のタグからリレーURLを抽出する", () => {
		const tags = [
			["r", "wss://relay1.example.com"],
			["r", "wss://relay2.example.com", "read"],
			["r", "wss://relay3.example.com", "write"],
		];
		const relays = parseRelayListEvent(tags);
		// readまたはマーカーなし（read+write）のリレーを返す
		expect(relays).toContain("wss://relay1.example.com");
		expect(relays).toContain("wss://relay2.example.com");
	});

	it("writeのみのリレーは除外する", () => {
		const tags = [
			["r", "wss://write-only.example.com", "write"],
			["r", "wss://readwrite.example.com"],
		];
		const relays = parseRelayListEvent(tags);
		expect(relays).not.toContain("wss://write-only.example.com");
		expect(relays).toContain("wss://readwrite.example.com");
	});

	it("rタグ以外は無視する", () => {
		const tags = [
			["e", "some-event-id"],
			["r", "wss://relay1.example.com"],
			["p", "some-pubkey"],
		];
		const relays = parseRelayListEvent(tags);
		expect(relays).toEqual(["wss://relay1.example.com"]);
	});

	it("空のタグ配列は空配列を返す", () => {
		expect(parseRelayListEvent([])).toEqual([]);
	});
});
