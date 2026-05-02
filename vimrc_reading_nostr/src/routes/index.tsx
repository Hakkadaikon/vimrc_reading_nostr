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
import { createChannelMessageEvent } from "#/lib/nostr/events";
import { decodeNevent } from "#/lib/nostr/nip19";
import { useAuthStore } from "#/stores/auth-store";
import type { NostrMessage } from "#/stores/message-store";
import { useMessageStore } from "#/stores/message-store";
import { useProfileStore } from "#/stores/profile-store";

export const Route = createFileRoute("/")({ component: ChatPage });

function ChatPage() {
	const { publish, subscribe } = useRelayPool();
	const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
	const publicKey = useAuthStore((s) => s.publicKey);
	const secretKey = useAuthStore((s) => s.secretKey);
	const loginMethod = useAuthStore((s) => s.loginMethod);
	const addMessage = useMessageStore((s) => s.addMessage);
	const setProfile = useProfileStore((s) => s.setProfile);
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

	// メッセージ購読
	useEffect(() => {
		const filter = createChannelMessageFilter({ limit: 100 });
		const unsub = subscribe(
			[filter],
			(event: Event) => {
				addMessage(event as NostrMessage);
			},
			() => {
				// EOSE: 過去メッセージの読み込み完了
			},
		);

		// プロフィール購読（kind:0）
		const profileUnsub = subscribe([{ kinds: [0] }], (event: Event) => {
			try {
				const metadata = JSON.parse(event.content);
				setProfile(event.pubkey, {
					name: metadata.name,
					picture: metadata.picture,
					about: metadata.about,
				});
			} catch {
				// invalid metadata
			}
		});

		return () => {
			unsub();
			profileUnsub();
		};
	}, [subscribe, addMessage, setProfile]);

	const handleSendMessage = useCallback(
		async (content: string) => {
			if (!publicKey) return;

			const template = createChannelMessageEvent({
				content,
				channelId: CHANNEL_ID,
			});

			let signedEvent: Event;

			if (loginMethod === "nip07") {
				const nostr = (window as unknown as Record<string, unknown>).nostr as {
					signEvent: (event: unknown) => Promise<Event>;
				};
				signedEvent = await nostr.signEvent({
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

			<MessageList highlightedEventId={highlightedEventId} />

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
