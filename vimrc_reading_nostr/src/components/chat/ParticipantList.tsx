import { publicKeyToNpub } from "#/lib/nostr/keys";
import { useProfileStore } from "#/stores/profile-store";

type ParticipantListProps = {
	participantPubkeys: string[];
};

export function ParticipantList({ participantPubkeys }: ParticipantListProps) {
	return (
		<div className="flex flex-col gap-0.5 overflow-y-auto p-2">
			<h2 className="px-2 py-1 text-xs font-semibold text-[var(--fg-mute)]">
				今日の参加者 ({participantPubkeys.length})
			</h2>
			{participantPubkeys.map((pubkey) => (
				<ParticipantItem key={pubkey} pubkey={pubkey} />
			))}
		</div>
	);
}

function ParticipantItem({ pubkey }: { pubkey: string }) {
	const profile = useProfileStore((s) => s.profiles[pubkey]);
	const displayName = useProfileStore((s) => s.getDisplayName(pubkey));

	let npub: string;
	try {
		npub = publicKeyToNpub(pubkey);
	} catch {
		npub = pubkey;
	}
	const profileUrl = `https://njump.me/${npub}`;

	return (
		<a
			href={profileUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[var(--bg-elev-2)]"
		>
			<div className="relative flex-shrink-0">
				{profile?.picture ? (
					<img
						src={profile.picture}
						alt={displayName}
						className="h-5 w-5 rounded-sm object-cover"
					/>
				) : (
					<div className="flex h-5 w-5 items-center justify-center rounded-sm bg-[var(--bg-elev-2)] text-[9px] font-bold text-[var(--fg-dim)]">
						{displayName.slice(0, 2)}
					</div>
				)}
				<span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[var(--bg-pane)] bg-[var(--accent)]" />
			</div>
			<span className="truncate text-[var(--fg)]">{displayName}</span>
		</a>
	);
}
