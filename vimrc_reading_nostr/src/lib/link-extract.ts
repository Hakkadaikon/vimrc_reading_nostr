const URL_PATTERN = /https?:\/\/[^\s<>)"']+/g;
const GITHUB_FILE_PATTERN = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\//;

export function extractOgpLinks(content: string): string[] {
	const matches = content.match(URL_PATTERN);
	if (!matches) return [];

	const seen = new Set<string>();
	const links: string[] = [];

	for (const url of matches) {
		// GitHub blob URLは既存のGitHubプレビューで処理するため除外
		if (GITHUB_FILE_PATTERN.test(url)) continue;
		if (seen.has(url)) continue;
		seen.add(url);
		links.push(url);
	}

	return links;
}
