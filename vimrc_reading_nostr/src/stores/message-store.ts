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

const MESSAGE_STORAGE_KEY = "vimrc_reading_nostr_messages";
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
	setHasMore: (hasMore: boolean) => void;
	getOldestTimestamp: () => number | undefined;
	loadLatestPage: () => void;
	loadOlderPage: (until: number) => NostrMessage[];
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
		// IDで重複排除（後のエントリを優先）
		const seen = new Set<string>();
		const deduped: NostrMessage[] = [];
		for (let i = parsed.length - 1; i >= 0; i--) {
			if (!seen.has(parsed[i].id)) {
				seen.add(parsed[i].id);
				deduped.push(parsed[i]);
			}
		}
		deduped.reverse();
		parsedStorageCache = deduped;
		return deduped;
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
			if (state.messageIds.has(event.id) || state.deletedIds.has(event.id)) {
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
				if (!newIds.has(event.id) && !state.deletedIds.has(event.id)) {
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
			// UIからも除去
			const messages = state.messages.filter((m) => m.id !== eventId);
			const newIds = new Set(state.messageIds);
			newIds.delete(eventId);
			return { deletedIds: newDeleted, messages, messageIds: newIds };
		});
		// localStorageからも削除
		const all = getAllFromStorage();
		const filtered = all.filter((m) => m.id !== eventId);
		if (filtered.length < all.length) {
			parsedStorageCache = filtered;
			scheduleWrite(filtered);
		}
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

	loadLatestPage: () => {
		const all = getAllFromStorage();
		if (all.length === 0) {
			set({ isInitialLoading: false });
			return;
		}
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
		const older = all.filter(
			(e) => e.created_at < until && !messageIds.has(e.id),
		);
		return older.slice(-PAGE_SIZE).reverse();
	},

	appendAndPersist: (events) => {
		if (events.length === 0) return;
		const { deletedIds } = get();
		const all = getAllFromStorage();
		const existingIds = new Set(all.map((m) => m.id));
		const newEvents = events.filter(
			(e) => !existingIds.has(e.id) && !deletedIds.has(e.id),
		);
		if (newEvents.length === 0) return;
		const merged = [...all, ...newEvents].sort(
			(a, b) => a.created_at - b.created_at,
		);
		parsedStorageCache = merged;
		scheduleWrite(merged);
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
