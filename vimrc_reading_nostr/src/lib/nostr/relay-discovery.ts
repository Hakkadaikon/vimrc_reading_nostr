import type { Event } from "nostr-tools/core";
import { Relay } from "nostr-tools/relay";
import type { UserProfile } from "#/stores/profile-store";
import { parseProfileMetadata } from "./metadata";
import {
	getCachedProfile,
	getCachedRelayList,
	setCachedProfile,
	setCachedRelayList,
} from "./profile-cache";
import { getRelayUrls } from "./relay-config";

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
 * 指定リレーからkind:0（プロフィール）を取得する
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

/**
 * 複数リレーに並行でkind:0を問い合わせ、最初に見つかったものを返す
 */
async function fetchProfileFromAnyRelay(
	pubkey: string,
	relayUrls: string[],
): Promise<UserProfile | null> {
	if (relayUrls.length === 0) return null;

	// Promise.anyのように、最初に成功（non-null）したものを返す
	return new Promise<UserProfile | null>((resolve) => {
		let resolved = false;
		let remaining = relayUrls.length;

		for (const url of relayUrls) {
			fetchProfileFromRelay(pubkey, url).then((profile) => {
				remaining--;
				if (!resolved && profile) {
					resolved = true;
					resolve(profile);
				} else if (!resolved && remaining === 0) {
					resolve(null);
				}
			});
		}
	});
}

/**
 * pubkeyのプロフィールを解決する
 *
 * 2つの戦略を並行実行し、最初に見つかったものを使う:
 * A) directory.yabu.me → kind:10002 → そのリレーでkind:0
 * B) 設定リレー（VITE_RELAY_URLS）に直接kind:0を問い合わせ
 */
export async function resolveProfile(
	pubkey: string,
): Promise<UserProfile | null> {
	// 1. localStorageキャッシュ
	const cached = getCachedProfile(pubkey);
	if (cached) return cached;

	// 2. 2つの戦略を並行実行
	const directoryStrategy = async (): Promise<UserProfile | null> => {
		const relays = await fetchRelayList(pubkey);
		if (relays.length === 0) return null;
		return fetchProfileFromAnyRelay(pubkey, relays.slice(0, 3));
	};

	const fallbackStrategy = async (): Promise<UserProfile | null> => {
		const configuredRelays = getRelayUrls();
		return fetchProfileFromAnyRelay(pubkey, configuredRelays);
	};

	// 両方を並行実行し、最初にnon-nullが返ったものを使う
	const result = await new Promise<UserProfile | null>((resolve) => {
		let resolved = false;
		let completed = 0;

		const tryResolve = (profile: UserProfile | null) => {
			completed++;
			if (!resolved && profile) {
				resolved = true;
				resolve(profile);
			} else if (!resolved && completed === 2) {
				resolve(null);
			}
		};

		directoryStrategy().then(tryResolve);
		fallbackStrategy().then(tryResolve);
	});

	if (result) {
		setCachedProfile(pubkey, result);
	}
	return result;
}
