import { useEffect, useRef, useState } from "react";
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
	const onLoadOlderRef = useRef(onLoadOlder);
	onLoadOlderRef.current = onLoadOlder;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container;
			isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

			if (scrollTop === 0 && onLoadOlderRef.current) {
				onLoadOlderRef.current();
			}
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

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

	// 過去メッセージ読み込み後、スクロール位置を維持する
	const prevMessagesLengthRef = useRef(messages.length);
	useEffect(() => {
		const container = containerRef.current;
		if (
			container &&
			messages.length > prevMessagesLengthRef.current &&
			container.scrollTop === 0
		) {
			// 先頭に追加されたメッセージ分だけスクロール位置を下にずらす
			const addedCount = messages.length - prevMessagesLengthRef.current;
			const children = container.children;
			let offsetHeight = 0;
			for (let i = 0; i < addedCount && i < children.length; i++) {
				offsetHeight += (children[i] as HTMLElement).offsetHeight;
			}
			container.scrollTop = offsetHeight;
		}
		prevMessagesLengthRef.current = messages.length;
	});

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
				<div className="sticky top-0 z-10 flex items-center justify-center gap-2 bg-[var(--bg-base)] py-3 text-sm text-[var(--sea-ink-soft)] shadow-sm">
					<svg
						className="h-4 w-4 animate-spin"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
					>
						<circle
							className="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							strokeWidth="4"
						/>
						<path
							className="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
					過去のメッセージを読み込み中...
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
