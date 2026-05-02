import { renderMarkdown } from "#/lib/markdown";
import { encodeNevent } from "#/lib/nostr/nip19";
import type { NostrMessage } from "#/stores/message-store";
import { useProfileStore } from "#/stores/profile-store";

type MessageItemProps = {
	message: NostrMessage;
	highlighted?: boolean;
};

export function MessageItem({ message, highlighted }: MessageItemProps) {
	const getDisplayName = useProfileStore((s) => s.getDisplayName);
	const getProfile = useProfileStore((s) => s.getProfile);
	const profile = getProfile(message.pubkey);
	const displayName = getDisplayName(message.pubkey);
	const nevent = encodeNevent(message.id);
	const time = new Date(message.created_at * 1000);
	const timeString = time.toLocaleString("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const html = renderMarkdown(message.content);

	return (
		<div
			id={`msg-${message.id}`}
			className={`flex gap-3 px-4 py-3 transition-colors ${
				highlighted
					? "bg-yellow-50 dark:bg-yellow-900/20"
					: "hover:bg-gray-50 dark:hover:bg-gray-800/50"
			}`}
		>
			<div className="flex-shrink-0">
				{profile?.picture ? (
					<img
						src={profile.picture}
						alt={displayName}
						className="h-8 w-8 rounded-full object-cover"
					/>
				) : (
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600 dark:bg-gray-600 dark:text-gray-300">
						{displayName.slice(0, 2)}
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="text-sm font-semibold text-[var(--sea-ink)]">
						{displayName}
					</span>
					<a
						href={`?nevent=${nevent}`}
						className="text-xs text-[var(--sea-ink-soft)] hover:underline"
						title="Permalink"
					>
						{timeString}
					</a>
				</div>
				<div
					className="prose prose-sm mt-1 max-w-none dark:prose-invert [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-100 [&_pre]:p-3 dark:[&_pre]:bg-gray-800 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 dark:[&_code]:bg-gray-800"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Markdown rendered and sanitized by renderMarkdown
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>
		</div>
	);
}
