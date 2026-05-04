import { describe, expect, it } from "vitest";
import {
	getTodayParticipants,
	getTodayRange,
	isWithinTodayRange,
} from "#/lib/nostr/participants";
import type { NostrMessage } from "#/stores/message-store";

function makeMessage(pubkey: string, created_at: number): NostrMessage {
	return {
		id: `id-${pubkey}-${created_at}`,
		pubkey,
		kind: 42,
		content: "test",
		created_at,
		tags: [],
		sig: "sig",
	};
}

// JST = UTC+9, AM5:00切り替え
// 2026-05-03 05:00:00 JST = 2026-05-02 20:00:00 UTC
const RANGE_START = Date.UTC(2026, 4, 2, 20, 0, 0) / 1000;
// 2026-05-04 05:00:00 JST = 2026-05-03 20:00:00 UTC
const RANGE_END = Date.UTC(2026, 4, 3, 20, 0, 0) / 1000;

describe("isWithinTodayRange", () => {
	it("当日AM5:00ちょうどの発言は範囲内と判定される", () => {
		expect(isWithinTodayRange(RANGE_START, RANGE_START, RANGE_END)).toBe(true);
	});

	it("翌日AM5:00ちょうどの発言は範囲外と判定される", () => {
		expect(isWithinTodayRange(RANGE_END, RANGE_START, RANGE_END)).toBe(false);
	});

	it("翌日AM4:59の発言は範囲内と判定される", () => {
		const oneMinuteBefore = RANGE_END - 60;
		expect(isWithinTodayRange(oneMinuteBefore, RANGE_START, RANGE_END)).toBe(
			true,
		);
	});

	it("当日AM4:59の発言は範囲外と判定される", () => {
		const beforeStart = RANGE_START - 60;
		expect(isWithinTodayRange(beforeStart, RANGE_START, RANGE_END)).toBe(false);
	});
});

describe("getTodayParticipants", () => {
	it("範囲内の発言者のpubkeyをユニークに返す", () => {
		const messages = [
			makeMessage("alice", RANGE_START + 100),
			makeMessage("bob", RANGE_START + 200),
			makeMessage("alice", RANGE_START + 300),
		];
		const result = getTodayParticipants(messages, RANGE_START, RANGE_END);
		expect(result).toEqual(["alice", "bob"]);
	});

	it("範囲外の発言者は含まれない", () => {
		const messages = [
			makeMessage("alice", RANGE_START + 100),
			makeMessage("bob", RANGE_START - 100), // 範囲外
		];
		const result = getTodayParticipants(messages, RANGE_START, RANGE_END);
		expect(result).toEqual(["alice"]);
	});

	it("メッセージが空の場合は空配列を返す", () => {
		const result = getTodayParticipants([], RANGE_START, RANGE_END);
		expect(result).toEqual([]);
	});
});

describe("getTodayRange", () => {
	it("JST 2026-05-03 12:00:00 の場合、当日5:00〜翌日5:00の範囲を返す", () => {
		// 2026-05-03 12:00:00 JST = 2026-05-03 03:00:00 UTC
		const nowUnix = Date.UTC(2026, 4, 3, 3, 0, 0) / 1000;
		const { start, end } = getTodayRange(nowUnix);
		expect(start).toBe(RANGE_START);
		expect(end).toBe(RANGE_END);
	});

	it("JST 2026-05-04 04:30:00（翌日AM4:30）は前日の範囲に含まれる", () => {
		// 2026-05-04 04:30:00 JST = 2026-05-03 19:30:00 UTC
		const nowUnix = Date.UTC(2026, 4, 3, 19, 30, 0) / 1000;
		const { start, end } = getTodayRange(nowUnix);
		// まだAM5:00前なので5/3の範囲
		expect(start).toBe(RANGE_START);
		expect(end).toBe(RANGE_END);
	});

	it("JST 2026-05-04 05:00:00 は翌日の範囲に切り替わる", () => {
		// 2026-05-04 05:00:00 JST = 2026-05-03 20:00:00 UTC
		const nowUnix = Date.UTC(2026, 4, 3, 20, 0, 0) / 1000;
		const { start, end } = getTodayRange(nowUnix);
		// 5/4 05:00 JST〜5/5 05:00 JST
		const expectedStart = Date.UTC(2026, 4, 3, 20, 0, 0) / 1000;
		const expectedEnd = Date.UTC(2026, 4, 4, 20, 0, 0) / 1000;
		expect(start).toBe(expectedStart);
		expect(end).toBe(expectedEnd);
	});
});
