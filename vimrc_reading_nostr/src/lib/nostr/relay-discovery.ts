import type { Event } from "nostr-tools/core";
import type { Filter } from "nostr-tools/filter";
import { Relay } from "nostr-tools/relay";
import type { UserProfile } from "#/stores/profile-store";
import { parseProfileMetadata } from "./metadata";
import {
	getCachedProfile,
	getCachedRelayList,
	setCachedProfile,
	setCachedRelayList,
} from "./profile-cache";

const DIRECTORY_RELAY = "wss://directory.yabu.me";
const FETCH_TIMEOUT = 5000;

/**
 * kind:10002のタグからread可能なリレーURLを抽出する
 */
export function parseRelayListEvent(tags: string[][]): string[] {
	return tags
		.filter((tag) => {
			if (tag[0] !== "r") return false;
			const marker = tag[2];
			return !marker || marker === "read";
		})
		.map((tag) => tag[1]);
}

/**
 * リレーに接続し、フィルタにマッチする最初のイベントを取得して接続を閉じる汎用ヘルパー
 */
async function fetchFirstFromRelay<T>(
	relayUrl: string,
	filter: Filter,
	transform: (event: Event) => T | null,
): Promise<T | null> {
	try {
		const relay = await Relay.connect(relayUrl);
		let settled = false;

		const result = await new Promise<T | null>((resolve) => {
			let value: T | null = null;

			const settle = (v: T | null) => {
				if (settled) return;
				settled = true;
				sub.close();
				resolve(v);
			};

			const sub = relay.subscribe([filter], {
				onevent: (event: Event) => {
					const transformed = transform(event);
					if (transformed !== null) {
						value = transformed;
					}
				},
				oneose: () => settle(value),
			});

			setTimeout(() => settle(value), FETCH_TIMEOUT);
		});

		relay.close();
		return result;
	} catch {
		return null;
	}
}

/**
 * directory.yabu.meからkind:10002（リレーリスト）を取得する
 */
async function fetchRelayList(pubkey: string): Promise<string[]> {
	const cached = getCachedRelayList(pubkey);
	if (cached) return cached;

	const relays = await fetchFirstFromRelay(
		DIRECTORY_RELAY,
		{ kinds: [10002], authors: [pubkey], limit: 1 },
		(event) => {
			const list = parseRelayListEvent(event.tags);
			return list.length > 0 ? list : null;
		},
	);

	if (relays) {
		setCachedRelayList(pubkey, relays);
		return relays;
	}
	return [];
}

export type SubscribeFn = (
	filters: Filter[],
	onEvent: (event: Event) => void,
	onEose?: () => void,
) => () => void;

/**
 * 接続済みリレープール経由でkind:0を取得する
 */
function fetchProfileViaPool(
	pubkey: string,
	subscribeFn: SubscribeFn,
): Promise<UserProfile | null> {
	return new Promise<UserProfile | null>((resolve) => {
		let settled = false;
		let result: UserProfile | null = null;

		const settle = (v: UserProfile | null) => {
			if (settled) return;
			settled = true;
			unsub();
			resolve(v);
		};

		const unsub = subscribeFn(
			[{ kinds: [0], authors: [pubkey], limit: 1 }],
			(event: Event) => {
				const profile = parseProfileMetadata(event.content);
				if (profile) {
					result = profile;
					settle(profile);
				}
			},
			() => settle(result),
		);

		setTimeout(() => settle(result), FETCH_TIMEOUT);
	});
}

/**
 * 複数のPromiseを競争させ、最初にnon-nullを返したものを採用する。
 * 全てnullなら、全完了後にnullを返す。
 */
function raceFirstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
	if (promises.length === 0) return Promise.resolve(null);

	return new Promise<T | null>((resolve) => {
		let settled = false;
		let completed = 0;
		const total = promises.length;

		for (const p of promises) {
			p.then((value) => {
				completed++;
				if (!settled && value !== null) {
					settled = true;
					resolve(value);
				} else if (!settled && completed === total) {
					resolve(null);
				}
			}).catch(() => {
				completed++;
				if (!settled && completed === total) {
					resolve(null);
				}
			});
		}
	});
}

/**
 * pubkeyのプロフィールを解決する
 *
 * A) 接続済みリレープールに一括kind:0問い合わせ
 * B) directory.yabu.me → kind:10002 → そのリレーでkind:0
 * 両方を並行実行し、最初にnon-nullが返った時点で確定。
 */
export async function resolveProfile(
	pubkey: string,
	subscribeFn?: SubscribeFn,
): Promise<UserProfile | null> {
	const cached = getCachedProfile(pubkey);
	if (cached) return cached;

	const strategies: Promise<UserProfile | null>[] = [];

	if (subscribeFn) {
		strategies.push(fetchProfileViaPool(pubkey, subscribeFn));
	}

	strategies.push(
		(async () => {
			const relays = await fetchRelayList(pubkey);
			if (relays.length === 0) return null;
			return raceFirstNonNull(
				relays
					.slice(0, 3)
					.map((url) =>
						fetchFirstFromRelay(
							url,
							{ kinds: [0], authors: [pubkey], limit: 1 },
							(event) => parseProfileMetadata(event.content),
						),
					),
			);
		})(),
	);

	const result = await raceFirstNonNull(strategies);

	if (result) {
		setCachedProfile(pubkey, result);
	}
	return result;
}
