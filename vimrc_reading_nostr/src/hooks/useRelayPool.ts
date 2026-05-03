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

type Subscription = {
	filters: Filter[];
	onEvent: (event: Event) => void;
	onEose?: () => void;
};

const MAX_BACKOFF = 30000;

function backoffDelay(attempt: number): number {
	return Math.min(1000 * 2 ** attempt, MAX_BACKOFF);
}

// --- Module-level singleton relay pool ---
// Connections persist across page navigations (settings → chat → settings)

const connections: RelayConnection[] = [];
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const attemptCount = new Map<string, number>();
const subscriptions: Subscription[] = [];
let activeSubs: Array<{ close: () => void }> = [];
let initialized = false;
let mountCount = 0;

function getSetStatus() {
	return useRelayStore.getState().setStatus;
}

function applySubscriptions() {
	for (const sub of activeSubs) {
		sub.close();
	}
	activeSubs = [];

	for (const conn of connections) {
		for (const s of subscriptions) {
			const sub = conn.relay.subscribe(s.filters, {
				onevent: s.onEvent,
				oneose: s.onEose,
			});
			activeSubs.push(sub);
		}
	}
}

function scheduleReconnect(url: string) {
	const existing = reconnectTimers.get(url);
	if (existing) clearTimeout(existing);

	const attempt = attemptCount.get(url) ?? 0;
	const delay = backoffDelay(attempt);
	attemptCount.set(url, attempt + 1);

	const timer = setTimeout(() => {
		reconnectTimers.delete(url);
		connectToRelay(url);
	}, delay);
	reconnectTimers.set(url, timer);
}

async function connectToRelay(url: string) {
	const setStatus = getSetStatus();
	setStatus(url, "connecting");
	try {
		const relay = await Relay.connect(url);
		const connection: RelayConnection = { relay, url };
		const idx = connections.findIndex((c) => c.url === url);
		if (idx >= 0) {
			connections[idx] = connection;
		} else {
			connections.push(connection);
		}
		attemptCount.set(url, 0);
		setStatus(url, "connected");

		applySubscriptions();

		relay.onclose = () => {
			setStatus(url, "disconnected");
			const i = connections.findIndex((c) => c.url === url);
			if (i >= 0) connections.splice(i, 1);
			scheduleReconnect(url);
		};
	} catch {
		setStatus(url, "error");
		scheduleReconnect(url);
	}
}

function connectAll() {
	if (initialized) return;
	initialized = true;
	const urls = getRelayUrls();
	for (const url of urls) {
		connectToRelay(url);
	}
}

function disconnectAll() {
	for (const timer of reconnectTimers.values()) {
		clearTimeout(timer);
	}
	reconnectTimers.clear();
	for (const sub of activeSubs) {
		sub.close();
	}
	activeSubs = [];
	for (const conn of connections) {
		conn.relay.close();
	}
	connections.length = 0;
	initialized = false;
}

function publish(event: Event): Promise<void> {
	const promises = connections.map((conn) => conn.relay.publish(event));
	return Promise.allSettled(promises).then(() => undefined);
}

function subscribe(
	filters: Filter[],
	onEvent: (event: Event) => void,
	onEose?: () => void,
): () => void {
	const subscription: Subscription = { filters, onEvent, onEose };
	subscriptions.push(subscription);

	// 既存接続があれば即座に購読
	const subs: Array<{ close: () => void }> = [];
	for (const conn of connections) {
		const sub = conn.relay.subscribe(filters, {
			onevent: onEvent,
			oneose: onEose,
		});
		subs.push(sub);
		activeSubs.push(sub);
	}

	return () => {
		const idx = subscriptions.indexOf(subscription);
		if (idx >= 0) subscriptions.splice(idx, 1);
		for (const sub of subs) {
			sub.close();
			const i = activeSubs.indexOf(sub);
			if (i >= 0) activeSubs.splice(i, 1);
		}
	};
}

// --- React hook: manages lifecycle (connect on first mount, disconnect when all unmount) ---

export function useRelayPool() {
	const mountedRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;
		mountCount++;
		connectAll();
		return () => {
			mountedRef.current = false;
			mountCount--;
			if (mountCount === 0) {
				disconnectAll();
			}
		};
	}, []);

	return { publish, subscribe };
}
