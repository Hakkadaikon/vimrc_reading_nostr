export const DEFAULT_IMAGE_UPLOAD_URL =
	"https://nostr.build/api/v2/upload/files";

export async function uploadImage(
	file: File,
	uploadUrl: string,
): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(uploadUrl, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		throw new Error("画像のアップロードに失敗しました");
	}

	const json = await response.json();
	const url = json?.data?.[0]?.url;
	if (!url) {
		throw new Error("アップロードされた画像のURLを取得できませんでした");
	}

	return url;
}
