import { describe, expect, it } from "vitest";
import {
	getTodayParticipants,
	getTodayRange,
	isWithinTodayRange,
} from "#/lib/nostr/participants";
import type { NostrMessage } from "#/stores/message-store";

function makeMessage(
	pubkey: string,
	created_at: number,
): NostrMessage {
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

// JST = UTC+9
// 2026-05-03 00:00:00 JST = 2026-05-02 15:00:00 UTC
const JST_TODAY_START = Date.UTC(2026, 4, 2, 15, 0, 0) / 1000;
// 2026-05-04 02:00:00 JST = 2026-05-03 17:00:00 UTC
const JST_TOMORROW_2AM = Date.UTC(2026, 4, 3, 17, 0, 0) / 1000;

describe("isWithinTodayRange", () => {
	it("当日0:00ちょうどの発言は範囲内と判定される", () => {
		expect(isWithinTodayRange(JST_TODAY_START, JST_TODAY_START, JST_TOMORROW_2AM)).toBe(true);
	});

	it("翌日AM2:00ちょうどの発言は範囲外と判定される", () => {
		expect(isWithinTodayRange(JST_TOMORROW_2AM, JST_TODAY_START, JST_TOMORROW_2AM)).toBe(false);
	});

	it("翌日AM1:59の発言は範囲内と判定される", () => {
		const oneMinuteBefore = JST_TOMORROW_2AM - 60;
		expect(isWithinTodayRange(oneMinuteBefore, JST_TODAY_START, JST_TOMORROW_2AM)).toBe(true);
	});

	it("前日23:59の発言は範囲外と判定される", () => {
		const beforeStart = JST_TODAY_START - 60;
		expect(isWithinTodayRange(beforeStart, JST_TODAY_START, JST_TOMORROW_2AM)).toBe(false);
	});
});

describe("getTodayParticipants", () => {
	it("範囲内の発言者のpubkeyをユニークに返す", () => {
		const messages = [
			makeMessage("alice", JST_TODAY_START + 100),
			makeMessage("bob", JST_TODAY_START + 200),
			makeMessage("alice", JST_TODAY_START + 300),
		];
		const result = getTodayParticipants(messages, JST_TODAY_START, JST_TOMORROW_2AM);
		expect(result).toEqual(["alice", "bob"]);
	});

	it("範囲外の発言者は含まれない", () => {
		const messages = [
			makeMessage("alice", JST_TODAY_START + 100),
			makeMessage("bob", JST_TODAY_START - 100), // 範囲外
		];
		const result = getTodayParticipants(messages, JST_TODAY_START, JST_TOMORROW_2AM);
		expect(result).toEqual(["alice"]);
	});

	it("メッセージが空の場合は空配列を返す", () => {
		const result = getTodayParticipants([], JST_TODAY_START, JST_TOMORROW_2AM);
		expect(result).toEqual([]);
	});
});

describe("getTodayRange", () => {
	it("JST 2026-05-03 12:00:00 の場合、当日0:00〜翌日2:00の範囲を返す", () => {
		// 2026-05-03 12:00:00 JST = 2026-05-03 03:00:00 UTC
		const nowUnix = Date.UTC(2026, 4, 3, 3, 0, 0) / 1000;
		const { start, end } = getTodayRange(nowUnix);
		expect(start).toBe(JST_TODAY_START);
		expect(end).toBe(JST_TOMORROW_2AM);
	});

	it("JST 2026-05-04 01:30:00（翌日AM1:30）の場合、前日0:00〜当日2:00の範囲を返す", () => {
		// 2026-05-04 01:30:00 JST = 2026-05-03 16:30:00 UTC
		const nowUnix = Date.UTC(2026, 4, 3, 16, 30, 0) / 1000;
		const { start, end } = getTodayRange(nowUnix);
		// JSTで5/4なので start = 5/4 00:00 JST = 5/3 15:00 UTC
		const expectedStart = Date.UTC(2026, 4, 3, 15, 0, 0) / 1000;
		// end = 5/5 02:00 JST = 5/4 17:00 UTC
		const expectedEnd = Date.UTC(2026, 4, 4, 17, 0, 0) / 1000;
		expect(start).toBe(expectedStart);
		expect(end).toBe(expectedEnd);
	});
});
