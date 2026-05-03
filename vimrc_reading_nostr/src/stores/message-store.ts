import { create } from "zustand";

export type NostrMessage = {
	id: string;
	pubkey: string;
	kind: number;
	content: string;
	created_at: number;
	tags: string[][];
	sig: string;
};

export const MESSAGE_STORAGE_KEY = "vimrc_reading_nostr_messages";
export const PAGE_SIZE = 100;

type MessageState = {
	messages: NostrMessage[];
	messageIds: Set<string>;
	deletedIds: Set<string>;
	isInitialLoading: boolean;
	hasMore: boolean;
	addMessage: (event: NostrMessage) => void;
	addMessages: (events: NostrMessage[]) => void;
	deleteMessage: (eventId: string) => void;
	clearMessages: () => void;
	saveToLocalStorage: () => void;
	loadFromLocalStorage: () => void;
	loadOlderFromLocalStorage: (until: number) => NostrMessage[];
	setInitialLoading: (loading: boolean) => void;
	setHasMore: (hasMore: boolean) => void;
	getOldestTimestamp: () => number | undefined;
};

function binaryInsert(
	messages: NostrMessage[],
	event: NostrMessage,
): NostrMessage[] {
	const result = [...messages];
	let lo = 0;
	let hi = result.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (result[mid].created_at < event.created_at) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	result.splice(lo, 0, event);
	return result;
}

// loadOlderFromLocalStorage用のパース結果キャッシュ
let parsedStorageCache: NostrMessage[] | null = null;

export const useMessageStore = create<MessageState>((set, get) => ({
	messages: [],
	messageIds: new Set<string>(),
	deletedIds: new Set<string>(),
	isInitialLoading: true,
	hasMore: true,

	addMessage: (event) => {
		set((state) => {
			if (state.messageIds.has(event.id)) {
				return state;
			}
			const newIds = new Set(state.messageIds);
			newIds.add(event.id);
			return {
				messages: binaryInsert(state.messages, event),
				messageIds: newIds,
			};
		});
	},

	addMessages: (events) => {
		set((state) => {
			let messages = state.messages;
			const newIds = new Set(state.messageIds);
			let added = 0;
			for (const event of events) {
				if (!newIds.has(event.id)) {
					newIds.add(event.id);
					messages = binaryInsert(messages, event);
					added++;
				}
			}
			if (added === 0) return state;
			return { messages, messageIds: newIds };
		});
	},

	deleteMessage: (eventId) => {
		set((state) => {
			if (state.deletedIds.has(eventId)) {
				return state;
			}
			const newDeleted = new Set(state.deletedIds);
			newDeleted.add(eventId);
			return { deletedIds: newDeleted };
		});
	},

	clearMessages: () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(MESSAGE_STORAGE_KEY);
		}
		parsedStorageCache = null;
		set({
			messages: [],
			messageIds: new Set<string>(),
			deletedIds: new Set<string>(),
		});
	},

	saveToLocalStorage: () => {
		if (typeof window === "undefined") return;
		const { messages } = get();
		localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
		parsedStorageCache = null;
	},

	loadFromLocalStorage: () => {
		if (typeof window === "undefined") return;
		try {
			const stored = localStorage.getItem(MESSAGE_STORAGE_KEY);
			if (!stored) return;
			const events: NostrMessage[] = JSON.parse(stored);
			if (!Array.isArray(events)) return;
			get().addMessages(events);
		} catch {
			// データが壊れている場合は何もしない
		}
	},

	loadOlderFromLocalStorage: (until: number): NostrMessage[] => {
		if (typeof window === "undefined") return [];
		try {
			if (!parsedStorageCache) {
				const stored = localStorage.getItem(MESSAGE_STORAGE_KEY);
				if (!stored) return [];
				const parsed: NostrMessage[] = JSON.parse(stored);
				if (!Array.isArray(parsed)) return [];
				parsedStorageCache = parsed;
			}
			const { messageIds } = get();
			return parsedStorageCache
				.filter((e) => e.created_at < until && !messageIds.has(e.id))
				.sort((a, b) => b.created_at - a.created_at)
				.slice(0, PAGE_SIZE);
		} catch {
			return [];
		}
	},

	setInitialLoading: (loading) => {
		set({ isInitialLoading: loading });
	},

	setHasMore: (hasMore) => {
		set({ hasMore });
	},

	getOldestTimestamp: () => {
		const { messages } = get();
		if (messages.length === 0) return undefined;
		return messages[0].created_at;
	},
}));
