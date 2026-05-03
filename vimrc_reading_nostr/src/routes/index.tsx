import { createFileRoute, Link } from "@tanstack/react-router";
import type { Event } from "nostr-tools/core";
import { finalizeEvent } from "nostr-tools/pure";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoginDialog } from "#/components/auth/LoginDialog";
import { UserInfo } from "#/components/auth/UserInfo";
import { MessageForm } from "#/components/chat/MessageForm";
import { MessageList } from "#/components/chat/MessageList";
import { ParticipantList } from "#/components/chat/ParticipantList";
import { ConnectionStatus } from "#/components/common/ConnectionStatus";
import { useRelayPool } from "#/hooks/useRelayPool";
import { CHANNEL_ID, createChannelMessageFilter } from "#/lib/nostr/channel";
import {
	createChannelMessageEvent,
	createDeleteEvent,
	getETag,
	getETags,
} from "#/lib/nostr/events";
import { getNip07Provider } from "#/lib/nostr/nip07";
import { decodeNevent } from "#/lib/nostr/nip19";
import { getTodayParticipants, getTodayRange } from "#/lib/nostr/participants";
import { createReactionEvent } from "#/lib/nostr/reactions";
import { resolveProfile } from "#/lib/nostr/relay-discovery";
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
	const markRequested = useProfileStore((s) => s.markRequested);
	const addReaction = useReactionStore((s) => s.addReaction);
	const messages = useMessageStore((s) => s.messages);
	const [showLogin, setShowLogin] = useState(false);
	const [highlightedEventId, setHighlightedEventId] = useState<
		string | undefined
	>();

	// 当日〜翌AM2:00(JST)の発言者リスト
	const participantPubkeys = useMemo(() => {
		const { start, end } = getTodayRange(Math.floor(Date.now() / 1000));
		return getTodayParticipants(messages, start, end);
	}, [messages]);

	// プロフィール取得バッチ用
	const pendingPubkeysRef = useRef<Set<string>>(new Set());
	const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const fetchProfiles = useCallback(
		async (pubkeys: string[]) => {
			const unfetched = pubkeys.filter((pk) =>
				useProfileStore.getState().needsFetch(pk),
			);
			if (unfetched.length === 0) return;

			for (const pk of unfetched) {
				markRequested(pk);
			}

			// 接続済みリレープール + directory.yabu.me に並行問い合わせ
			const promises = unfetched.map(async (pk) => {
				const profile = await resolveProfile(pk, subscribe);
				if (profile) {
					setProfile(pk, profile);
				}
			});
			await Promise.allSettled(promises);
		},
		[setProfile, markRequested, subscribe],
	);

	const requestProfile = useCallback(
		(pubkey: string) => {
			if (!useProfileStore.getState().needsFetch(pubkey)) return;
			pendingPubkeysRef.current.add(pubkey);

			if (batchTimerRef.current) return;
			batchTimerRef.current = setTimeout(() => {
				const pubkeys = [...pendingPubkeysRef.current];
				pendingPubkeysRef.current.clear();
				batchTimerRef.current = null;
				fetchProfiles(pubkeys);
			}, 50);
		},
		[fetchProfiles],
	);

	// ログイン時に自分のプロフィールを取得
	useEffect(() => {
		if (publicKey) {
			requestProfile(publicKey);
		}
	}, [publicKey, requestProfile]);

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

	// メッセージ・リアクション・削除の購読
	useEffect(() => {
		const filter = createChannelMessageFilter({ limit: 100 });
		const unsub = subscribe(
			[filter],
			(event: Event) => {
				addMessage(event as NostrMessage);
				requestProfile(event.pubkey);
			},
			() => {
				// EOSE
			},
		);

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
			reactionUnsub();
			deleteUnsub();
			if (batchTimerRef.current) {
				clearTimeout(batchTimerRef.current);
				batchTimerRef.current = null;
			}
		};
	}, [subscribe, addMessage, addReaction, deleteMessage, requestProfile]);

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
				<div className="flex items-center gap-3">
					<Link
						to="/settings"
						className="text-sm text-[var(--sea-ink-soft)] hover:underline"
					>
						設定
					</Link>
					{isLoggedIn ? (
						<>
							<UserInfo />
							<button
								type="button"
								onClick={() => useAuthStore.getState().logout()}
								className="text-sm text-[var(--sea-ink-soft)] hover:underline"
							>
								ログアウト
							</button>
						</>
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

			<div className="flex min-h-0 flex-1">
				<aside className="w-48 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
					<ParticipantList participantPubkeys={participantPubkeys} />
				</aside>

				<div className="flex min-w-0 flex-1 flex-col">
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
				</div>
			</div>

			{showLogin && <LoginDialog onClose={() => setShowLogin(false)} />}
		</main>
	);
}
