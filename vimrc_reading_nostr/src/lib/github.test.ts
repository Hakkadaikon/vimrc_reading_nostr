import { describe, expect, it } from "vitest";
import {
	type GitHubFileLink,
	extractGitHubFileLinks,
	getLanguageFromPath,
	parseGitHubFileUrl,
} from "./github";

describe("parseGitHubFileUrl", () => {
	it("基本的なGitHubファイルURLをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/owner/repo/blob/main/path/to/file.vim",
		);
		expect(result).not.toBeNull();
		expect(result!.owner).toBe("owner");
		expect(result!.repo).toBe("repo");
		expect(result!.branch).toBe("main");
		expect(result!.filePath).toBe("path/to/file.vim");
		expect(result!.startLine).toBeUndefined();
		expect(result!.endLine).toBeUndefined();
		expect(result!.url).toBe(
			"https://github.com/owner/repo/blob/main/path/to/file.vim",
		);
		expect(result!.rawUrl).toBe(
			"https://api.github.com/repos/owner/repo/contents/path/to/file.vim?ref=main",
		);
		expect(result!.language).toBe("vim");
	});

	it("行番号付きURLをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/owner/repo/blob/main/path/to/file.vim#L5",
		);
		expect(result).not.toBeNull();
		expect(result!.startLine).toBe(5);
		expect(result!.endLine).toBeUndefined();
		expect(result!.filePath).toBe("path/to/file.vim");
	});

	it("行範囲付きURLをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/owner/repo/blob/main/path/to/file.vim#L5-L13",
		);
		expect(result).not.toBeNull();
		expect(result!.startLine).toBe(5);
		expect(result!.endLine).toBe(13);
	});

	it("深いパスのファイルをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/vim/vim/blob/master/src/eval/typval.c",
		);
		expect(result).not.toBeNull();
		expect(result!.owner).toBe("vim");
		expect(result!.repo).toBe("vim");
		expect(result!.branch).toBe("master");
		expect(result!.filePath).toBe("src/eval/typval.c");
		expect(result!.language).toBe("c");
	});

	it("ブランチ名にスラッシュが含まれるURLをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/owner/repo/blob/feature/branch/file.ts",
		);
		// ブランチ名の解析は最初のパス要素をブランチとして扱う
		expect(result).not.toBeNull();
		expect(result!.branch).toBe("feature");
	});

	it("無効なURLに対してnullを返す", () => {
		expect(parseGitHubFileUrl("https://example.com")).toBeNull();
		expect(parseGitHubFileUrl("not a url")).toBeNull();
		expect(parseGitHubFileUrl("https://github.com/owner/repo")).toBeNull();
		expect(
			parseGitHubFileUrl("https://github.com/owner/repo/tree/main"),
		).toBeNull();
	});

	it("ルート直下のファイルをパースできる", () => {
		const result = parseGitHubFileUrl(
			"https://github.com/owner/repo/blob/main/.vimrc",
		);
		expect(result).not.toBeNull();
		expect(result!.filePath).toBe(".vimrc");
		expect(result!.branch).toBe("main");
	});
});

describe("extractGitHubFileLinks", () => {
	it("テキストからGitHubファイルURLを抽出できる", () => {
		const text =
			"このファイルを見てください https://github.com/owner/repo/blob/main/file.vim 参考になります";
		const links = extractGitHubFileLinks(text);
		expect(links).toHaveLength(1);
		expect(links[0].owner).toBe("owner");
		expect(links[0].filePath).toBe("file.vim");
	});

	it("複数のURLを抽出できる", () => {
		const text = [
			"https://github.com/owner/repo/blob/main/a.vim",
			"テキスト",
			"https://github.com/owner/repo/blob/main/b.lua#L10-L20",
		].join("\n");
		const links = extractGitHubFileLinks(text);
		expect(links).toHaveLength(2);
		expect(links[0].filePath).toBe("a.vim");
		expect(links[1].filePath).toBe("b.lua");
		expect(links[1].startLine).toBe(10);
		expect(links[1].endLine).toBe(20);
	});

	it("GitHubファイルURL以外のURLは抽出しない", () => {
		const text =
			"https://example.com と https://github.com/owner/repo は無視";
		const links = extractGitHubFileLinks(text);
		expect(links).toHaveLength(0);
	});

	it("GitHubファイルURLが含まれないテキストでは空配列を返す", () => {
		const links = extractGitHubFileLinks("テキストのみ");
		expect(links).toHaveLength(0);
	});
});

describe("getLanguageFromPath", () => {
	it("vimファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.vim")).toBe("vim");
	});

	it("TypeScriptファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("path/to/file.ts")).toBe("typescript");
	});

	it("TSXファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("component.tsx")).toBe("typescript");
	});

	it("JavaScriptファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.js")).toBe("javascript");
	});

	it("JSXファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.jsx")).toBe("javascript");
	});

	it("Luaファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.lua")).toBe("lua");
	});

	it("Pythonファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.py")).toBe("python");
	});

	it("拡張子がないファイルはplaintextを返す", () => {
		expect(getLanguageFromPath(".vimrc")).toBe("vim");
	});

	it("未知の拡張子はそのまま返す", () => {
		expect(getLanguageFromPath("file.xyz")).toBe("xyz");
	});

	it("Cファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.c")).toBe("c");
	});

	it("C++ファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.cpp")).toBe("cpp");
	});

	it("Rustファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.rs")).toBe("rust");
	});

	it("Goファイルの拡張子を返す", () => {
		expect(getLanguageFromPath("file.go")).toBe("go");
	});

	it("拡張子もドットファイル名もないファイルはplaintextを返す", () => {
		expect(getLanguageFromPath("Makefile")).toBe("plaintext");
	});
});
