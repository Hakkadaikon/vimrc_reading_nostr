import { createServerFn } from "@tanstack/react-start";

type OgpResult = {
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
	error?: string;
};

export const fetchOgp = createServerFn({ method: "GET" })
	.inputValidator((input: { url: string }) => input)
	.handler(async ({ data }): Promise<OgpResult> => {
		const { url } = data;

		try {
			new URL(url);
		} catch {
			return { error: "invalid url" };
		}

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "bot" },
				redirect: "follow",
			});
			if (!res.ok) {
				return { error: "fetch failed" };
			}

			const contentType = res.headers.get("content-type") ?? "";
			if (!contentType.includes("text/html")) {
				return { error: "not html" };
			}

			const reader = res.body?.getReader();
			if (!reader) {
				return { error: "no body" };
			}

			let html = "";
			const decoder = new TextDecoder();
			while (html.length < 16384) {
				const { done, value } = await reader.read();
				if (done) break;
				html += decoder.decode(value, { stream: true });
			}
			reader.cancel();

			return parseOgpFromHtml(html, url);
		} catch {
			return { error: "fetch error" };
		}
	});

function getMetaContent(html: string, property: string): string | undefined {
	const pattern = new RegExp(
		`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
		"i",
	);
	const match = html.match(pattern);
	return match?.[1] ?? match?.[2] ?? undefined;
}

function parseOgpFromHtml(html: string, url: string): OgpResult {
	const title =
		getMetaContent(html, "og:title") ??
		html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
	const description =
		getMetaContent(html, "og:description") ??
		getMetaContent(html, "description");
	let image = getMetaContent(html, "og:image");
	const siteName = getMetaContent(html, "og:site_name");

	if (image && !image.startsWith("http")) {
		try {
			image = new URL(image, url).href;
		} catch {
			image = undefined;
		}
	}

	return { title, description, image, siteName };
}
