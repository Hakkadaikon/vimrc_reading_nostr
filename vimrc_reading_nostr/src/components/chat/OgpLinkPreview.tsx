import { useEffect, useState } from "react";

type OgpData = {
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
};

type OgpLinkPreviewProps = {
	url: string;
};

const cache = new Map<string, OgpData | null>();

async function fetchOgpData(url: string): Promise<OgpData | null> {
	try {
		const res = await fetch(url, {
			mode: "cors",
			headers: { Accept: "text/html" },
		});
		if (!res.ok) return null;

		const contentType = res.headers.get("content-type") ?? "";
		if (!contentType.includes("text/html")) return null;

		const html = await res.text();
		return parseOgpFromHtml(html, url);
	} catch {
		return null;
	}
}

function getMetaContent(html: string, property: string): string | undefined {
	const pattern = new RegExp(
		`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
		"i",
	);
	const match = html.match(pattern);
	return match?.[1] ?? match?.[2] ?? undefined;
}

function parseOgpFromHtml(html: string, url: string): OgpData | null {
	const title =
		getMetaContent(html, "og:title") ??
		html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();

	if (!title) return null;

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

export function OgpLinkPreview({ url }: OgpLinkPreviewProps) {
	const [ogp, setOgp] = useState<OgpData | null>(cache.get(url) ?? null);
	const [loading, setLoading] = useState(!cache.has(url));

	useEffect(() => {
		if (cache.has(url)) {
			setOgp(cache.get(url) ?? null);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);

		fetchOgpData(url).then((data) => {
			if (cancelled) return;
			cache.set(url, data);
			setOgp(data);
			setLoading(false);
		});

		return () => {
			cancelled = true;
		};
	}, [url]);

	if (loading || !ogp) return null;

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			className="mt-2 flex overflow-hidden rounded border border-[var(--line)] bg-[var(--bg-elev)] transition hover:border-[var(--accent)]"
		>
			{ogp.image && (
				<img
					src={ogp.image}
					alt=""
					className="h-20 w-20 flex-shrink-0 object-cover md:h-24 md:w-32"
					loading="lazy"
				/>
			)}
			<div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
				{ogp.siteName && (
					<span className="text-[10px] text-[var(--fg-mute)]">
						{ogp.siteName}
					</span>
				)}
				<span className="truncate text-sm font-medium text-[var(--fg)]">
					{ogp.title}
				</span>
				{ogp.description && (
					<span className="mt-0.5 line-clamp-2 text-xs text-[var(--fg-dim)]">
						{ogp.description}
					</span>
				)}
			</div>
		</a>
	);
}
