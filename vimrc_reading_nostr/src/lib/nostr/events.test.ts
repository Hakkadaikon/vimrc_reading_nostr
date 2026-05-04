import { describe, expect, it } from "vitest";
import {
	createChannelMessageEvent,
	createDeleteEvent,
	createMetadataEvent,
} from "./events";

describe("createChannelMessageEvent", () => {
	it("kind:42のイベントテンプレートを作成する", () => {
		const event = createChannelMessageEvent({
			content: "Hello vimrc読書会!",
			channelId: "abc123def456",
		});
		expect(event.kind).toBe(42);
		expect(event.content).toBe("Hello vimrc読書会!");
		expect(event.created_at).toBeTypeOf("number");
	});

	it("先頭のeタグにチャンネルIDとrootマーカーが入る", () => {
		const event = createChannelMessageEvent({
			content: "test",
			channelId: "abc123def456",
			relayUrl: "wss://relay.example.com",
		});
		const eTag = event.tags.find((t) => t[0] === "e");
		expect(eTag).toBeDefined();
		expect(eTag?.[1]).toBe("abc123def456");
		expect(eTag?.[2]).toBe("wss://relay.example.com");
		expect(eTag?.[3]).toBe("root");
	});

	it("relayUrlを省略するとeタグの推奨リレーが空文字になる", () => {
		const event = createChannelMessageEvent({
			content: "test",
			channelId: "abc123def456",
		});
		const eTag = event.tags.find((t) => t[0] === "e");
		expect(eTag?.[2]).toBe("");
		expect(eTag?.[3]).toBe("root");
	});
});

describe("createDeleteEvent", () => {
	it("kind:5の削除イベントを作成する", () => {
		const event = createDeleteEvent("target-event-id");
		expect(event.kind).toBe(5);
		const eTag = event.tags.find((t) => t[0] === "e");
		expect(eTag?.[1]).toBe("target-event-id");
	});
});

describe("createMetadataEvent", () => {
	it("kind:0のメタデータイベントを作成する", () => {
		const event = createMetadataEvent({ name: "テストユーザー" });
		expect(event.kind).toBe(0);
		const content = JSON.parse(event.content);
		expect(content.name).toBe("テストユーザー");
	});

	it("tagsは空配列", () => {
		const event = createMetadataEvent({ name: "test" });
		expect(event.tags).toEqual([]);
	});
});
