import type { UserProfile } from "#/stores/profile-store";

export function parseProfileMetadata(content: string): UserProfile | null {
	try {
		const data = JSON.parse(content);
		return {
			name: data.name,
			picture: data.picture,
			about: data.about,
		};
	} catch {
		return null;
	}
}
