import { create } from "zustand";

export type ChannelMetadata = {
	name?: string;
	about?: string;
	picture?: string;
};

type ChannelState = {
	metadata: ChannelMetadata;
	lastUpdatedAt: number;
	setMetadata: (metadata: ChannelMetadata, createdAt: number) => void;
};

const DEFAULT_CHANNEL_NAME = "vimrc読書会";

export const useChannelStore = create<ChannelState>((set, get) => ({
	metadata: { name: DEFAULT_CHANNEL_NAME },
	lastUpdatedAt: 0,
	setMetadata: (metadata, createdAt) => {
		if (createdAt <= get().lastUpdatedAt) return;
		set({
			metadata: { ...metadata, name: metadata.name || DEFAULT_CHANNEL_NAME },
			lastUpdatedAt: createdAt,
		});
	},
}));
