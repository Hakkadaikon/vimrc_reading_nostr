import { SendHorizonal } from "lucide-react";
import {
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useRef,
	useState,
} from "react";

type MessageFormProps = {
	onSubmit: (content: string) => void | Promise<void>;
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
			await onSubmit(trimmed);
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

	const canSend = !disabled && !sending && content.trim().length > 0;

	return (
		<form
			onSubmit={handleSubmit}
			className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-pane)] p-2 md:p-3"
		>
			<div className="relative">
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
					className="w-full resize-none rounded border border-[var(--line)] bg-[var(--bg)] py-2 pl-3 pr-10 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-mute)] focus:border-[var(--accent)] disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={!canSend}
					className={`absolute right-2 top-1/2 -translate-y-[calc(50%+3px)] rounded p-1 transition ${
						canSend
							? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
							: "text-[var(--fg-mute)] opacity-50"
					}`}
				>
					<SendHorizonal className="h-5 w-5" />
				</button>
			</div>
		</form>
	);
}
