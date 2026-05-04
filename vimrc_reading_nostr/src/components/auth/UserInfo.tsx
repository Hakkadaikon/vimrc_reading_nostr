import { memo } from "react";
import { useAuthStore } from "#/stores/auth-store";
import { useProfileStore } from "#/stores/profile-store";

export const UserInfo = memo(function UserInfo() {
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
					className="h-5 w-5 rounded-sm object-cover"
				/>
			) : (
				<div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--bg-elev-2)] text-[9px] font-bold text-[var(--fg-dim)]">
					{displayName.slice(0, 1)}
				</div>
			)}
			<span className="max-w-[120px] truncate text-xs font-medium text-[var(--fg)]">
				{displayName}
			</span>
		</div>
	);
});
