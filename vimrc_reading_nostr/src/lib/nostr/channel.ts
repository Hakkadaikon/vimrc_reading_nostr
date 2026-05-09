import type { Event } from "nostr-tools/core";
import type { Filter } from "nostr-tools/filter";
import type { ChannelMetadata } from "#/stores/channel-store";

// vimrc読書会の固定チャンネルID（NIP-28 kind:40 イベントID）
export const CHANNEL_ID =
	import.meta.env.VITE_CHANNEL_ID ||
	"f076302c4519068fcf47e4e728bcdddb769766e4cceadc420d1f76c45d4ba5f7";

type MessageFilterOptions = {
	limit?: number;
	since?: number;
	until?: number;
};

export function createChannelMessageFilter(
	options: MessageFilterOptions = {},
): Filter {
	const filter: Filter = {
		kinds: [42],
		"#e": [CHANNEL_ID],
	};
	if (options.limit !== undefined) {
		filter.limit = options.limit;
	}
	if (options.since !== undefined) {
		filter.since = options.since;
	}
	if (options.until !== undefined) {
		filter.until = options.until;
	}
	return filter;
}

export function createChannelMetadataFilters(): Filter[] {
	return [
		{ kinds: [40], ids: [CHANNEL_ID] },
		{ kinds: [41], "#e": [CHANNEL_ID] },
	];
}

export function parseChannelMetadata(event: Event): ChannelMetadata | null {
	if (event.kind !== 40 && event.kind !== 41) return null;
	try {
		const parsed = JSON.parse(event.content) as Record<string, unknown>;
		return {
			name: typeof parsed.name === "string" ? parsed.name : undefined,
			about: typeof parsed.about === "string" ? parsed.about : undefined,
			picture: typeof parsed.picture === "string" ? parsed.picture : undefined,
		};
	} catch {
		return null;
	}
}
