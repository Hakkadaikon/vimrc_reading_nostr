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

type MessageState = {
	messages: NostrMessage[];
	messageIds: Set<string>;
	deletedIds: Set<string>;
	isInitialLoading: boolean;
	addMessage: (event: NostrMessage) => void;
	addMessages: (events: NostrMessage[]) => void;
	deleteMessage: (eventId: string) => void;
	clearMessages: () => void;
	saveToLocalStorage: () => void;
	loadFromLocalStorage: () => void;
	setInitialLoading: (loading: boolean) => void;
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

export const useMessageStore = create<MessageState>((set, get) => ({
	messages: [],
	messageIds: new Set<string>(),
	deletedIds: new Set<string>(),
	isInitialLoading: true,

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
			for (const event of events) {
				if (!newIds.has(event.id)) {
					newIds.add(event.id);
					messages = binaryInsert(messages, event);
				}
			}
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
		set({
			messages: [],
			messageIds: new Set<string>(),
			deletedIds: new Set<string>(),
		});
	},

	saveToLocalStorage: () => {
		const { messages } = get();
		localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(messages));
	},

	loadFromLocalStorage: () => {
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

	setInitialLoading: (loading) => {
		set({ isInitialLoading: loading });
	},
}));
