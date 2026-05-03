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
 * directory.yabu.meからkind:10002（リレーリスト）を取得する
 */
async function fetchRelayList(pubkey: string): Promise<string[]> {
	const cached = getCachedRelayList(pubkey);
	if (cached) return cached;

	try {
		const relay = await Relay.connect(DIRECTORY_RELAY);
		const relays = await new Promise<string[]>((resolve) => {
			let result: string[] = [];
			const sub = relay.subscribe(
				[{ kinds: [10002], authors: [pubkey], limit: 1 }],
				{
					onevent: (event: Event) => {
						result = parseRelayListEvent(event.tags);
					},
					oneose: () => {
						sub.close();
						resolve(result);
					},
				},
			);
			setTimeout(() => {
				sub.close();
				resolve(result);
			}, FETCH_TIMEOUT);
		});
		relay.close();

		if (relays.length > 0) {
			setCachedRelayList(pubkey, relays);
		}
		return relays;
	} catch {
		return [];
	}
}

/**
 * 指定リレーからkind:0（プロフィール）を取得する（新規接続）
 */
async function fetchProfileFromRelay(
	pubkey: string,
	relayUrl: string,
): Promise<UserProfile | null> {
	try {
		const relay = await Relay.connect(relayUrl);
		const profile = await new Promise<UserProfile | null>((resolve) => {
			let result: UserProfile | null = null;
			const sub = relay.subscribe(
				[{ kinds: [0], authors: [pubkey], limit: 1 }],
				{
					onevent: (event: Event) => {
						result = parseProfileMetadata(event.content);
					},
					oneose: () => {
						sub.close();
						resolve(result);
					},
				},
			);
			setTimeout(() => {
				sub.close();
				resolve(result);
			}, FETCH_TIMEOUT);
		});
		relay.close();
		return profile;
	} catch {
		return null;
	}
}

export type SubscribeFn = (
	filters: Filter[],
	onEvent: (event: Event) => void,
	onEose?: () => void,
) => () => void;

/**
 * 接続済みリレープール経由でkind:0を取得する
 * subscribeは全接続済みリレーに一括でREQを送る
 */
function fetchProfileViaPool(
	pubkey: string,
	subscribeFn: SubscribeFn,
): Promise<UserProfile | null> {
	return new Promise<UserProfile | null>((resolve) => {
		let result: UserProfile | null = null;
		let resolved = false;

		const unsub = subscribeFn(
			[{ kinds: [0], authors: [pubkey], limit: 1 }],
			(event: Event) => {
				if (!resolved) {
					const profile = parseProfileMetadata(event.content);
					if (profile) {
						resolved = true;
						result = profile;
						unsub();
						resolve(result);
					}
				}
			},
			() => {
				// EOSE — 全リレーから応答完了
				if (!resolved) {
					resolved = true;
					unsub();
					resolve(result);
				}
			},
		);

		// タイムアウト
		setTimeout(() => {
			if (!resolved) {
				resolved = true;
				unsub();
				resolve(result);
			}
		}, FETCH_TIMEOUT);
	});
}

/**
 * pubkeyのプロフィールを解決する
 *
 * subscribeFnが渡された場合は接続済みリレープールを使って全リレーに一括問い合わせ。
 * 同時にdirectory.yabu.meからkind:10002経由でも取得を試み、
 * 最初に見つかったものを使う。
 */
export async function resolveProfile(
	pubkey: string,
	subscribeFn?: SubscribeFn,
): Promise<UserProfile | null> {
	// 1. localStorageキャッシュ
	const cached = getCachedProfile(pubkey);
	if (cached) return cached;

	// 2. 複数の戦略を並行実行
	const strategies: Promise<UserProfile | null>[] = [];

	// A) 接続済みリレープール経由（全リレーに一括REQ）
	if (subscribeFn) {
		strategies.push(fetchProfileViaPool(pubkey, subscribeFn));
	}

	// B) directory.yabu.me → kind:10002 → そのリレーでkind:0
	strategies.push(
		(async () => {
			const relays = await fetchRelayList(pubkey);
			if (relays.length === 0) return null;
			// kind:10002で見つけたリレーに並行問い合わせ
			const results = await Promise.allSettled(
				relays.slice(0, 3).map((url) => fetchProfileFromRelay(pubkey, url)),
			);
			for (const r of results) {
				if (r.status === "fulfilled" && r.value) return r.value;
			}
			return null;
		})(),
	);

	// 最初にnon-nullが返った時点で確定
	const result = await new Promise<UserProfile | null>((resolve) => {
		let resolved = false;
		let completed = 0;
		const total = strategies.length;

		for (const strategy of strategies) {
			strategy.then((profile) => {
				completed++;
				if (!resolved && profile) {
					resolved = true;
					resolve(profile);
				} else if (!resolved && completed === total) {
					resolve(null);
				}
			});
		}
	});

	if (result) {
		setCachedProfile(pubkey, result);
	}
	return result;
}
