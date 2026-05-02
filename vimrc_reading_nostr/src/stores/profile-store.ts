import { create } from "zustand";
import { shortenNpub } from "#/lib/nostr/nip19";

export type UserProfile = {
	name?: string;
	picture?: string;
	about?: string;
};

type ProfileState = {
	profiles: Record<string, UserProfile>;
	setProfile: (pubkey: string, profile: UserProfile) => void;
	getProfile: (pubkey: string) => UserProfile | undefined;
	getDisplayName: (pubkey: string) => string;
	clearProfiles: () => void;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
	profiles: {},

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

	clearProfiles: () => {
		set({ profiles: {} });
	},
}));
