import { createFileRoute } from "@tanstack/react-router";
import type { Event } from "nostr-tools/core";
import { finalizeEvent } from "nostr-tools/pure";
import { useCallback, useEffect, useState } from "react";
import { LoginDialog } from "#/components/auth/LoginDialog";
import { MessageForm } from "#/components/chat/MessageForm";
import { MessageList } from "#/components/chat/MessageList";
import { ConnectionStatus } from "#/components/common/ConnectionStatus";
import { useRelayPool } from "#/hooks/useRelayPool";
import { CHANNEL_ID, createChannelMessageFilter } from "#/lib/nostr/channel";
import {
	createChannelMessageEvent,
	createDeleteEvent,
	getETag,
	getETags,
} from "#/lib/nostr/events";
import { parseProfileMetadata } from "#/lib/nostr/metadata";
import { getNip07Provider } from "#/lib/nostr/nip07";
import { decodeNevent } from "#/lib/nostr/nip19";
import { createReactionEvent } from "#/lib/nostr/reactions";
import { useAuthStore } from "#/stores/auth-store";
import type { NostrMessage } from "#/stores/message-store";
import { useMessageStore } from "#/stores/message-store";
import { useProfileStore } from "#/stores/profile-store";
import { useReactionStore } from "#/stores/reaction-store";

export const Route = createFileRoute("/")({ component: ChatPage });

function ChatPage() {
	const { publish, subscribe } = useRelayPool();
	const isLoggedIn = useAuthStore((s) => s.publicKey !== null);
	const publicKey = useAuthStore((s) => s.publicKey);
	const secretKey = useAuthStore((s) => s.secretKey);
	const loginMethod = useAuthStore((s) => s.loginMethod);
	const addMessage = useMessageStore((s) => s.addMessage);
	const deleteMessage = useMessageStore((s) => s.deleteMessage);
	const setProfile = useProfileStore((s) => s.setProfile);
	const addReaction = useReactionStore((s) => s.addReaction);
	const [showLogin, setShowLogin] = useState(false);
	const [highlightedEventId, setHighlightedEventId] = useState<
		string | undefined
	>();

	// URLからPermalink解析
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const neventParam = params.get("nevent");
		if (neventParam) {
			const decoded = decodeNevent(neventParam);
			if (decoded) {
				setHighlightedEventId(decoded.id);
			}
		}
	}, []);

	// メッセージ・プロフィール・リアクション・削除の購読
	useEffect(() => {
		const filter = createChannelMessageFilter({ limit: 100 });
		const unsub = subscribe(
			[filter],
			(event: Event) => {
				addMessage(event as NostrMessage);
			},
			() => {
				// EOSE
			},
		);

		const profileUnsub = subscribe([{ kinds: [0] }], (event: Event) => {
			const profile = parseProfileMetadata(event.content);
			if (profile) {
				setProfile(event.pubkey, profile);
			}
		});

		const reactionUnsub = subscribe([{ kinds: [7] }], (event: Event) => {
			const targetId = getETag(event.tags);
			if (targetId) {
				addReaction(targetId, {
					id: event.id,
					pubkey: event.pubkey,
					content: event.content,
				});
			}
		});

		const deleteUnsub = subscribe([{ kinds: [5] }], (event: Event) => {
			for (const id of getETags(event.tags)) {
				deleteMessage(id);
			}
		});

		return () => {
			unsub();
			profileUnsub();
			reactionUnsub();
			deleteUnsub();
		};
	}, [subscribe, addMessage, setProfile, addReaction, deleteMessage]);

	const signAndPublish = useCallback(
		async (template: ReturnType<typeof createChannelMessageEvent>) => {
			if (!publicKey) return;

			let signedEvent: Event;
			if (loginMethod === "nip07") {
				const provider = getNip07Provider();
				if (!provider) return;
				signedEvent = await provider.signEvent({
					...template,
					pubkey: publicKey,
				});
			} else if (secretKey) {
				signedEvent = finalizeEvent(template, secretKey);
			} else {
				return;
			}
			await publish(signedEvent);
		},
		[publicKey, secretKey, loginMethod, publish],
	);

	const handleSendMessage = useCallback(
		async (content: string) => {
			const template = createChannelMessageEvent({
				content,
				channelId: CHANNEL_ID,
			});
			await signAndPublish(template);
		},
		[signAndPublish],
	);

	const handleReact = useCallback(
		async (eventId: string, targetPubkey: string) => {
			const template = createReactionEvent({
				targetEventId: eventId,
				targetPubkey: targetPubkey,
			});
			await signAndPublish(template);
		},
		[signAndPublish],
	);

	const handleDelete = useCallback(
		async (eventId: string) => {
			const template = createDeleteEvent(eventId);
			await signAndPublish(template);
		},
		[signAndPublish],
	);

	return (
		<main className="flex h-[calc(100vh-8rem)] flex-col">
			<div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
				<div className="flex items-center gap-3">
					<h1 className="text-lg font-bold text-[var(--sea-ink)]">
						vimrc読書会
					</h1>
					<ConnectionStatus />
				</div>
				<div>
					{isLoggedIn ? (
						<button
							type="button"
							onClick={() => useAuthStore.getState().logout()}
							className="text-sm text-[var(--sea-ink-soft)] hover:underline"
						>
							ログアウト
						</button>
					) : (
						<button
							type="button"
							onClick={() => setShowLogin(true)}
							className="rounded-lg bg-[rgba(79,184,178,0.9)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[rgba(79,184,178,1)]"
						>
							ログイン
						</button>
					)}
				</div>
			</div>

			<MessageList
				highlightedEventId={highlightedEventId}
				onReact={isLoggedIn ? handleReact : undefined}
				onDelete={isLoggedIn ? handleDelete : undefined}
			/>

			{isLoggedIn ? (
				<MessageForm onSubmit={handleSendMessage} />
			) : (
				<div className="border-t border-gray-200 p-4 text-center text-sm text-[var(--sea-ink-soft)] dark:border-gray-700">
					<button
						type="button"
						onClick={() => setShowLogin(true)}
						className="text-[rgba(79,184,178,1)] hover:underline"
					>
						ログイン
					</button>
					するとメッセージを投稿できます
				</div>
			)}

			{showLogin && <LoginDialog onClose={() => setShowLogin(false)} />}
		</main>
	);
}
