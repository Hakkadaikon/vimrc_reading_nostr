import { describe, expect, it } from "vitest";
import { decodeNevent, encodeNevent, shortenNpub } from "./nip19";

describe("encodeNevent", () => {
	it("イベントIDからnevent文字列を生成する", () => {
		const eventId = "a".repeat(64);
		const nevent = encodeNevent(eventId);
		expect(nevent).toMatch(/^nevent1/);
	});

	it("リレーURLを含められる", () => {
		const eventId = "a".repeat(64);
		const nevent = encodeNevent(eventId, ["wss://relay.example.com"]);
		expect(nevent).toMatch(/^nevent1/);
	});
});

describe("decodeNevent", () => {
	it("nevent文字列をイベントIDにデコードする", () => {
		const eventId = "a".repeat(64);
		const nevent = encodeNevent(eventId);
		const decoded = decodeNevent(nevent);
		expect(decoded?.id).toBe(eventId);
	});

	it("不正なneventを渡すとnullを返す", () => {
		const decoded = decodeNevent("invalid");
		expect(decoded).toBeNull();
	});
});

describe("shortenNpub", () => {
	it("npubを短縮表示する", () => {
		const npub = "npub1" + "a".repeat(58);
		const shortened = shortenNpub(npub);
		expect(shortened).toMatch(/^npub1.+\.\.\..+$/);
		expect(shortened.length).toBeLessThan(npub.length);
	});
});
