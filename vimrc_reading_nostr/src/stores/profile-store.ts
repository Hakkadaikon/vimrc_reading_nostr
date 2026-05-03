import { create } from "zustand";
import { shortenNpub } from "#/lib/nostr/nip19";

export type UserProfile = {
	name?: string;
	picture?: string;
	about?: string;
};

type ProfileState = {
	profiles: Record<string, UserProfile>;
	requestedPubkeys: Set<string>;
	setProfile: (pubkey: string, profile: UserProfile) => void;
	getProfile: (pubkey: string) => UserProfile | undefined;
	getDisplayName: (pubkey: string) => string;
	needsFetch: (pubkey: string) => boolean;
	markRequested: (pubkey: string) => void;
	getUnfetchedPubkeys: (pubkeys: string[]) => string[];
	clearProfiles: () => void;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
	profiles: {},
	requestedPubkeys: new Set<string>(),

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
		return !state.profiles[pubkey] && !state.requestedPubkeys.has(pubkey);
	},

	markRequested: (pubkey) => {
		set((state) => {
			const newSet = new Set(state.requestedPubkeys);
			newSet.add(pubkey);
			return { requestedPubkeys: newSet };
		});
	},

	getUnfetchedPubkeys: (pubkeys) => {
		const state = get();
		return pubkeys.filter(
			(pk) => !state.profiles[pk] && !state.requestedPubkeys.has(pk),
		);
	},

	clearProfiles: () => {
		set({ profiles: {}, requestedPubkeys: new Set<string>() });
	},
}));
