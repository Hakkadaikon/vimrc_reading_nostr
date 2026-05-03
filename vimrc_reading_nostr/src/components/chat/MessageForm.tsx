import { type FormEvent, type KeyboardEvent, useState } from "react";

type MessageFormProps = {
	onSubmit: (content: string) => void;
	disabled?: boolean;
};

export function MessageForm({ onSubmit, disabled }: MessageFormProps) {
	const [content, setContent] = useState("");
	const [sending, setSending] = useState(false);

	const handleSubmit = async (e?: FormEvent) => {
		e?.preventDefault();
		const trimmed = content.trim();
		if (!trimmed || sending) return;

		setSending(true);
		try {
			onSubmit(trimmed);
			setContent("");
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
			className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700"
		>
			<textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="メッセージを入力... (Ctrl+Enterで送信)"
				disabled={disabled || sending}
				rows={3}
				className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-[rgba(79,184,178,0.6)] focus:ring-2 focus:ring-[rgba(79,184,178,0.2)] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
			/>
			<button
				type="submit"
				disabled={disabled || sending || !content.trim()}
				className="self-end rounded-lg bg-[rgba(79,184,178,0.9)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgba(79,184,178,1)] disabled:opacity-50"
			>
				{sending ? "送信中..." : "投稿"}
			</button>
		</form>
	);
}
