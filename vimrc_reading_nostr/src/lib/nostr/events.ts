import type { EventTemplate, VerifiedEvent } from "nostr-tools/pure";
import { verifyEvent as nostrVerifyEvent } from "nostr-tools/pure";

export type ChannelMessageParams = {
	content: string;
	channelId: string;
	relayUrl?: string;
};

export function createChannelMessageEvent(
	params: ChannelMessageParams,
): EventTemplate {
	return {
		kind: 42,
		content: params.content,
		created_at: Math.floor(Date.now() / 1000),
		tags: [["e", params.channelId, params.relayUrl ?? "", "root"]],
	};
}

export function verifyEvent(event: VerifiedEvent): boolean {
	return nostrVerifyEvent(event);
}
