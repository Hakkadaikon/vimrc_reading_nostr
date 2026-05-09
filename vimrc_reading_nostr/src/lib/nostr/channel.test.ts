import type { Event } from "nostr-tools/core";
import { describe, expect, it } from "vitest";
import {
	CHANNEL_ID,
	createChannelMessageFilter,
	createChannelMetadataFilters,
	parseChannelMetadata,
} from "./channel";

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

describe("createChannelMetadataFilters", () => {
	it("kind:40とkind:41の2つのフィルタを生成する", () => {
		const filters = createChannelMetadataFilters();
		expect(filters).toHaveLength(2);
		expect(filters[0].kinds).toEqual([40]);
		expect(filters[0].ids).toEqual([CHANNEL_ID]);
		expect(filters[1].kinds).toEqual([41]);
		expect(filters[1]["#e"]).toEqual([CHANNEL_ID]);
	});
});

describe("parseChannelMetadata", () => {
	function makeEvent(kind: number, content: string): Event {
		return {
			kind,
			content,
			id: "test",
			pubkey: "test",
			created_at: 1000,
			tags: [],
			sig: "test",
		};
	}

	it("kind:40イベントからメタデータをパースできる", () => {
		const event = makeEvent(
			40,
			JSON.stringify({
				name: "テスト",
				about: "説明",
				picture: "https://example.com/pic.png",
			}),
		);
		const result = parseChannelMetadata(event);
		expect(result).toEqual({
			name: "テスト",
			about: "説明",
			picture: "https://example.com/pic.png",
		});
	});

	it("kind:41イベントからメタデータをパースできる", () => {
		const event = makeEvent(41, JSON.stringify({ name: "更新後" }));
		const result = parseChannelMetadata(event);
		expect(result).toEqual({
			name: "更新後",
			about: undefined,
			picture: undefined,
		});
	});

	it("不正なJSONの場合はnullを返す", () => {
		const event = makeEvent(40, "invalid json{{{");
		expect(parseChannelMetadata(event)).toBeNull();
	});

	it("kind:42の場合はnullを返す", () => {
		const event = makeEvent(42, JSON.stringify({ name: "test" }));
		expect(parseChannelMetadata(event)).toBeNull();
	});
});
