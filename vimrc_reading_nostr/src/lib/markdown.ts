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
		const div = document.createElement("div");
		div.innerHTML = html;
		// scriptタグを除去
		for (const script of div.querySelectorAll("script")) {
			script.remove();
		}
		return div.innerHTML;
	}
	// SSR/テスト環境ではscriptタグを正規表現で除去
	return html.replace(
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		"",
	);
}
