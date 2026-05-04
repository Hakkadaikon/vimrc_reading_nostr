import { useEffect, useState } from "react";
import { fetchOgp } from "#/lib/ogp-server";

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

		fetchOgp({ data: { url } })
			.then((data) => {
				if (cancelled) return;
				const result =
					data && "title" in data && data.title ? (data as OgpData) : null;
				cache.set(url, result);
				setOgp(result);
				setLoading(false);
			})
			.catch(() => {
				if (cancelled) return;
				cache.set(url, null);
				setOgp(null);
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
