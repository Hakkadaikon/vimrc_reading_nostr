import { create } from "zustand";

export type RelayStatus = "connected" | "connecting" | "disconnected" | "error";

type RelayState = {
	statuses: Record<string, RelayStatus>;
	setStatus: (url: string, status: RelayStatus) => void;
};

export const useRelayStore = create<RelayState>((set) => ({
	statuses: {},

	setStatus: (url, status) => {
		set((state) => ({
			statuses: { ...state.statuses, [url]: status },
		}));
	},
}));
