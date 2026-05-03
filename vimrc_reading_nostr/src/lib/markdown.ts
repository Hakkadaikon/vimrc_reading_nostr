import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";

marked.setOptions({
	breaks: true,
	highlight(code: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			return hljs.highlight(code, { language: lang }).value;
		}
		return hljs.highlightAuto(code).value;
	},
});

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
