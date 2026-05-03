import { useAuthStore } from "#/stores/auth-store";
import { useProfileStore } from "#/stores/profile-store";

export function UserInfo() {
	const publicKey = useAuthStore((s) => s.publicKey);
	const profile = useProfileStore((s) =>
		publicKey ? s.profiles[publicKey] : undefined,
	);
	const displayName = useProfileStore((s) =>
		publicKey ? s.getDisplayName(publicKey) : null,
	);

	if (!publicKey || !displayName) return null;

	return (
		<div className="flex items-center gap-2">
			{profile?.picture ? (
				<img
					src={profile.picture}
					alt={displayName}
					className="h-6 w-6 rounded-full object-cover"
				/>
			) : (
				<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-300">
					{displayName.slice(0, 1)}
				</div>
			)}
			<span className="max-w-[120px] truncate text-sm font-medium text-[var(--sea-ink)]">
				{displayName}
			</span>
		</div>
	);
}
