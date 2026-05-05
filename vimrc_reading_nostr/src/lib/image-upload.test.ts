import { describe, expect, it, vi } from "vitest";
import { DEFAULT_IMAGE_UPLOAD_URL, uploadImage } from "./image-upload";

describe("image-upload", () => {
	it("デフォルトのアップロードURLがnostr.buildである", () => {
		expect(DEFAULT_IMAGE_UPLOAD_URL).toBe(
			"https://nostr.build/api/v2/upload/files",
		);
	});

	it("NIP-94形式のレスポンスからURLを取得できる", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
					nip94_event: {
						tags: [
							["url", "https://image.nostr.build/uploaded.png"],
							["m", "image/png"],
							["x", "abc123"],
						],
					},
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL);

		expect(url).toBe("https://image.nostr.build/uploaded.png");
		expect(fetch).toHaveBeenCalledWith(
			DEFAULT_IMAGE_UPLOAD_URL,
			expect.objectContaining({ method: "POST" }),
		);

		vi.unstubAllGlobals();
	});

	it("data配列形式のレスポンスからURLを取得できる", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
					data: [{ url: "https://image.nostr.build/uploaded2.png" }],
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL);

		expect(url).toBe("https://image.nostr.build/uploaded2.png");
		vi.unstubAllGlobals();
	});

	it("dataリンク形式のレスポンスからURLを取得できる", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					success: true,
					data: { link: "https://image.nostr.build/uploaded3.png" },
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL);

		expect(url).toBe("https://image.nostr.build/uploaded3.png");
		vi.unstubAllGlobals();
	});

	it("アップロード失敗時にエラーをthrowする", async () => {
		const mockResponse = {
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		await expect(uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL)).rejects.toThrow(
			"画像のアップロードに失敗しました",
		);

		vi.unstubAllGlobals();
	});

	it("レスポンスにURLが含まれない場合にエラーをthrowする", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		await expect(uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL)).rejects.toThrow(
			"アップロードされた画像のURLを取得できませんでした",
		);

		vi.unstubAllGlobals();
	});
});
