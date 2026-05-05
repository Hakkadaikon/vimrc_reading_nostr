import { create } from "zustand";
import { DEFAULT_IMAGE_UPLOAD_URL } from "#/lib/image-upload";

export const SETTINGS_STORAGE_KEY = "app_settings";

type Settings = {
	githubPreviewEnabled: boolean;
	imageUploadUrl: string;
};

type SettingsState = Settings & {
	setGithubPreviewEnabled: (enabled: boolean) => void;
	setImageUploadUrl: (url: string) => void;
	loadSettings: () => void;
};

function saveSettings(state: SettingsState): void {
	if (typeof window === "undefined") return;
	const settings: Settings = {
		githubPreviewEnabled: state.githubPreviewEnabled,
		imageUploadUrl: state.imageUploadUrl,
	};
	window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	githubPreviewEnabled: true,
	imageUploadUrl: DEFAULT_IMAGE_UPLOAD_URL,

	setGithubPreviewEnabled: (enabled) => {
		set({ githubPreviewEnabled: enabled });
		saveSettings(get());
	},

	setImageUploadUrl: (url) => {
		set({ imageUploadUrl: url });
		saveSettings(get());
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
			if (typeof data.imageUploadUrl === "string") {
				set({ imageUploadUrl: data.imageUploadUrl });
			}
		} catch {
			// ignore
		}
	},
}));
