/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_IMAGE_UPLOAD_URL } from "#/lib/image-upload";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "./settings-store";

const mockStorage = new Map<string, string>();
const storageMock = {
	getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
	removeItem: vi.fn((key: string) => mockStorage.delete(key)),
	clear: vi.fn(() => mockStorage.clear()),
};

vi.stubGlobal("localStorage", storageMock);

describe("useSettingsStore", () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.clearAllMocks();
		useSettingsStore.setState({
			githubPreviewEnabled: true,
			imageUploadUrl: DEFAULT_IMAGE_UPLOAD_URL,
		});
	});

	it("初期状態ではGitHubプレビューが有効", () => {
		expect(useSettingsStore.getState().githubPreviewEnabled).toBe(true);
	});

	it("GitHubプレビューを無効にできる", () => {
		useSettingsStore.getState().setGithubPreviewEnabled(false);
		expect(useSettingsStore.getState().githubPreviewEnabled).toBe(false);
	});

	it("設定変更がlocalStorageに保存される", () => {
		useSettingsStore.getState().setGithubPreviewEnabled(false);
		const stored = JSON.parse(mockStorage.get(SETTINGS_STORAGE_KEY) ?? "{}");
		expect(stored.githubPreviewEnabled).toBe(false);
	});

	it("localStorageから設定を復元できる", () => {
		mockStorage.set(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({ githubPreviewEnabled: false }),
		);
		useSettingsStore.getState().loadSettings();
		expect(useSettingsStore.getState().githubPreviewEnabled).toBe(false);
	});

	it("初期状態で画像アップロードURLがデフォルト値", () => {
		expect(useSettingsStore.getState().imageUploadUrl).toBe(
			DEFAULT_IMAGE_UPLOAD_URL,
		);
	});

	it("画像アップロードURLを変更できる", () => {
		useSettingsStore.getState().setImageUploadUrl("https://example.com/upload");
		expect(useSettingsStore.getState().imageUploadUrl).toBe(
			"https://example.com/upload",
		);
	});

	it("画像アップロードURLがlocalStorageに保存される", () => {
		useSettingsStore.getState().setImageUploadUrl("https://example.com/upload");
		const stored = JSON.parse(mockStorage.get(SETTINGS_STORAGE_KEY) ?? "{}");
		expect(stored.imageUploadUrl).toBe("https://example.com/upload");
	});

	it("localStorageから画像アップロードURLを復元できる", () => {
		mockStorage.set(
			SETTINGS_STORAGE_KEY,
			JSON.stringify({ imageUploadUrl: "https://custom.host/upload" }),
		);
		useSettingsStore.getState().loadSettings();
		expect(useSettingsStore.getState().imageUploadUrl).toBe(
			"https://custom.host/upload",
		);
	});
});
