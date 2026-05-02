import type { Filter } from "nostr-tools/filter";

// vimrc読書会の固定チャンネルID
// 本番では kind:40 で作成したイベントIDに置き換える
export const CHANNEL_ID =
	import.meta.env.VITE_CHANNEL_ID ||
	"0000000000000000000000000000000000000000000000000000000000000000";

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
