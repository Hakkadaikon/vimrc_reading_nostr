import { create } from "zustand";

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
		// pubkeyを短縮表示
		if (pubkey.length > 16) {
			return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
		}
		return pubkey;
	},

	clearProfiles: () => {
		set({ profiles: {} });
	},
}));
