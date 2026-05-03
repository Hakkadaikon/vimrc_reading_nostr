import { npubEncode } from "nostr-tools/nip19";
import { useProfileStore } from "#/stores/profile-store";

type ParticipantListProps = {
	participantPubkeys: string[];
};

export function ParticipantList({ participantPubkeys }: ParticipantListProps) {
	return (
		<div className="flex flex-col gap-1 overflow-y-auto p-2">
			<h2 className="px-2 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
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
		npub = npubEncode(pubkey);
	} catch {
		npub = pubkey;
	}

	const profileUrl = `https://njump.me/${npub}`;

	return (
		<a
			href={profileUrl}
			target="_blank"
			rel="noopener noreferrer"
			className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
		>
			{profile?.picture ? (
				<img
					src={profile.picture}
					alt={displayName}
					className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
				/>
			) : (
				<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-300">
					{displayName.slice(0, 2)}
				</div>
			)}
			<span className="truncate text-[var(--sea-ink)]">{displayName}</span>
		</a>
	);
}
