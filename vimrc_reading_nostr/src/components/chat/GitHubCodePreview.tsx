import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { GitHubFileLink } from "#/lib/github";

type GitHubCodePreviewProps = {
	link: GitHubFileLink;
};

export function GitHubCodePreview({ link }: GitHubCodePreviewProps) {
	const [code, setCode] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		setLoading(true);
		setError(null);
		setCode(null);

		fetch(link.rawUrl, {
			signal: controller.signal,
			headers: { Accept: "application/vnd.github.raw+json" },
		})
			.then((res) => {
				if (!res.ok) {
					throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
				}
				return res.text();
			})
			.then((text) => {
				if (link.startLine != null) {
					const lines = text.split("\n");
					const start = link.startLine - 1;
					const end = link.endLine ?? link.startLine;
					setCode(lines.slice(start, end).join("\n"));
				} else {
					setCode(text);
				}
			})
			.catch((err) => {
				if (err.name !== "AbortError") {
					setError(err.message ?? "Failed to fetch code");
				}
			})
			.finally(() => setLoading(false));

		return () => controller.abort();
	}, [link.rawUrl, link.startLine, link.endLine]);

	const lineRange =
		link.startLine != null
			? link.endLine != null && link.endLine !== link.startLine
				? `L${link.startLine}-L${link.endLine}`
				: `L${link.startLine}`
			: null;

	const headerLabel = `${link.owner}/${link.repo} - ${link.filePath}${lineRange ? ` ${lineRange}` : ""}`;

	return (
		<div className="my-2 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 text-xs dark:bg-gray-800">
				<svg
					className="h-4 w-4 flex-shrink-0 text-[var(--sea-ink-soft)]"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
				</svg>
				<a
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					className="truncate text-[var(--sea-ink)] hover:underline"
					title={headerLabel}
				>
					{headerLabel}
				</a>
			</div>

			{loading && (
				<div className="px-3 py-4 text-center text-sm text-[var(--sea-ink-soft)]">
					読み込み中...
				</div>
			)}

			{error && (
				<div className="px-3 py-4 text-center text-sm text-red-500">
					{error}
				</div>
			)}

			{code != null && (
				<div className="max-h-80 overflow-auto">
					<SyntaxHighlighter
						language={link.language}
						style={oneDark}
						showLineNumbers
						startingLineNumber={link.startLine ?? 1}
						customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem" }}
					>
						{code}
					</SyntaxHighlighter>
				</div>
			)}
		</div>
	);
}
