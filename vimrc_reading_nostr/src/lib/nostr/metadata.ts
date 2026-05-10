import type { UserProfile } from "#/stores/profile-store";

function sanitizeUrl(url: unknown): string | undefined {
	if (typeof url !== "string") return undefined;
	try {
		const parsed = new URL(url);
		if (parsed.protocol === "https:" || parsed.protocol === "http:") {
			return url;
		}
		return undefined;
	} catch {
		return undefined;
	}
}

export function parseProfileMetadata(content: string): UserProfile | null {
	try {
		const data = JSON.parse(content);
		return {
			name: data.name,
			display_name: data.display_name,
			picture: sanitizeUrl(data.picture),
			about: data.about,
		};
	} catch {
		return null;
	}
}
