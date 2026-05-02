import { describe, expect, it } from "vitest";
import { createReactionEvent } from "./reactions";

describe("createReactionEvent", () => {
	it("kind:7のリアクションイベントを作成する", () => {
		const event = createReactionEvent({
			targetEventId: "event1",
			targetPubkey: "pubkey1",
			content: "+",
		});
		expect(event.kind).toBe(7);
		expect(event.content).toBe("+");
	});

	it("eタグに対象イベントIDが入る", () => {
		const event = createReactionEvent({
			targetEventId: "event1",
			targetPubkey: "pubkey1",
			content: "+",
		});
		const eTag = event.tags.find((t) => t[0] === "e");
		expect(eTag?.[1]).toBe("event1");
	});

	it("pタグに対象ユーザーの公開鍵が入る", () => {
		const event = createReactionEvent({
			targetEventId: "event1",
			targetPubkey: "pubkey1",
			content: "+",
		});
		const pTag = event.tags.find((t) => t[0] === "p");
		expect(pTag?.[1]).toBe("pubkey1");
	});

	it("デフォルトのリアクションは+", () => {
		const event = createReactionEvent({
			targetEventId: "event1",
			targetPubkey: "pubkey1",
		});
		expect(event.content).toBe("+");
	});
});
