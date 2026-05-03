import { useCallback, useEffect, useRef, useState } from "react";
import { useMessageStore } from "#/stores/message-store";
import { MessageItem } from "./MessageItem";

type MessageListProps = {
	highlightedEventId?: string;
	onReact?: (eventId: string, pubkey: string) => void;
	onDelete?: (eventId: string) => void;
	onLoadOlder?: () => void;
	loadingOlder?: boolean;
};

export function MessageList({
	highlightedEventId,
	onReact,
	onDelete,
	onLoadOlder,
	loadingOlder,
}: MessageListProps) {
	const messages = useMessageStore((s) => s.messages);
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isNearBottomRef = useRef(true);
	const [initialScrollDone, setInitialScrollDone] = useState(false);

	const handleScroll = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;
		const { scrollTop, scrollHeight, clientHeight } = container;
		isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

		if (scrollTop < 200 && onLoadOlder && !loadingOlder) {
			onLoadOlder();
		}
	}, [onLoadOlder, loadingOlder]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, [handleScroll]);

	// 初回: 最下部にスクロール
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages.lengthの変化でスクロールをトリガーする
	useEffect(() => {
		if (!initialScrollDone && messages.length > 0) {
			bottomRef.current?.scrollIntoView();
			setInitialScrollDone(true);
			return;
		}
		if (isNearBottomRef.current) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length, initialScrollDone]);

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

	if (messages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center text-[var(--sea-ink-soft)]">
				<p>メッセージはまだありません</p>
			</div>
		);
	}

	return (
		<div ref={containerRef} className="flex-1 overflow-y-auto">
			{loadingOlder && (
				<div className="py-3 text-center text-sm text-[var(--sea-ink-soft)]">
					読み込み中...
				</div>
			)}
			{messages.map((msg) => (
				<MessageItem
					key={msg.id}
					message={msg}
					highlighted={msg.id === highlightedEventId}
					onReact={onReact}
					onDelete={onDelete}
				/>
			))}
			<div ref={bottomRef} />
		</div>
	);
}
