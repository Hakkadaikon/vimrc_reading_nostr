import { create } from "zustand";

export type RelayStatus = "connected" | "connecting" | "disconnected" | "error";

type RelayState = {
	statuses: Record<string, RelayStatus>;
	setStatus: (url: string, status: RelayStatus) => void;
	clearStatuses: () => void;
	isAnyConnected: () => boolean;
};

export const useRelayStore = create<RelayState>((set, get) => ({
	statuses: {},

	setStatus: (url, status) => {
		set((state) => ({
			statuses: { ...state.statuses, [url]: status },
		}));
	},

	clearStatuses: () => {
		set({ statuses: {} });
	},

	isAnyConnected: () => {
		return Object.values(get().statuses).some((s) => s === "connected");
	},
}));
