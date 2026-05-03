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

const DIRECTORY_RELAY = "wss://directory.yabu.me";

/**
 * kind:10002のタグからread可能なリレーURLを抽出する
 */
export function parseRelayListEvent(tags: string[][]): string[] {
	return tags
		.filter((tag) => {
			if (tag[0] !== "r") return false;
			// マーカーなし（read+write）またはread
			const marker = tag[2];
			return !marker || marker === "read";
		})
		.map((tag) => tag[1]);
}

/**
 * directory.yabu.meからkind:10002（リレーリスト）を取得する
 */
async function fetchRelayList(pubkey: string): Promise<string[]> {
	// localStorageキャッシュをチェック
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
			// 5秒タイムアウト
			setTimeout(() => {
				sub.close();
				resolve(result);
			}, 5000);
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
			}, 5000);
		});
		relay.close();
		return profile;
	} catch {
		return null;
	}
}

/**
 * pubkeyのプロフィールを解決する
 * 1. localStorageキャッシュを確認
 * 2. directory.yabu.meからkind:10002を取得してリレーを特定
 * 3. 特定したリレーからkind:0を取得
 */
export async function resolveProfile(
	pubkey: string,
): Promise<UserProfile | null> {
	// 1. localStorageキャッシュ
	const cached = getCachedProfile(pubkey);
	if (cached) return cached;

	// 2. kind:10002でリレーリストを取得
	const relays = await fetchRelayList(pubkey);

	// 3. 特定したリレーからkind:0を取得（最初に応答したものを使う）
	const relaysToTry = relays.length > 0 ? relays.slice(0, 3) : [];

	for (const relayUrl of relaysToTry) {
		const profile = await fetchProfileFromRelay(pubkey, relayUrl);
		if (profile) {
			setCachedProfile(pubkey, profile);
			return profile;
		}
	}

	return null;
}
