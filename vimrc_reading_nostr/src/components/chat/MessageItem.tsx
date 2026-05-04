import { Check, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

	const [copied, setCopied] = useState(false);
	const handleCopy = useCallback(async () => {
		await navigator.clipboard.writeText(message.content);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [message.content]);

	if (isDeleted) {
		return null;
	}

	return (
		<div
			id={`msg-${message.id}`}
			className={`group flex gap-2 px-3 py-2 transition-colors md:gap-3 md:px-4 md:py-2.5 ${
				highlighted
					? "bg-[rgba(250,189,47,0.08)]"
					: "hover:bg-[var(--bg-elev-2)]"
			}`}
		>
			{/* Line number gutter */}
			<div className="flex-shrink-0 w-10 pt-0.5 text-right text-xs text-[var(--gutter)] select-none">
				{timeString.split(" ")[1] || timeString}
			</div>
			<div className="flex-shrink-0">
				{profile?.picture ? (
					<img
						src={profile.picture}
						alt={displayName}
						className="h-7 w-7 rounded-sm object-cover"
					/>
				) : (
					<div className="flex h-7 w-7 items-center justify-center rounded-sm bg-[var(--bg-elev-2)] text-[10px] font-bold text-[var(--fg-dim)]">
						{displayName.slice(0, 2)}
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="text-sm font-semibold text-[var(--accent)]">
						{displayName}
					</span>
					<a
						href={`?nevent=${nevent}`}
						className="text-xs text-[var(--fg-mute)] hover:text-[var(--fg-dim)] hover:underline"
						title="Permalink"
					>
						{timeString}
					</a>
				</div>
				<div
					className="prose prose-sm prose-invert mt-1 max-w-none [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-[var(--bg-pane)] [&_pre]:p-3 [&_code]:rounded [&_code]:bg-[var(--bg-pane)] [&_code]:px-1"
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
					<button
						type="button"
						onClick={handleCopy}
						className="rounded px-1.5 py-0.5 text-[var(--fg-mute)] opacity-0 transition hover:bg-[var(--bg-elev-2)] group-hover:opacity-100"
						title="コピー"
					>
						{copied ? (
							<Check className="h-3.5 w-3.5 text-[var(--accent)]" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</button>
					{onReact && (
						<button
							type="button"
							onClick={() => onReact(message.id, message.pubkey)}
							className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[var(--fg-mute)] opacity-0 transition hover:bg-[var(--bg-elev-2)] group-hover:opacity-100"
							title="リアクション"
						>
							<span>+</span>
							{reactionCount > 0 && <span>{reactionCount}</span>}
						</button>
					)}
					{reactionCount > 0 && !onReact && (
						<span className="text-xs text-[var(--fg-mute)]">
							+{reactionCount}
						</span>
					)}
					{isOwn && onDelete && (
						<button
							type="button"
							onClick={() => onDelete(message.id)}
							className="rounded px-2 py-0.5 text-xs text-[var(--err)] opacity-0 transition hover:bg-[rgba(251,73,52,0.1)] group-hover:opacity-100"
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
