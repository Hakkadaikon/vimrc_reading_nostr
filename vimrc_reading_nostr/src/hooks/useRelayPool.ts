import type { Event } from "nostr-tools/core";
import type { Filter } from "nostr-tools/filter";
import { Relay } from "nostr-tools/relay";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRelayUrls } from "#/lib/nostr/relay-config";
import { useRelayStore } from "#/stores/relay-store";

type RelayConnection = {
	relay: Relay;
	url: string;
};

type Subscription = {
	filters: Filter[];
	onEvent: (event: Event) => void;
	onEose?: () => void;
};

const MAX_BACKOFF = 30000;

function backoffDelay(attempt: number): number {
	return Math.min(1000 * 2 ** attempt, MAX_BACKOFF);
}

export function useRelayPool() {
	const connectionsRef = useRef<RelayConnection[]>([]);
	const reconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);
	const attemptCountRef = useRef<Map<string, number>>(new Map());
	const subscriptionsRef = useRef<Subscription[]>([]);
	const activeSubsRef = useRef<Array<{ close: () => void }>>([]);
	const setStatus = useRelayStore((s) => s.setStatus);
	const [ready, setReady] = useState(false);

	// 登録済みの全サブスクリプションを現在の全接続に適用する
	const applySubscriptions = useCallback(() => {
		// 既存のサブスクリプションをクリーンアップ
		for (const sub of activeSubsRef.current) {
			sub.close();
		}
		activeSubsRef.current = [];

		// 全接続 × 全サブスクリプション
		for (const conn of connectionsRef.current) {
			for (const s of subscriptionsRef.current) {
				const sub = conn.relay.subscribe(s.filters, {
					onevent: s.onEvent,
					oneose: s.onEose,
				});
				activeSubsRef.current.push(sub);
			}
		}
	}, []);

	const connectToRelay = useCallback(
		async (url: string) => {
			setStatus(url, "connecting");
			try {
				const relay = await Relay.connect(url);
				const connection: RelayConnection = { relay, url };
				connectionsRef.current = [
					...connectionsRef.current.filter((c) => c.url !== url),
					connection,
				];
				attemptCountRef.current.set(url, 0);
				setStatus(url, "connected");
				setReady(true);

				// 新しい接続にサブスクリプションを適用
				applySubscriptions();

				relay.onclose = () => {
					setStatus(url, "disconnected");
					connectionsRef.current = connectionsRef.current.filter(
						(c) => c.url !== url,
					);
					scheduleReconnect(url);
				};
			} catch {
				setStatus(url, "error");
				scheduleReconnect(url);
			}
		},
		[setStatus, applySubscriptions],
	);

	const scheduleReconnect = useCallback(
		(url: string) => {
			const existing = reconnectTimersRef.current.get(url);
			if (existing) clearTimeout(existing);

			const attempt = attemptCountRef.current.get(url) ?? 0;
			const delay = backoffDelay(attempt);
			attemptCountRef.current.set(url, attempt + 1);

			const timer = setTimeout(() => {
				reconnectTimersRef.current.delete(url);
				connectToRelay(url);
			}, delay);
			reconnectTimersRef.current.set(url, timer);
		},
		[connectToRelay],
	);

	const connect = useCallback(() => {
		const urls = getRelayUrls();
		for (const url of urls) {
			connectToRelay(url);
		}
	}, [connectToRelay]);

	const disconnect = useCallback(() => {
		for (const timer of reconnectTimersRef.current.values()) {
			clearTimeout(timer);
		}
		reconnectTimersRef.current.clear();
		for (const sub of activeSubsRef.current) {
			sub.close();
		}
		activeSubsRef.current = [];
		for (const conn of connectionsRef.current) {
			conn.relay.close();
		}
		connectionsRef.current = [];
	}, []);

	const publish = useCallback(async (event: Event): Promise<void> => {
		const promises = connectionsRef.current.map((conn) =>
			conn.relay.publish(event),
		);
		await Promise.allSettled(promises);
	}, []);

	// サブスクリプションを登録する。接続済みリレーがあれば即座に購読開始、
	// まだ接続中なら接続完了時に自動で購読される。
	const subscribe = useCallback(
		(
			filters: Filter[],
			onEvent: (event: Event) => void,
			onEose?: () => void,
		) => {
			const subscription: Subscription = { filters, onEvent, onEose };
			subscriptionsRef.current = [...subscriptionsRef.current, subscription];

			// 既存接続があれば即座に購読
			const subs: Array<{ close: () => void }> = [];
			for (const conn of connectionsRef.current) {
				const sub = conn.relay.subscribe(filters, {
					onevent: onEvent,
					oneose: onEose,
				});
				subs.push(sub);
				activeSubsRef.current.push(sub);
			}

			return () => {
				// このサブスクリプションを登録リストから除去
				subscriptionsRef.current = subscriptionsRef.current.filter(
					(s) => s !== subscription,
				);
				// 既存のアクティブsubを閉じる
				for (const sub of subs) {
					sub.close();
					activeSubsRef.current = activeSubsRef.current.filter(
						(s) => s !== sub,
					);
				}
			};
		},
		[],
	);

	useEffect(() => {
		connect();
		return () => disconnect();
	}, [connect, disconnect]);

	return { publish, subscribe, ready };
}
