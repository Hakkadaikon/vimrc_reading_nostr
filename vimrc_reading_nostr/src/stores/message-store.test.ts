import { beforeEach, describe, expect, it } from "vitest";
import { useMessageStore } from "./message-store";

const makeEvent = (id: string, content: string, created_at: number) => ({
	id,
	pubkey: "pubkey1",
	kind: 42 as const,
	content,
	created_at,
	tags: [["e", "channel-id", "", "root"]],
	sig: "sig",
});

describe("useMessageStore", () => {
	beforeEach(() => {
		useMessageStore.getState().clearMessages();
	});

	it("初期状態ではメッセージが空", () => {
		expect(useMessageStore.getState().messages).toEqual([]);
	});

	it("メッセージを追加できる", () => {
		const event = makeEvent("id1", "Hello", 1000);
		useMessageStore.getState().addMessage(event);
		expect(useMessageStore.getState().messages).toHaveLength(1);
		expect(useMessageStore.getState().messages[0].content).toBe("Hello");
	});

	it("メッセージはcreated_atの昇順でソートされる", () => {
		useMessageStore.getState().addMessage(makeEvent("id2", "Second", 2000));
		useMessageStore.getState().addMessage(makeEvent("id1", "First", 1000));
		useMessageStore.getState().addMessage(makeEvent("id3", "Third", 3000));

		const messages = useMessageStore.getState().messages;
		expect(messages[0].content).toBe("First");
		expect(messages[1].content).toBe("Second");
		expect(messages[2].content).toBe("Third");
	});

	it("同じIDのメッセージは重複追加されない", () => {
		const event = makeEvent("id1", "Hello", 1000);
		useMessageStore.getState().addMessage(event);
		useMessageStore.getState().addMessage(event);
		expect(useMessageStore.getState().messages).toHaveLength(1);
	});

	it("一括追加できる", () => {
		const events = [
			makeEvent("id1", "First", 1000),
			makeEvent("id2", "Second", 2000),
		];
		useMessageStore.getState().addMessages(events);
		expect(useMessageStore.getState().messages).toHaveLength(2);
	});

	it("clearMessagesで全メッセージを削除できる", () => {
		useMessageStore.getState().addMessage(makeEvent("id1", "Hello", 1000));
		useMessageStore.getState().clearMessages();
		expect(useMessageStore.getState().messages).toEqual([]);
	});

	it("メッセージを論理削除できる", () => {
		useMessageStore.getState().addMessage(makeEvent("id1", "Hello", 1000));
		useMessageStore.getState().deleteMessage("id1");
		expect(useMessageStore.getState().deletedIds.has("id1")).toBe(true);
		// メッセージ自体は残る（UIで「削除されました」表示に使う）
		expect(useMessageStore.getState().messages).toHaveLength(1);
	});

	it("clearMessagesで削除IDもクリアされる", () => {
		useMessageStore.getState().deleteMessage("id1");
		useMessageStore.getState().clearMessages();
		expect(useMessageStore.getState().deletedIds.size).toBe(0);
	});
});
