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
	addMessage: (event: NostrMessage) => void;
	addMessages: (events: NostrMessage[]) => void;
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

	clearMessages: () => {
		set({ messages: [] });
	},
}));
