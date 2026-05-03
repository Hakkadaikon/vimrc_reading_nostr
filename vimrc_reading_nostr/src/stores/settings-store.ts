import { create } from "zustand";

export const SETTINGS_STORAGE_KEY = "app_settings";

type Settings = {
	githubPreviewEnabled: boolean;
};

type SettingsState = Settings & {
	setGithubPreviewEnabled: (enabled: boolean) => void;
	loadSettings: () => void;
};

function saveSettings(settings: Settings): void {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsState>((set) => ({
	githubPreviewEnabled: true,

	setGithubPreviewEnabled: (enabled) => {
		set({ githubPreviewEnabled: enabled });
		saveSettings({ githubPreviewEnabled: enabled });
	},

	loadSettings: () => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (typeof data.githubPreviewEnabled === "boolean") {
				set({ githubPreviewEnabled: data.githubPreviewEnabled });
			}
		} catch {
			// ignore
		}
	},
}));
