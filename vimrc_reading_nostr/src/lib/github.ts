export type GitHubFileLink = {
	url: string;
	owner: string;
	repo: string;
	branch: string;
	filePath: string;
	startLine?: number;
	endLine?: number;
	rawUrl: string;
	language: string;
};

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
	ts: "typescript",
	tsx: "typescript",
	js: "javascript",
	jsx: "javascript",
	py: "python",
	rb: "ruby",
	rs: "rust",
	go: "go",
	c: "c",
	h: "c",
	cpp: "cpp",
	hpp: "cpp",
	java: "java",
	kt: "kotlin",
	sh: "bash",
	bash: "bash",
	zsh: "zsh",
	fish: "fish",
	vim: "vim",
	lua: "lua",
	json: "json",
	yaml: "yaml",
	yml: "yaml",
	toml: "toml",
	md: "markdown",
	html: "html",
	css: "css",
	scss: "scss",
	sql: "sql",
	xml: "xml",
	swift: "swift",
	zig: "zig",
};

const DOTFILE_LANGUAGE_MAP: Record<string, string> = {
	".vimrc": "vim",
	".gvimrc": "vim",
	".bashrc": "bash",
	".zshrc": "zsh",
	".gitignore": "plaintext",
};

const GITHUB_FILE_URL_PATTERN =
	/https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?(?=\s|$)/g;

export function getLanguageFromPath(filePath: string): string {
	const fileName = filePath.split("/").pop() ?? filePath;

	// Check dotfile map
	if (DOTFILE_LANGUAGE_MAP[fileName]) {
		return DOTFILE_LANGUAGE_MAP[fileName];
	}

	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex === -1 || dotIndex === 0) {
		// No extension; for dotfiles not in map, return plaintext
		if (dotIndex === 0 && !DOTFILE_LANGUAGE_MAP[fileName]) {
			return "plaintext";
		}
		return "plaintext";
	}

	const ext = fileName.slice(dotIndex + 1).toLowerCase();
	return EXTENSION_LANGUAGE_MAP[ext] ?? ext;
}

export function parseGitHubFileUrl(url: string): GitHubFileLink | null {
	const pattern =
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/;
	const match = url.match(pattern);

	if (!match) {
		return null;
	}

	const [, owner, repo, branch, filePath, startLineStr, endLineStr] = match;

	const startLine = startLineStr
		? Number.parseInt(startLineStr, 10)
		: undefined;
	const endLine = endLineStr ? Number.parseInt(endLineStr, 10) : undefined;

	const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
	const language = getLanguageFromPath(filePath);

	return {
		url,
		owner,
		repo,
		branch,
		filePath,
		startLine,
		endLine,
		rawUrl,
		language,
	};
}

export function extractGitHubFileLinks(text: string): GitHubFileLink[] {
	const links: GitHubFileLink[] = [];
	const pattern = new RegExp(GITHUB_FILE_URL_PATTERN.source, "g");

	for (
		let match = pattern.exec(text);
		match !== null;
		match = pattern.exec(text)
	) {
		const parsed = parseGitHubFileUrl(match[0]);
		if (parsed) {
			links.push(parsed);
		}
	}

	return links;
}
