import type { EventTemplate, VerifiedEvent } from "nostr-tools/pure";
import { verifyEvent as nostrVerifyEvent } from "nostr-tools/pure";
import { nowUnix } from "./time";

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
		created_at: nowUnix(),
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
		created_at: nowUnix(),
		tags: [
			["e", params.channelId, params.relayUrl ?? "", "root"],
			["e", params.originalEventId, params.relayUrl ?? ""],
		],
	};
}

export type MetadataParams = {
	name: string;
	display_name?: string;
	picture?: string;
	about?: string;
};

export function createMetadataEvent(params: MetadataParams): EventTemplate {
	return {
		kind: 0,
		content: JSON.stringify(params),
		created_at: nowUnix(),
		tags: [],
	};
}

export function createDeleteEvent(eventId: string): EventTemplate {
	return {
		kind: 5,
		content: "",
		created_at: nowUnix(),
		tags: [["e", eventId]],
	};
}

export function getETag(tags: string[][]): string | null {
	const tag = tags.find((t) => t[0] === "e");
	return tag ? tag[1] : null;
}

export function getETags(tags: string[][]): string[] {
	return tags.filter((t) => t[0] === "e").map((t) => t[1]);
}

export function verifyEvent(event: VerifiedEvent): boolean {
	return nostrVerifyEvent(event);
}
