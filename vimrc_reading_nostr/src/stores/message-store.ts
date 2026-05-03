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
export const PAGE_SIZE = 50;

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
	setInitialLoading: (loading: boolean) => void;
	setHasMore: (hasMore: boolean) => void;
	getOldestTimestamp: () => number | undefined;
	saveToLocalStorage: () => void;
	loadFromLocalStorage: () => void;
	loadLatestPage: () => void;
	loadOlderPage: (until: number) => NostrMessage[];
	// localStorageにイベントを追記（バッチ対応）
	appendAndPersist: (events: NostrMessage[]) => void;
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

let parsedStorageCache: NostrMessage[] | null = null;

function getAllFromStorage(): NostrMessage[] {
	if (parsedStorageCache) return parsedStorageCache;
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem(MESSAGE_STORAGE_KEY);
		if (!stored) return [];
		const parsed: NostrMessage[] = JSON.parse(stored);
		if (!Array.isArray(parsed)) return [];
		parsedStorageCache = parsed;
		return parsed;
	} catch {
		return [];
	}
}

function scheduleWrite(data: NostrMessage[]) {
	if (typeof window === "undefined") return;
	const doSave = () => {
		localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(data));
	};
	if ("requestIdleCallback" in window) {
		requestIdleCallback(doSave);
	} else {
		setTimeout(doSave, 0);
	}
}

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
		const messages = get().messages;
		parsedStorageCache = null;
		scheduleWrite(messages);
	},

	loadFromLocalStorage: () => {
		get().loadLatestPage();
	},

	loadLatestPage: () => {
		const all = getAllFromStorage();
		if (all.length === 0) return;
		const latest = all.slice(-PAGE_SIZE);
		const hasMore = all.length > PAGE_SIZE;
		const newIds = new Set(latest.map((m) => m.id));
		set({
			messages: latest,
			messageIds: newIds,
			hasMore,
			isInitialLoading: false,
		});
	},

	loadOlderPage: (until: number): NostrMessage[] => {
		const all = getAllFromStorage();
		const { messageIds } = get();
		// allは既にcreated_at昇順。filterで順序維持されるのでslice末尾がuntil直前の最新
		const older = all.filter(
			(e) => e.created_at < until && !messageIds.has(e.id),
		);
		// 末尾からPAGE_SIZE件（最新に近い方を優先）
		return older.slice(-PAGE_SIZE).reverse();
	},

	appendAndPersist: (events) => {
		if (events.length === 0) return;
		const all = getAllFromStorage();
		const existingIds = new Set(all.map((m) => m.id));
		const newEvents = events.filter((e) => !existingIds.has(e.id));
		if (newEvents.length === 0) return;
		const merged = [...all, ...newEvents].sort(
			(a, b) => a.created_at - b.created_at,
		);
		parsedStorageCache = merged;
		scheduleWrite(merged);
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
