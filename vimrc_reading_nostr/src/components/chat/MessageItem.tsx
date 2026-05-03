import { useMemo } from "react";
import { extractGitHubFileLinks } from "#/lib/github";
import { renderMarkdown } from "#/lib/markdown";
import { encodeNevent } from "#/lib/nostr/nip19";
import { useAuthStore } from "#/stores/auth-store";
import type { NostrMessage } from "#/stores/message-store";
import { useMessageStore } from "#/stores/message-store";
import { useProfileStore } from "#/stores/profile-store";
import { useReactionStore } from "#/stores/reaction-store";
import { useSettingsStore } from "#/stores/settings-store";
import { GitHubCodePreview } from "./GitHubCodePreview";

type MessageItemProps = {
	message: NostrMessage;
	highlighted?: boolean;
	onReact?: (eventId: string, pubkey: string) => void;
	onDelete?: (eventId: string) => void;
};

export function MessageItem({
	message,
	highlighted,
	onReact,
	onDelete,
}: MessageItemProps) {
	// profilesオブジェクトを直接購読し、変更時に再レンダーされるようにする
	const profile = useProfileStore((s) => s.profiles[message.pubkey]);
	const displayName = useProfileStore((s) => s.getDisplayName(message.pubkey));
	const reactionCount = useReactionStore((s) => s.getReactionCount(message.id));
	const isDeleted = useMessageStore((s) => s.deletedIds.has(message.id));
	const currentPubkey = useAuthStore((s) => s.publicKey);
	const isOwn = currentPubkey === message.pubkey;
	const nevent = useMemo(() => encodeNevent(message.id), [message.id]);
	const time = new Date(message.created_at * 1000);
	const timeString = time.toLocaleString("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const html = useMemo(
		() => renderMarkdown(message.content),
		[message.content],
	);

	const githubPreviewEnabled = useSettingsStore((s) => s.githubPreviewEnabled);

	const githubLinks = useMemo(
		() => (githubPreviewEnabled ? extractGitHubFileLinks(message.content) : []),
		[message.content, githubPreviewEnabled],
	);

	if (isDeleted) {
		return (
			<div
				id={`msg-${message.id}`}
				className="px-4 py-2 text-sm text-gray-400 italic"
			>
				このメッセージは削除されました
			</div>
		);
	}

	return (
		<div
			id={`msg-${message.id}`}
			className={`group flex gap-3 px-4 py-3 transition-colors ${
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
				{githubLinks.length > 0 && (
					<div className="mt-2 space-y-2">
						{githubLinks.map((link) => (
							<GitHubCodePreview key={link.url} link={link} />
						))}
					</div>
				)}
				<div className="mt-1 flex items-center gap-2">
					{onReact && (
						<button
							type="button"
							onClick={() => onReact(message.id, message.pubkey)}
							className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-500 opacity-0 transition hover:bg-gray-100 group-hover:opacity-100 dark:hover:bg-gray-700"
							title="リアクション"
						>
							<span>+</span>
							{reactionCount > 0 && <span>{reactionCount}</span>}
						</button>
					)}
					{reactionCount > 0 && !onReact && (
						<span className="text-xs text-gray-500">+{reactionCount}</span>
					)}
					{isOwn && onDelete && (
						<button
							type="button"
							onClick={() => onDelete(message.id)}
							className="rounded px-2 py-0.5 text-xs text-red-400 opacity-0 transition hover:bg-red-50 group-hover:opacity-100 dark:hover:bg-red-900/20"
							title="削除"
						>
							削除
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
