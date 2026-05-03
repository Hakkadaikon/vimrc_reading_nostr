import { useEffect, useRef } from "react";
import { useMessageStore } from "#/stores/message-store";
import { MessageItem } from "./MessageItem";

type MessageListProps = {
	highlightedEventId?: string;
	onReact?: (eventId: string, pubkey: string) => void;
	onDelete?: (eventId: string) => void;
};

export function MessageList({
	highlightedEventId,
	onReact,
	onDelete,
}: MessageListProps) {
	const messages = useMessageStore((s) => s.messages);
	const bottomRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const isNearBottomRef = useRef(true);

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

	// biome-ignore lint/correctness/useExhaustiveDependencies: messages.lengthの変化でスクロールをトリガーする
	useEffect(() => {
		if (isNearBottomRef.current) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length]);

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
