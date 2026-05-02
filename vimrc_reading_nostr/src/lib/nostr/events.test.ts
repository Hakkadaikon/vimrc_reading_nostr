import { finalizeEvent } from "nostr-tools/pure";
import { describe, expect, it } from "vitest";
import { createChannelMessageEvent, verifyEvent } from "./events";
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
