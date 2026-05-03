import DOMPurify from "dompurify";
import hljs from "highlight.js";
import { marked } from "marked";

marked.setOptions({
	highlight(code: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			return hljs.highlight(code, { language: lang }).value;
		}
		return hljs.highlightAuto(code).value;
	},
});

export function renderMarkdown(content: string): string {
	const html = marked.parse(content, { async: false }) as string;
	if (typeof window !== "undefined" && typeof window.document !== "undefined") {
		return DOMPurify.sanitize(html);
	}
	// SSR環境: scriptタグ・イベントハンドラを除去（フォールバック）
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
		.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, "")
		.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
		.replace(/\s*on\w+\s*=\s*'[^']*'/gi, "")
		.replace(/javascript\s*:/gi, "");
}
