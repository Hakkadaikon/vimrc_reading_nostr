export default {
	async fetch(request: Request): Promise<Response> {
		const corsHeaders = {
			"Access-Control-Allow-Origin": "https://vimrc-reading.hakkadaikon.com",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url).searchParams.get("url");
		if (!url) {
			return new Response(JSON.stringify({ error: "url required" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		try {
			new URL(url);
		} catch {
			return new Response(JSON.stringify({ error: "invalid url" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		try {
			const res = await fetch(url, {
				headers: { "User-Agent": "bot" },
				redirect: "follow",
			});

			if (!res.ok) {
				return new Response(JSON.stringify({ error: "fetch failed" }), {
					status: 502,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			const contentType = res.headers.get("content-type") ?? "";
			if (!contentType.includes("text/html")) {
				return new Response(JSON.stringify({ error: "not html" }), {
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			const reader = res.body?.getReader();
			if (!reader) {
				return new Response(JSON.stringify({ error: "no body" }), {
					status: 502,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			let html = "";
			const decoder = new TextDecoder();
			while (html.length < 16384) {
				const { done, value } = await reader.read();
				if (done) break;
				html += decoder.decode(value, { stream: true });
			}
			reader.cancel();

			const ogp = parseOgpFromHtml(html, url);

			return new Response(JSON.stringify(ogp), {
				headers: {
					...corsHeaders,
					"Content-Type": "application/json",
					"Cache-Control": "public, max-age=86400",
				},
			});
		} catch {
			return new Response(JSON.stringify({ error: "fetch error" }), {
				status: 502,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}
	},
};

function getMetaContent(html: string, property: string): string | undefined {
	const pattern = new RegExp(
		`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
		"i",
	);
	const match = html.match(pattern);
	return match?.[1] ?? match?.[2] ?? undefined;
}

function parseOgpFromHtml(
	html: string,
	url: string,
): {
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
} {
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
