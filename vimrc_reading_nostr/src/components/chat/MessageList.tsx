import { useEffect, useRef } from "react";
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
	const initialScrollDoneRef = useRef(false);
	const onLoadOlderRef = useRef(onLoadOlder);
	const loadingOlderRef = useRef(loadingOlder);
	const prevScrollHeightRef = useRef(0);
	onLoadOlderRef.current = onLoadOlder;
	loadingOlderRef.current = loadingOlder;

	// スクロール監視（nostter方式: 上部近くでolder発火）
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container;
			isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

			// 上部20%領域に入ったら過去メッセージを取得
			if (
				initialScrollDoneRef.current &&
				!loadingOlderRef.current &&
				scrollTop < clientHeight * 0.2 &&
				onLoadOlderRef.current
			) {
				prevScrollHeightRef.current = scrollHeight;
				onLoadOlderRef.current();
			}
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	// 初回: 最下部にスクロール / 新着メッセージ時の自動スクロール
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages.lengthの変化でスクロールをトリガーする
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		if (!initialScrollDoneRef.current && messages.length > 0) {
			requestAnimationFrame(() => {
				bottomRef.current?.scrollIntoView();
				initialScrollDoneRef.current = true;
			});
			return;
		}

		// 過去メッセージ追加時: scrollHeight差分でスクロール位置を維持
		if (prevScrollHeightRef.current > 0) {
			const newScrollHeight = container.scrollHeight;
			const diff = newScrollHeight - prevScrollHeightRef.current;
			if (diff > 0) {
				container.scrollTop += diff;
			}
			prevScrollHeightRef.current = 0;
			return;
		}

		// 新着メッセージ: 下端にいれば自動スクロール
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
