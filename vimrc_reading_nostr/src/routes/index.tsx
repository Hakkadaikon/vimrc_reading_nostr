import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, LogOut, Settings, Users, X } from "lucide-react";
import type { Event } from "nostr-tools/core";
import { finalizeEvent } from "nostr-tools/pure";
import {
	memo,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
import { PAGE_SIZE, useMessageStore } from "#/stores/message-store";
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
	const isInitialLoading = useMessageStore((s) => s.isInitialLoading);
	const loadLatestPage = useMessageStore((s) => s.loadLatestPage);
	const hasMore = useMessageStore((s) => s.hasMore);
	const setHasMore = useMessageStore((s) => s.setHasMore);
	const setProfile = useProfileStore((s) => s.setProfile);
	const markRequested = useProfileStore((s) => s.markRequested);
	const addReaction = useReactionStore((s) => s.addReaction);
	const messages = useMessageStore((s) => s.messages);
	const [showLogin, setShowLogin] = useState(false);
	const [highlightedEventId, setHighlightedEventId] = useState<
		string | undefined
	>();
	const eoseReceivedRef = useRef(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [showParticipants, setShowParticipants] = useState(false);
	const sidebarRef = useRef<HTMLElement>(null);
	const resizeCleanupRef = useRef<(() => void) | null>(null);

	// 起動時にlocalStorageから最新PAGE_SIZE件を復元してUI表示
	useEffect(() => {
		loadLatestPage();
	}, [loadLatestPage]);

	// バックグラウンド同期用バッファ（デバウンスしてlocalStorageに書き込む）
	const bgBufferRef = useRef<NostrMessage[]>([]);
	const bgSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const flushBgBuffer = useCallback(() => {
		if (bgBufferRef.current.length === 0) return;
		const events = bgBufferRef.current;
		bgBufferRef.current = [];
		const store = useMessageStore.getState();
		store.appendAndPersist(events);
		store.addMessages(events);
	}, []);

	const enqueueBgEvent = useCallback(
		(event: NostrMessage) => {
			bgBufferRef.current.push(event);
			if (bgSaveTimerRef.current) return;
			bgSaveTimerRef.current = setTimeout(() => {
				bgSaveTimerRef.current = null;
				flushBgBuffer();
			}, 500);
		},
		[flushBgBuffer],
	);

	// 当日〜翌AM2:00(JST)の発言者リスト（参照安定化）
	const prevParticipantsRef = useRef<string[]>([]);
	const participantPubkeys = useMemo(() => {
		if (isInitialLoading) return prevParticipantsRef.current;
		const { start, end } = getTodayRange(Math.floor(Date.now() / 1000));
		const next = getTodayParticipants(messages, start, end);
		const prev = prevParticipantsRef.current;
		if (next.length === prev.length && next.every((pk, i) => pk === prev[i])) {
			return prev;
		}
		prevParticipantsRef.current = next;
		return next;
	}, [messages, isInitialLoading]);

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

	// バックグラウンド購読: kind:42を常時受信しlocalStorageに蓄積
	// EOSE後はリアルタイムで新着を受け続ける（limitなし）
	useEffect(() => {
		// 初回は直近メッセージを取得するためlimit付き
		const filter = createChannelMessageFilter({ limit: PAGE_SIZE * 2 });
		const unsub = subscribe(
			[filter],
			(event: Event) => {
				const msg = event as NostrMessage;
				requestProfile(msg.pubkey);
				enqueueBgEvent(msg);
			},
			() => {
				// EOSE: バッファを即フラッシュしてlocalStorageに保存
				if (eoseReceivedRef.current) return;
				eoseReceivedRef.current = true;
				flushBgBuffer();
				// localStorageから最新PAGE_SIZE件をUIに反映
				useMessageStore.getState().loadLatestPage();
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
			if (bgSaveTimerRef.current) {
				clearTimeout(bgSaveTimerRef.current);
				bgSaveTimerRef.current = null;
			}
			flushBgBuffer();
		};
	}, [
		subscribe,
		addReaction,
		deleteMessage,
		requestProfile,
		enqueueBgEvent,
		flushBgBuffer,
	]);

	const fetchOlderFromRelay = useCallback(
		(until: number) => {
			const filter = createChannelMessageFilter({
				limit: PAGE_SIZE,
				until: until,
			});
			const batch: NostrMessage[] = [];
			const unsub = subscribe(
				[filter],
				(event: Event) => {
					const msg = event as NostrMessage;
					batch.push(msg);
					addMessage(msg);
					requestProfile(event.pubkey);
				},
				() => {
					if (batch.length === 0) {
						setHasMore(false);
					} else {
						useMessageStore.getState().appendAndPersist(batch);
					}
					setIsLoadingMore(false);
					unsub();
				},
			);
		},
		[subscribe, addMessage, requestProfile, setHasMore],
	);

	// 過去メッセージの追加読み込み（localStorage優先→不足分はリレーへ）
	const loadMore = useCallback(() => {
		if (isLoadingMore || !hasMore) return;
		setIsLoadingMore(true);

		const oldest = useMessageStore.getState().getOldestTimestamp();
		if (oldest === undefined) {
			setHasMore(false);
			setIsLoadingMore(false);
			return;
		}

		// 1. localStorageから取得を試みる
		const cached = useMessageStore.getState().loadOlderPage(oldest);
		if (cached.length > 0) {
			useMessageStore.getState().addMessages(cached);
			if (cached.length < PAGE_SIZE) {
				// localStorageに足りない分はリレーから取得
				fetchOlderFromRelay(oldest);
			} else {
				setIsLoadingMore(false);
			}
			return;
		}

		// 2. localStorageになければリレーから取得
		fetchOlderFromRelay(oldest);
	}, [isLoadingMore, hasMore, setHasMore, fetchOlderFromRelay]);

	// サイドバーリサイズ（DOM直接操作で再レンダリングを回避）
	const handleResizeStart = useCallback((e: ReactPointerEvent) => {
		e.preventDefault();
		const sidebar = sidebarRef.current;
		if (!sidebar) return;
		const startX = e.clientX;
		const startWidth = sidebar.offsetWidth;

		const onMove = (ev: globalThis.PointerEvent) => {
			const newWidth = Math.max(
				120,
				Math.min(400, startWidth + ev.clientX - startX),
			);
			sidebar.style.width = `${newWidth}px`;
		};
		const onUp = () => {
			resizeCleanupRef.current = null;
			document.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerup", onUp);
		};
		document.addEventListener("pointermove", onMove);
		document.addEventListener("pointerup", onUp);
		resizeCleanupRef.current = onUp;
	}, []);

	// アンマウント時にリサイズリスナーをクリーンアップ
	useEffect(() => {
		return () => {
			resizeCleanupRef.current?.();
		};
	}, []);

	const toggleParticipants = useCallback(
		() => setShowParticipants((prev) => !prev),
		[],
	);
	const openLogin = useCallback(() => setShowLogin(true), []);

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
			// Optimistic update: 投稿を即座にUIに反映
			const msg = signedEvent as NostrMessage;
			useMessageStore.getState().addMessage(msg);
			useMessageStore.getState().appendAndPersist([msg]);
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
		<main className="flex h-dvh flex-col bg-[var(--bg)]">
			<ChatHeader
				isLoggedIn={isLoggedIn}
				onToggleParticipants={toggleParticipants}
				onShowLogin={openLogin}
			/>

			{isInitialLoading ? (
				<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-[var(--fg-dim)]">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--line)] border-t-[var(--accent)]" />
					<p>メッセージを読み込んでいます...</p>
				</div>
			) : (
				<div className="relative flex min-h-0 flex-1">
					{/* モバイル: オーバーレイドロワー */}
					{showParticipants && (
						<>
							{/* biome-ignore lint/a11y/noStaticElementInteractions: 背景オーバーレイのクリックでドロワーを閉じる */}
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: 背景オーバーレイはキーボード操作不要 */}
							<div
								className="fixed inset-0 z-40 bg-black/50 md:hidden"
								onClick={() => setShowParticipants(false)}
							/>
							<aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-[var(--line)] bg-[var(--bg-pane)] pt-14 md:hidden">
								<div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
									<span className="text-sm font-semibold text-[var(--fg)]">
										参加者
									</span>
									<button
										type="button"
										onClick={() => setShowParticipants(false)}
										className="rounded p-1 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
									>
										<X className="h-4 w-4" />
									</button>
								</div>
								<ParticipantList participantPubkeys={participantPubkeys} />
							</aside>
						</>
					)}

					{/* デスクトップ: リサイズ可能なサイドバー */}
					<aside
						ref={sidebarRef}
						className="hidden w-48 flex-shrink-0 border-r border-[var(--line)] bg-[var(--bg-pane)] md:block"
					>
						<ParticipantList participantPubkeys={participantPubkeys} />
					</aside>
					<div
						className="hidden w-1 flex-shrink-0 cursor-col-resize hover:bg-[var(--accent-soft)] active:bg-[var(--accent)] md:block"
						onPointerDown={handleResizeStart}
					/>

					<div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-elev)]">
						<MessageList
							highlightedEventId={highlightedEventId}
							hasMore={hasMore}
							onLoadMore={loadMore}
							onReact={isLoggedIn ? handleReact : undefined}
							onDelete={isLoggedIn ? handleDelete : undefined}
						/>

						{isLoggedIn ? (
							<MessageForm onSubmit={handleSendMessage} />
						) : (
							<div className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-pane)] p-3 text-center text-sm text-[var(--fg-dim)] md:p-4">
								<button
									type="button"
									onClick={() => setShowLogin(true)}
									className="rounded px-2 py-1 font-medium text-[var(--accent)] hover:underline"
								>
									ログイン
								</button>
								するとメッセージを投稿できます
							</div>
						)}
					</div>
				</div>
			)}

			{showLogin && (
				<LoginDialog
					onClose={() => setShowLogin(false)}
					onPublishEvent={publish}
				/>
			)}
		</main>
	);
}

type ChatHeaderProps = {
	isLoggedIn: boolean;
	onToggleParticipants: () => void;
	onShowLogin: () => void;
};

const ChatHeader = memo(function ChatHeader({
	isLoggedIn,
	onToggleParticipants,
	onShowLogin,
}: ChatHeaderProps) {
	return (
		<div className="relative z-50 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 md:px-5 md:py-3">
			<div className="flex items-center gap-2 md:gap-4">
				<button
					type="button"
					onClick={onToggleParticipants}
					className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)] md:hidden"
					title="参加者"
				>
					<Users className="h-5 w-5" />
				</button>
				<h1 className="text-base font-bold text-[var(--fg)] md:text-lg">
					vimrc読書会
				</h1>
				<ConnectionStatus />
			</div>
			<div className="flex items-center gap-2 md:gap-4">
				{isLoggedIn && (
					<span className="hidden md:inline-flex">
						<UserInfo />
					</span>
				)}
				<Link
					to="/settings"
					className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
					title="設定"
				>
					<Settings className="h-5 w-5 md:h-6 md:w-6" />
				</Link>
				{isLoggedIn ? (
					<button
						type="button"
						onClick={() => useAuthStore.getState().logout()}
						className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
						title="ログアウト"
					>
						<LogOut className="h-5 w-5 md:h-6 md:w-6" />
					</button>
				) : (
					<button
						type="button"
						onClick={onShowLogin}
						className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
						title="ログイン"
					>
						<LogIn className="h-5 w-5 md:h-6 md:w-6" />
					</button>
				)}
			</div>
		</div>
	);
});
