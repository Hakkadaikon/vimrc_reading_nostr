/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMessageStore } from "./message-store";

// Node 25+のbuilt-in localStorageとjsdomの競合を回避するためモックを使用
const mockStorage = new Map<string, string>();
const storageMock = {
	getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
	removeItem: vi.fn((key: string) => mockStorage.delete(key)),
	clear: vi.fn(() => mockStorage.clear()),
};

vi.stubGlobal("localStorage", storageMock);
// saveToLocalStorageのrequestIdleCallbackを同期実行にモック
vi.stubGlobal("requestIdleCallback", (cb: () => void) => cb());

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
		mockStorage.clear();
		vi.clearAllMocks();
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

describe("localStorage キャッシュ", () => {
	const STORAGE_KEY = "vimrc_reading_nostr_messages";

	beforeEach(() => {
		useMessageStore.getState().clearMessages();
		useMessageStore.getState().setInitialLoading(true);
		mockStorage.clear();
		vi.clearAllMocks();
	});

	it("saveToLocalStorageで現在のメッセージをlocalStorageに保存できる", () => {
		useMessageStore.getState().addMessage(makeEvent("id1", "Hello", 1000));
		useMessageStore.getState().addMessage(makeEvent("id2", "World", 2000));
		useMessageStore.getState().saveToLocalStorage();

		const stored = JSON.parse(mockStorage.get(STORAGE_KEY) as string);
		expect(stored).toHaveLength(2);
		expect(stored[0].content).toBe("Hello");
		expect(stored[1].content).toBe("World");
	});

	it("loadFromLocalStorageでlocalStorageからメッセージを復元できる", () => {
		const events = [
			makeEvent("id1", "Cached1", 1000),
			makeEvent("id2", "Cached2", 2000),
		];
		mockStorage.set(STORAGE_KEY, JSON.stringify(events));

		useMessageStore.getState().loadFromLocalStorage();
		const messages = useMessageStore.getState().messages;
		expect(messages).toHaveLength(2);
		expect(messages[0].content).toBe("Cached1");
		expect(messages[1].content).toBe("Cached2");
	});

	it("localStorageが空の場合loadFromLocalStorageは何もしない", () => {
		useMessageStore.getState().loadFromLocalStorage();
		expect(useMessageStore.getState().messages).toEqual([]);
	});

	it("localStorageのデータが壊れている場合loadFromLocalStorageは何もしない", () => {
		mockStorage.set(STORAGE_KEY, "invalid json{{{");
		useMessageStore.getState().loadFromLocalStorage();
		expect(useMessageStore.getState().messages).toEqual([]);
	});

	it("初期状態ではisInitialLoadingがtrueである", () => {
		expect(useMessageStore.getState().isInitialLoading).toBe(true);
	});

	it("setInitialLoadingでロード状態を変更できる", () => {
		useMessageStore.getState().setInitialLoading(false);
		expect(useMessageStore.getState().isInitialLoading).toBe(false);
	});

	it("loadOlderFromLocalStorageでuntil以前の未取得メッセージを返す", () => {
		const events = [
			makeEvent("id1", "Old1", 1000),
			makeEvent("id2", "Old2", 2000),
			makeEvent("id3", "Recent", 3000),
		];
		mockStorage.set(STORAGE_KEY, JSON.stringify(events));

		// id3は既にストアにあるとする
		useMessageStore.getState().addMessage(makeEvent("id3", "Recent", 3000));

		const older = useMessageStore.getState().loadOlderFromLocalStorage(3000);
		expect(older).toHaveLength(2);
		// 新しい順に返される
		expect(older[0].content).toBe("Old2");
		expect(older[1].content).toBe("Old1");
	});

	it("loadOlderFromLocalStorageはlocalStorageが空なら空配列を返す", () => {
		const older = useMessageStore.getState().loadOlderFromLocalStorage(3000);
		expect(older).toEqual([]);
	});
});

describe("ページネーション", () => {
	beforeEach(() => {
		useMessageStore.getState().clearMessages();
		useMessageStore.setState({ hasMore: true });
	});

	it("初期状態ではhasMoreがtrueである", () => {
		expect(useMessageStore.getState().hasMore).toBe(true);
	});

	it("setHasMoreでhasMoreを変更できる", () => {
		useMessageStore.getState().setHasMore(false);
		expect(useMessageStore.getState().hasMore).toBe(false);
	});

	it("getOldestTimestampが最も古いメッセージのタイムスタンプを返す", () => {
		useMessageStore.getState().addMessage(makeEvent("id2", "B", 2000));
		useMessageStore.getState().addMessage(makeEvent("id1", "A", 1000));
		expect(useMessageStore.getState().getOldestTimestamp()).toBe(1000);
	});

	it("getOldestTimestampはメッセージが空ならundefinedを返す", () => {
		expect(useMessageStore.getState().getOldestTimestamp()).toBeUndefined();
	});

	it("addMessagesで全て重複の場合stateが変わらない", () => {
		const event = makeEvent("id1", "Hello", 1000);
		useMessageStore.getState().addMessage(event);
		const stateBefore = useMessageStore.getState();
		useMessageStore.getState().addMessages([event]);
		const stateAfter = useMessageStore.getState();
		expect(stateBefore.messages).toBe(stateAfter.messages);
	});
});
