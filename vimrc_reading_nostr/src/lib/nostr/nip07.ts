import type { Event } from "nostr-tools/core";

export type Nip07Provider = {
	getPublicKey: () => Promise<string>;
	signEvent: (event: unknown) => Promise<Event>;
};

export function getNip07Provider(): Nip07Provider | null {
	if (
		typeof window === "undefined" ||
		!(window as unknown as Record<string, unknown>).nostr
	) {
		return null;
	}
	return (window as unknown as Record<string, unknown>).nostr as Nip07Provider;
}
