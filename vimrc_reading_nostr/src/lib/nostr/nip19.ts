import { decode, neventEncode } from "nostr-tools/nip19";

export function encodeNevent(eventId: string, relays?: string[]): string {
	return neventEncode({
		id: eventId,
		relays: relays ?? [],
	});
}

export type DecodedNevent = {
	id: string;
	relays: string[];
};

export function decodeNevent(nevent: string): DecodedNevent | null {
	try {
		const decoded = decode(nevent);
		if (decoded.type !== "nevent") {
			return null;
		}
		return {
			id: decoded.data.id,
			relays: decoded.data.relays ?? [],
		};
	} catch {
		return null;
	}
}

export function shortenNpub(npub: string): string {
	if (npub.length <= 16) {
		return npub;
	}
	return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
}
