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

export type EditedMessageParams = {
	content: string;
	channelId: string;
	originalEventId: string;
	relayUrl?: string;
};

export function createEditedMessageEvent(
	params: EditedMessageParams,
): EventTemplate {
	return {
		kind: 42,
		content: params.content,
		created_at: Math.floor(Date.now() / 1000),
		tags: [
			["e", params.channelId, params.relayUrl ?? "", "root"],
			["e", params.originalEventId, params.relayUrl ?? ""],
		],
	};
}

export function createDeleteEvent(eventId: string): EventTemplate {
	return {
		kind: 5,
		content: "",
		created_at: Math.floor(Date.now() / 1000),
		tags: [["e", eventId]],
	};
}

export function verifyEvent(event: VerifiedEvent): boolean {
	return nostrVerifyEvent(event);
}
