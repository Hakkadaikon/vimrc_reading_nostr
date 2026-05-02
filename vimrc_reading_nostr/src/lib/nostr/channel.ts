import type { Filter } from "nostr-tools/filter";

// vimrc読書会の固定チャンネルID（NIP-28 kind:40 イベントID）
export const CHANNEL_ID =
	import.meta.env.VITE_CHANNEL_ID ||
	"68a2c914182e5bcad16635536f68580de6ae531464baa449c274c40053a96bc0";

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
