import type { EventTemplate } from "nostr-tools/pure";

export type ReactionParams = {
	targetEventId: string;
	targetPubkey: string;
	content?: string;
};

export function createReactionEvent(params: ReactionParams): EventTemplate {
	return {
		kind: 7,
		content: params.content ?? "+",
		created_at: Math.floor(Date.now() / 1000),
		tags: [
			["e", params.targetEventId],
			["p", params.targetPubkey],
		],
	};
}
