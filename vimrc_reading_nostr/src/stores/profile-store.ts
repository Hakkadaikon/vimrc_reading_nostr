import { create } from "zustand";
import { shortenNpub } from "#/lib/nostr/nip19";

export type UserProfile = {
	name?: string;
	picture?: string;
	about?: string;
};

const REQUEST_TTL_MS = 30_000;

type ProfileState = {
	profiles: Record<string, UserProfile>;
	requestedAt: Record<string, number>;
	setProfile: (pubkey: string, profile: UserProfile) => void;
	getProfile: (pubkey: string) => UserProfile | undefined;
	getDisplayName: (pubkey: string) => string;
	needsFetch: (pubkey: string) => boolean;
	markRequested: (pubkey: string) => void;
	getUnfetchedPubkeys: (pubkeys: string[]) => string[];
	clearProfiles: () => void;
};

function isRequestExpired(requestedAt: number): boolean {
	return Date.now() - requestedAt > REQUEST_TTL_MS;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
	profiles: {},
	requestedAt: {},

	setProfile: (pubkey, profile) => {
		set((state) => ({
			profiles: { ...state.profiles, [pubkey]: profile },
		}));
	},

	getProfile: (pubkey) => {
		return get().profiles[pubkey];
	},

	getDisplayName: (pubkey) => {
		const profile = get().profiles[pubkey];
		if (profile?.name) {
			return profile.name;
		}
		return shortenNpub(pubkey);
	},

	needsFetch: (pubkey) => {
		const state = get();
		if (state.profiles[pubkey]) return false;
		const ts = state.requestedAt[pubkey];
		if (!ts) return true;
		return isRequestExpired(ts);
	},

	markRequested: (pubkey) => {
		set((state) => ({
			requestedAt: { ...state.requestedAt, [pubkey]: Date.now() },
		}));
	},

	getUnfetchedPubkeys: (pubkeys) => {
		const state = get();
		const now = Date.now();
		return pubkeys.filter((pk) => {
			if (state.profiles[pk]) return false;
			const ts = state.requestedAt[pk];
			if (!ts) return true;
			return now - ts > REQUEST_TTL_MS;
		});
	},

	clearProfiles: () => {
		set({ profiles: {}, requestedAt: {} });
	},
}));
