import type { EventTemplate } from "nostr-tools/pure";
import { nowUnix } from "./time";

export type ReactionParams = {
	targetEventId: string;
	targetPubkey: string;
	content?: string;
};

export function createReactionEvent(params: ReactionParams): EventTemplate {
	return {
		kind: 7,
		content: params.content ?? "+",
		created_at: nowUnix(),
		tags: [
			["e", params.targetEventId],
			["p", params.targetPubkey],
		],
	};
}
