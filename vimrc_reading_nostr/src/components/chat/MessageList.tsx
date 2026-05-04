import { useEffect, useMemo, useRef } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { useMessageStore } from "#/stores/message-store";
import { MessageItem } from "./MessageItem";

type MessageListProps = {
	highlightedEventId?: string;
	hasMore: boolean;
	onLoadMore: () => void;
	onReact?: (eventId: string, pubkey: string) => void;
	onDelete?: (eventId: string) => void;
};

export function MessageList({
	highlightedEventId,
	hasMore,
	onLoadMore,
	onReact,
	onDelete,
}: MessageListProps) {
	const messages = useMessageStore((s) => s.messages);
	const deletedIds = useMessageStore((s) => s.deletedIds);
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isNearBottomRef = useRef(true);
	const isFirstRenderRef = useRef(true);
	const prevNewestIdRef = useRef<string | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container;
			isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	// 新着メッセージ到着時のみauto-scroll（過去メッセージ追加時はスキップ）
	useEffect(() => {
		if (messages.length === 0) return;
		const newestId = messages[messages.length - 1].id;
		// 最新メッセージが変わっていない = 過去メッセージの追加 → スクロールしない
		if (prevNewestIdRef.current === newestId) return;
		prevNewestIdRef.current = newestId;

		if (isNearBottomRef.current) {
			const behavior = isFirstRenderRef.current ? "instant" : "smooth";
			isFirstRenderRef.current = false;
			bottomRef.current?.scrollIntoView({ behavior });
		}
	}, [messages]);

	const scrolledToHighlightRef = useRef(false);
	const prevHighlightIdRef = useRef(highlightedEventId);

	// biome-ignore lint/correctness/useExhaustiveDependencies: messages.lengthの変化で該当メッセージのDOM出現を検知する
	useEffect(() => {
		if (prevHighlightIdRef.current !== highlightedEventId) {
			scrolledToHighlightRef.current = false;
			prevHighlightIdRef.current = highlightedEventId;
		}
		if (!highlightedEventId || scrolledToHighlightRef.current) return;
		const el = document.getElementById(`msg-${highlightedEventId}`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			scrolledToHighlightRef.current = true;
		}
	}, [highlightedEventId, messages.length]);

	const visibleMessages = useMemo(
		() => messages.filter((msg) => !deletedIds.has(msg.id)),
		[messages, deletedIds],
	);

	// コンテンツがコンテナに収まる場合、スクロールイベントが発生しないため
	// hasMore=true なら自動的にloadMoreを呼び出す
	// biome-ignore lint/correctness/useExhaustiveDependencies: visibleMessages.lengthの変化でscrollHeight再チェックが必要
	useEffect(() => {
		const container = containerRef.current;
		if (!container || !hasMore) return;
		// コンテナがスクロール不可（コンテンツ <= コンテナ高さ）ならloadMore
		const check = () => {
			if (container.scrollHeight <= container.clientHeight) {
				onLoadMore();
			}
		};
		// レイアウト確定後にチェック
		const raf = requestAnimationFrame(check);
		return () => cancelAnimationFrame(raf);
	}, [visibleMessages.length, hasMore, onLoadMore]);

	if (visibleMessages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center text-[var(--fg-dim)]">
				<p>メッセージはまだありません</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			id="message-scroll-container"
			className="flex flex-1 flex-col overflow-y-auto"
		>
			<InfiniteScroll
				dataLength={visibleMessages.length}
				next={onLoadMore}
				hasMore={hasMore}
				loader={
					<div className="flex justify-center py-2 text-sm text-[var(--fg-dim)]">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
					</div>
				}
				endMessage={
					<p className="py-2 text-center text-xs text-[var(--fg-mute)]">
						これ以上メッセージはありません
					</p>
				}
				inverse={true}
				scrollableTarget="message-scroll-container"
				style={{ display: "flex", flexDirection: "column-reverse" }}
			>
				{visibleMessages.toReversed().map((msg) => (
					<MessageItem
						key={msg.id}
						message={msg}
						highlighted={msg.id === highlightedEventId}
						onReact={onReact}
						onDelete={onDelete}
					/>
				))}
			</InfiniteScroll>
			<div ref={bottomRef} />
		</div>
	);
}
