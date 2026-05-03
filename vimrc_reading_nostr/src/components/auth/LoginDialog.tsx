import type { Event } from "nostr-tools/core";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { useRef, useState } from "react";
import { createMetadataEvent } from "#/lib/nostr/events";
import {
	generateKeyPair,
	nsecToSecretKey,
	secretKeyToNsec,
} from "#/lib/nostr/keys";
import { getNip07Provider } from "#/lib/nostr/nip07";
import { useAuthStore } from "#/stores/auth-store";
import { useProfileStore } from "#/stores/profile-store";

type LoginDialogProps = {
	onClose: () => void;
	onPublishEvent?: (event: Event) => Promise<void>;
};

export function LoginDialog({ onClose, onPublishEvent }: LoginDialogProps) {
	const loginWithKeys = useAuthStore((s) => s.loginWithKeys);
	const loginWithNip07 = useAuthStore((s) => s.loginWithNip07);
	const loginWithNsec = useAuthStore((s) => s.loginWithNsec);
	const setProfile = useProfileStore((s) => s.setProfile);
	const [nsecInput, setNsecInput] = useState("");
	const [error, setError] = useState("");
	const [generatedNsec, setGeneratedNsec] = useState("");
	const secretKeyRef = useRef<Uint8Array | null>(null);
	const [nameInput, setNameInput] = useState("");
	const [showNsec, setShowNsec] = useState(false);
	const [copied, setCopied] = useState(false);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleGenerateKeys = () => {
		const { secretKey, publicKey } = generateKeyPair();
		const nsec = secretKeyToNsec(secretKey);
		setGeneratedNsec(nsec);
		secretKeyRef.current = secretKey;
		loginWithKeys(secretKey, publicKey);
	};

	const handleConfirmGenerated = async () => {
		const trimmedName = nameInput.trim();
		if (trimmedName && secretKeyRef.current && onPublishEvent) {
			try {
				const template = createMetadataEvent({ name: trimmedName });
				const signedEvent = finalizeEvent(template, secretKeyRef.current);
				await onPublishEvent(signedEvent);
				const pubkey = useAuthStore.getState().publicKey;
				if (pubkey) {
					setProfile(pubkey, { name: trimmedName });
				}
			} catch {
				setError("プロフィールの保存に失敗しました");
				return;
			}
		}
		onClose();
	};

	const handleNip07Login = async () => {
		setError("");
		const provider = getNip07Provider();
		if (!provider) {
			setError(
				"NIP-07対応の拡張機能が見つかりません（nos2x等をインストールしてください）",
			);
			return;
		}
		try {
			const pubkey = await provider.getPublicKey();
			loginWithNip07(pubkey);
			onClose();
		} catch {
			setError("拡張機能からの公開鍵取得に失敗しました");
		}
	};

	const handleNsecLogin = () => {
		setError("");
		const sk = nsecToSecretKey(nsecInput.trim());
		if (!sk) {
			setError("無効なnsecです");
			return;
		}
		const pubkey = getPublicKey(sk);
		loginWithNsec(sk, pubkey);
		onClose();
	};

	if (generatedNsec) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
				<div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
					<h2 className="mb-4 text-lg font-bold text-[var(--sea-ink)]">
						鍵ペアを生成しました
					</h2>
					<div className="mb-4">
						<label
							htmlFor="name-input"
							className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]"
						>
							表示名
						</label>
						<input
							id="name-input"
							type="text"
							value={nameInput}
							onChange={(e) => setNameInput(e.target.value)}
							placeholder="名前を入力"
							className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[rgba(233,84,32,0.6)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						/>
					</div>
					<div className="mb-4 rounded-lg bg-yellow-50 p-4 text-sm dark:bg-yellow-900/30">
						<p className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">
							秘密鍵を安全に保管してください
						</p>
						<p className="mb-2 text-yellow-700 dark:text-yellow-300">
							この秘密鍵を失うとアカウントを復元できません。
						</p>
						<div className="flex gap-1">
							<input
								type={showNsec ? "text" : "password"}
								value={generatedNsec}
								readOnly
								className="flex-1 rounded bg-yellow-100 p-2 font-mono text-xs dark:bg-yellow-900/50"
							/>
							<button
								type="button"
								onClick={() => setShowNsec(!showNsec)}
								className="shrink-0 rounded bg-yellow-200 px-2 text-xs text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700"
							>
								{showNsec ? "隠す" : "表示"}
							</button>
							<button
								type="button"
								onClick={async () => {
									await navigator.clipboard.writeText(generatedNsec);
									setCopied(true);
									if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
									copyTimerRef.current = setTimeout(
										() => setCopied(false),
										2000,
									);
								}}
								className="shrink-0 rounded bg-yellow-200 px-2 text-xs text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700"
							>
								{copied ? "コピー済" : "コピー"}
							</button>
						</div>
					</div>
					<button
						type="button"
						onClick={handleConfirmGenerated}
						className="w-full rounded-lg bg-[rgba(233,84,32,0.9)] py-2 text-sm font-semibold text-white hover:bg-[rgba(233,84,32,1)]"
					>
						保管しました
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-bold text-[var(--sea-ink)]">ログイン</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
					>
						✕
					</button>
				</div>

				{error && (
					<div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
						{error}
					</div>
				)}

				<div className="space-y-3">
					<button
						type="button"
						onClick={handleNip07Login}
						className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
					>
						<span className="font-semibold">NIP-07 拡張機能でログイン</span>
						<br />
						<span className="text-xs text-[var(--sea-ink-soft)]">
							nos2x等のブラウザ拡張を使用（推奨）
						</span>
					</button>

					<button
						type="button"
						onClick={handleGenerateKeys}
						className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-sm transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
					>
						<span className="font-semibold">新しい鍵ペアを生成</span>
						<br />
						<span className="text-xs text-[var(--sea-ink-soft)]">
							新規アカウントを作成
						</span>
					</button>

					<div className="border-t pt-3 dark:border-gray-700">
						<label
							htmlFor="nsec-input"
							className="mb-1 block text-sm font-semibold text-[var(--sea-ink)]"
						>
							秘密鍵（nsec）で直接ログイン
						</label>
						<div className="flex gap-2">
							<input
								id="nsec-input"
								type="password"
								value={nsecInput}
								onChange={(e) => setNsecInput(e.target.value)}
								placeholder="nsec1..."
								className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[rgba(233,84,32,0.6)] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							/>
							<button
								type="button"
								onClick={handleNsecLogin}
								disabled={!nsecInput.trim()}
								className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
							>
								ログイン
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
