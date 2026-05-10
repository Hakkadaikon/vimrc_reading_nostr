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

		let parsedUrl: URL;
		try {
			parsedUrl = new URL(url);
		} catch {
			return new Response(JSON.stringify({ error: "invalid url" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
			return new Response(JSON.stringify({ error: "invalid url scheme" }), {
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		if (isPrivateHost(parsedUrl.hostname)) {
			return new Response(JSON.stringify({ error: "private ip not allowed" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);
			const res = await fetch(url, {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (compatible; OGPBot/1.0; +https://vimrc-reading.hakkadaikon.com)",
				},
				redirect: "follow",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			if (!res.ok) {
				return new Response(JSON.stringify({ error: "fetch failed" }), {
					status: 502,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				});
			}

			const contentType = res.headers.get("content-type") ?? "";
			if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
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
			while (html.length < 65536) {
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
					"Cache-Control": "public, max-age=3600",
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

function isPrivateHost(hostname: string): boolean {
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") {
		return true;
	}

	// Strip IPv6 brackets
	const host = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;

	// IPv6 private ranges
	if (host.includes(":")) {
		const lower = host.toLowerCase();
		// fc00::/7 (includes fd00::)
		if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;
		// fe80::/10
		if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;
		return false;
	}

	// IPv4 private ranges
	const parts = host.split(".").map(Number);
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
		// Not a valid IPv4 – could be a regular hostname; allow it
		// (except "localhost" which is already blocked above)
		return false;
	}

	// 127.0.0.0/8
	if (parts[0] === 127) return true;
	// 10.0.0.0/8
	if (parts[0] === 10) return true;
	// 172.16.0.0/12
	if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
	// 192.168.0.0/16
	if (parts[0] === 192 && parts[1] === 168) return true;

	return false;
}

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
