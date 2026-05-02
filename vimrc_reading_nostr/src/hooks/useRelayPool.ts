import type { Event } from "nostr-tools/core";
import type { Filter } from "nostr-tools/filter";
import { Relay } from "nostr-tools/relay";
import { useEffect, useRef } from "react";
import { getRelayUrls } from "#/lib/nostr/relay-config";
import { useRelayStore } from "#/stores/relay-store";

type RelayConnection = {
	relay: Relay;
	url: string;
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
	const setStatus = useRelayStore((s) => s.setStatus);

	const connectToRelay = async (url: string) => {
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
	};

	const scheduleReconnect = (url: string) => {
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
	};

	const connect = () => {
		const urls = getRelayUrls();
		for (const url of urls) {
			connectToRelay(url);
		}
	};

	const disconnect = () => {
		for (const timer of reconnectTimersRef.current.values()) {
			clearTimeout(timer);
		}
		reconnectTimersRef.current.clear();
		for (const conn of connectionsRef.current) {
			conn.relay.close();
		}
		connectionsRef.current = [];
	};

	const publish = async (event: Event): Promise<void> => {
		const promises = connectionsRef.current.map((conn) =>
			conn.relay.publish(event),
		);
		await Promise.allSettled(promises);
	};

	const subscribe = (
		filters: Filter[],
		onEvent: (event: Event) => void,
		onEose?: () => void,
	) => {
		const subs = connectionsRef.current.map((conn) => {
			const sub = conn.relay.subscribe(filters, {
				onevent: onEvent,
				oneose: onEose,
			});
			return sub;
		});

		return () => {
			for (const sub of subs) {
				sub.close();
			}
		};
	};

	useEffect(() => {
		connect();
		return () => disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return { publish, subscribe, connect, disconnect };
}
