import { create } from "zustand";

export type Reaction = {
	id: string;
	pubkey: string;
	content: string;
};

type ReactionState = {
	reactions: Record<string, Reaction[]>;
	addReaction: (eventId: string, reaction: Reaction) => void;
	getReactions: (eventId: string) => Reaction[];
	getReactionCount: (eventId: string) => number;
	clearReactions: () => void;
};

export const useReactionStore = create<ReactionState>((set, get) => ({
	reactions: {},

	addReaction: (eventId, reaction) => {
		set((state) => {
			const existing = state.reactions[eventId] ?? [];
			if (existing.some((r) => r.id === reaction.id)) {
				return state;
			}
			return {
				reactions: {
					...state.reactions,
					[eventId]: [...existing, reaction],
				},
			};
		});
	},

	getReactions: (eventId) => {
		return get().reactions[eventId] ?? [];
	},

	getReactionCount: (eventId) => {
		return (get().reactions[eventId] ?? []).length;
	},

	clearReactions: () => {
		set({ reactions: {} });
	},
}));
