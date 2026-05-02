import { finalizeEvent } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import {
	createChannelMessageEvent,
	createDeleteEvent,
	createEditedMessageEvent,
	verifyEvent,
} from "./events";
import { generateKeyPair } from "./keys";

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

describe("createEditedMessageEvent", () => {
	it("編集メッセージはkind:42で元メッセージIDをeタグに含む", () => {
		const event = createEditedMessageEvent({
			content: "edited content",
			channelId: "channel1",
			originalEventId: "original1",
		});
		expect(event.kind).toBe(42);
		expect(event.content).toBe("edited content");
		const eTags = event.tags.filter((t) => t[0] === "e");
		expect(eTags).toHaveLength(2);
		// 先頭eタグはチャンネルID
		expect(eTags[0][1]).toBe("channel1");
		expect(eTags[0][3]).toBe("root");
		// 2つ目は元メッセージへの参照
		expect(eTags[1][1]).toBe("original1");
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

describe("verifyEvent", () => {
	it("正しく署名されたイベントを検証できる", () => {
		const { secretKey } = generateKeyPair();
		const template = createChannelMessageEvent({
			content: "test message",
			channelId: "abc123",
		});
		const signedEvent = finalizeEvent(template, secretKey);
		expect(verifyEvent(signedEvent)).toBe(true);
	});
});
