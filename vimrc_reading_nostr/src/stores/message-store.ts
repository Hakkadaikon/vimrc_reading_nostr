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

type MessageState = {
	messages: NostrMessage[];
	messageIds: Set<string>;
	deletedIds: Set<string>;
	addMessage: (event: NostrMessage) => void;
	addMessages: (events: NostrMessage[]) => void;
	deleteMessage: (eventId: string) => void;
	clearMessages: () => void;
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

export const useMessageStore = create<MessageState>((set) => ({
	messages: [],
	messageIds: new Set<string>(),
	deletedIds: new Set<string>(),

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
}));
