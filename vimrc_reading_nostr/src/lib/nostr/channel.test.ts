import { describe, expect, it } from "vitest";
import { CHANNEL_ID, createChannelMessageFilter } from "./channel";

describe("CHANNEL_ID", () => {
	it("チャンネルIDが設定されている", () => {
		expect(CHANNEL_ID).toBeTypeOf("string");
		expect(CHANNEL_ID.length).toBeGreaterThan(0);
	});
});

describe("createChannelMessageFilter", () => {
	it("kind:42のフィルタを生成する", () => {
		const filter = createChannelMessageFilter();
		expect(filter.kinds).toEqual([42]);
	});

	it("チャンネルIDでeタグフィルタをかける", () => {
		const filter = createChannelMessageFilter();
		expect(filter["#e"]).toEqual([CHANNEL_ID]);
	});

	it("limitを指定できる", () => {
		const filter = createChannelMessageFilter({ limit: 50 });
		expect(filter.limit).toBe(50);
	});

	it("sinceを指定できる", () => {
		const since = Math.floor(Date.now() / 1000) - 3600;
		const filter = createChannelMessageFilter({ since });
		expect(filter.since).toBe(since);
	});
});
