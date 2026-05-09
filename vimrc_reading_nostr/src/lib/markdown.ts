import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { type Renderer, marked } from "marked";

const renderer: Partial<Renderer> = {
	code({ text, lang }: { text: string; lang?: string }) {
		const language = lang && hljs.getLanguage(lang) ? lang : undefined;
		const highlighted = language
			? hljs.highlight(text, { language }).value
			: hljs.highlightAuto(text).value;
		return `<pre><code class="hljs${language ? ` language-${language}` : ""}">${highlighted}</code></pre>`;
	},
};

marked.setOptions({ breaks: true });
marked.use({ renderer });

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function renderMarkdown(content: string): string {
	const escaped = escapeHtml(content);
	const html = marked.parse(escaped, { async: false }) as string;
	if (typeof window !== "undefined" && typeof window.document !== "undefined") {
		return DOMPurify.sanitize(html);
	}
	return html;
}
