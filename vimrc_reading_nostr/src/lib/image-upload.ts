import type { EventTemplate } from "nostr-tools/pure";
import { finalizeEvent } from "nostr-tools/pure";

export const DEFAULT_IMAGE_UPLOAD_URL =
	"https://nostr.build/api/v2/nip96/upload";

function createNip98AuthEvent(
	url: string,
	method: string,
	payloadHash?: string,
): EventTemplate {
	const tags: string[][] = [
		["u", url],
		["method", method],
	];
	if (payloadHash) {
		tags.push(["payload", payloadHash]);
	}
	return {
		kind: 27235,
		created_at: Math.floor(Date.now() / 1000),
		content: "",
		tags,
	};
}

function extractUrlFromResponse(json: unknown): string | null {
	if (!json || typeof json !== "object") return null;
	const obj = json as Record<string, unknown>;

	// NIP-94形式: { nip94_event: { tags: [["url", "..."], ...] } }
	const nip94 = obj.nip94_event as Record<string, unknown> | undefined;
	if (nip94?.tags && Array.isArray(nip94.tags)) {
		const urlTag = (nip94.tags as string[][]).find((t) => t[0] === "url");
		if (urlTag?.[1]) return urlTag[1];
	}

	// 配列形式: { data: [{ url: "..." }] }
	if (Array.isArray(obj.data) && obj.data[0]?.url) {
		return obj.data[0].url as string;
	}

	// リンク形式: { data: { link: "..." } }
	if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
		const data = obj.data as Record<string, unknown>;
		if (typeof data.link === "string") return data.link;
	}

	return null;
}

export async function uploadImage(
	file: File,
	uploadUrl: string,
	secretKey: Uint8Array,
): Promise<string> {
	if (file.size > 10 * 1024 * 1024) {
		throw new Error("ファイルサイズが10MBを超えています");
	}

	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const payloadHash = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	const authTemplate = createNip98AuthEvent(uploadUrl, "POST", payloadHash);
	const signedAuth = finalizeEvent(authTemplate, secretKey);
	const token = btoa(JSON.stringify(signedAuth));

	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(uploadUrl, {
		method: "POST",
		headers: {
			Authorization: `Nostr ${token}`,
		},
		body: formData,
	});

	if (!response.ok) {
		throw new Error("画像のアップロードに失敗しました");
	}

	const json = await response.json();
	const url = extractUrlFromResponse(json);
	if (!url) {
		throw new Error("アップロードされた画像のURLを取得できませんでした");
	}

	if (!url.startsWith("https://")) {
		throw new Error("安全でないURLが返されました");
	}

	return url;
}
