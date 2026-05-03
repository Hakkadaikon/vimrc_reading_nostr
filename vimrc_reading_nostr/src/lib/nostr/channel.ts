import type { Filter } from "nostr-tools/filter";

// vimrc読書会の固定チャンネルID（NIP-28 kind:40 イベントID）
export const CHANNEL_ID =
	import.meta.env.VITE_CHANNEL_ID ||
	"4127d704015b030339a6955af2bb1b4e63f0c0b1c3c12478d1db685b0d781486";

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

export function createChannelMetadataFilter(): Filter {
	return {
		kinds: [40],
		ids: [CHANNEL_ID],
	};
}
