import {
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useRef,
	useState,
} from "react";

type MessageFormProps = {
	onSubmit: (content: string) => void;
	disabled?: boolean;
};

export function MessageForm({ onSubmit, disabled }: MessageFormProps) {
	const [content, setContent] = useState("");
	const [sending, setSending] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
	}, []);

	const handleSubmit = async (e?: FormEvent) => {
		e?.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || sending) return;

		setSending(true);
		try {
			onSubmit(trimmed);
			setContent("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		} finally {
			setSending(false);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex shrink-0 items-center gap-2 border-t border-[var(--line)] bg-[var(--bg-pane)] p-2 md:p-3"
		>
			<span className="flex-shrink-0 text-[var(--accent)] font-bold text-sm select-none">
				&gt;
			</span>
			<textarea
				ref={textareaRef}
				value={content}
				onChange={(e) => {
					setContent(e.target.value);
					adjustHeight();
				}}
				onKeyDown={handleKeyDown}
				placeholder="メッセージを入力... (Ctrl+Enterで送信)"
				disabled={disabled || sending}
				rows={1}
				className="flex-1 resize-none rounded border border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-mute)] focus:border-[var(--accent)] disabled:opacity-50"
			/>
			<button
				type="submit"
				disabled={disabled || sending || !content.trim()}
				className="self-center rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-strong)] disabled:opacity-50 md:px-4 md:py-2 md:text-sm"
			>
				{sending ? "送信中..." : "投稿"}
			</button>
		</form>
	);
}
