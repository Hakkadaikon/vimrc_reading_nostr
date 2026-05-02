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
	deletedIds: Set<string>;
	addMessage: (event: NostrMessage) => void;
	addMessages: (events: NostrMessage[]) => void;
	deleteMessage: (eventId: string) => void;
	clearMessages: () => void;
};

function insertSorted(
	messages: NostrMessage[],
	event: NostrMessage,
): NostrMessage[] {
	if (messages.some((m) => m.id === event.id)) {
		return messages;
	}
	const result = [...messages, event];
	result.sort((a, b) => a.created_at - b.created_at);
	return result;
}

export const useMessageStore = create<MessageState>((set) => ({
	messages: [],
	deletedIds: new Set<string>(),

	addMessage: (event) => {
		set((state) => ({
			messages: insertSorted(state.messages, event),
		}));
	},

	addMessages: (events) => {
		set((state) => {
			let messages = state.messages;
			for (const event of events) {
				messages = insertSorted(messages, event);
			}
			return { messages };
		});
	},

	deleteMessage: (eventId) => {
		set((state) => {
			const newDeleted = new Set(state.deletedIds);
			newDeleted.add(eventId);
			return { deletedIds: newDeleted };
		});
	},

	clearMessages: () => {
		set({ messages: [], deletedIds: new Set<string>() });
	},
}));
