/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
	it("プレーンテキストをpタグで囲む", () => {
		const result = renderMarkdown("Hello");
		expect(result).toContain("Hello");
		expect(result).toContain("<p>");
	});

	it("Markdownの太字をstrongタグに変換する", () => {
		const result = renderMarkdown("**bold**");
		expect(result).toContain("<strong>bold</strong>");
	});

	it("インラインコードをcodeタグに変換する", () => {
		const result = renderMarkdown("`code`");
		expect(result).toContain("<code>code</code>");
	});

	it("コードブロックをpreとcodeタグに変換する", () => {
		const result = renderMarkdown("```vim\nset number\n```");
		expect(result).toContain("<pre>");
		expect(result).toContain("<code");
		expect(result).toContain("set number");
	});

	it("scriptタグをサニタイズする", () => {
		const result = renderMarkdown('<script>alert("xss")</script>');
		expect(result).not.toContain("<script>");
	});

	it("imgタグのonerrorイベントハンドラが実行不可能になる", () => {
		const result = renderMarkdown('<img src=x onerror=alert("xss")>');
		// DOMPurifyがonerror属性を除去するか、タグ全体をエスケープする
		expect(result).not.toMatch(/<img[^>]+onerror/);
	});

	it("iframeタグを除去する", () => {
		const result = renderMarkdown('<iframe src="https://evil.com"></iframe>');
		expect(result).not.toContain("<iframe");
	});

	it("javascript:URLを除去する", () => {
		const result = renderMarkdown('[click](javascript:alert("xss"))');
		expect(result).not.toContain("javascript:");
	});

	it("onloadイベントハンドラを除去する", () => {
		const result = renderMarkdown('<div onload="alert(1)">test</div>');
		expect(result).not.toContain("onload");
	});

	it("SVG内のscriptを除去する", () => {
		const result = renderMarkdown('<svg><script>alert("xss")</script></svg>');
		expect(result).not.toContain("<script>");
	});

	it("リンクを変換する", () => {
		const result = renderMarkdown("[link](https://example.com)");
		expect(result).toContain('href="https://example.com"');
		expect(result).toContain("link");
	});
});
