import { generateSecretKey } from "nostr-tools/pure";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_IMAGE_UPLOAD_URL, uploadImage } from "./image-upload";

describe("image-upload", () => {
	const secretKey = generateSecretKey();

	it("デフォルトのアップロードURLがnostr.buildである", () => {
		expect(DEFAULT_IMAGE_UPLOAD_URL).toBe(
			"https://nostr.build/api/v2/nip96/upload",
		);
	});

	it("NIP-98認証ヘッダー付きでアップロードする", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
					nip94_event: {
						tags: [
							["url", "https://image.nostr.build/uploaded.png"],
							["m", "image/png"],
						],
					},
				}),
		};
		const fetchMock = vi.fn().mockResolvedValue(mockResponse);
		vi.stubGlobal("fetch", fetchMock);

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL, secretKey);

		expect(url).toBe("https://image.nostr.build/uploaded.png");
		expect(fetchMock).toHaveBeenCalledWith(
			DEFAULT_IMAGE_UPLOAD_URL,
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					Authorization: expect.stringMatching(/^Nostr /),
				}),
			}),
		);

		// Authorization ヘッダーの中身がBase64エンコードされたkind:27235イベントであることを確認
		const callArgs = fetchMock.mock.calls[0][1];
		const token = callArgs.headers.Authorization.replace("Nostr ", "");
		const event = JSON.parse(atob(token));
		expect(event.kind).toBe(27235);
		expect(event.tags).toContainEqual(["u", DEFAULT_IMAGE_UPLOAD_URL]);
		expect(event.tags).toContainEqual(["method", "POST"]);

		vi.unstubAllGlobals();
	});

	it("NIP-94形式のレスポンスからURLを取得できる", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
					nip94_event: {
						tags: [["url", "https://image.nostr.build/nip94.png"]],
					},
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL, secretKey);

		expect(url).toBe("https://image.nostr.build/nip94.png");
		vi.unstubAllGlobals();
	});

	it("data配列形式のレスポンスからURLを取得できる", async () => {
		const mockResponse = {
			ok: true,
			json: () =>
				Promise.resolve({
					status: "success",
					data: [{ url: "https://image.nostr.build/data-array.png" }],
				}),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		const url = await uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL, secretKey);

		expect(url).toBe("https://image.nostr.build/data-array.png");
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
		await expect(
			uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL, secretKey),
		).rejects.toThrow("画像のアップロードに失敗しました");

		vi.unstubAllGlobals();
	});

	it("レスポンスにURLが含まれない場合にエラーをthrowする", async () => {
		const mockResponse = {
			ok: true,
			json: () => Promise.resolve({ status: "success" }),
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse));

		const file = new File(["dummy"], "test.png", { type: "image/png" });
		await expect(
			uploadImage(file, DEFAULT_IMAGE_UPLOAD_URL, secretKey),
		).rejects.toThrow("アップロードされた画像のURLを取得できませんでした");

		vi.unstubAllGlobals();
	});
});
