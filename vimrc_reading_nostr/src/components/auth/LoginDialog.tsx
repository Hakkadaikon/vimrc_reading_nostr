import type { Event } from "nostr-tools/core";
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { useRef, useState } from "react";
import { uploadImage } from "#/lib/image-upload";
import { createMetadataEvent } from "#/lib/nostr/events";
import {
	generateKeyPair,
	nsecToSecretKey,
	secretKeyToNsec,
} from "#/lib/nostr/keys";
import { getNip07Provider } from "#/lib/nostr/nip07";
import { useAuthStore } from "#/stores/auth-store";
import { useProfileStore } from "#/stores/profile-store";
import { useSettingsStore } from "#/stores/settings-store";

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
	const [nip07Loading, setNip07Loading] = useState(false);
	const [generatedNsec, setGeneratedNsec] = useState("");
	const secretKeyRef = useRef<Uint8Array | null>(null);
	const [nameInput, setNameInput] = useState("");
	const [pictureUrl, setPictureUrl] = useState("");
	const [uploading, setUploading] = useState(false);
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

	const handleUploadFile = async (file: File) => {
		setError("");
		if (!secretKeyRef.current) {
			setError("秘密鍵がありません");
			return;
		}
		setUploading(true);
		try {
			const uploadUrl = useSettingsStore.getState().imageUploadUrl;
			const url = await uploadImage(file, uploadUrl, secretKeyRef.current);
			setPictureUrl(url);
		} catch {
			setError("画像のアップロードに失敗しました");
		} finally {
			setUploading(false);
		}
	};

	const handlePasteImage = (e: React.ClipboardEvent) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of items) {
			if (item.type.startsWith("image/")) {
				e.preventDefault();
				const file = item.getAsFile();
				if (file) {
					handleUploadFile(file);
				}
				return;
			}
		}
	};

	const handleConfirmGenerated = async () => {
		const trimmedName = nameInput.trim();
		if (trimmedName && secretKeyRef.current && onPublishEvent) {
			try {
				const metadata: { name: string; picture?: string } = {
					name: trimmedName,
				};
				if (pictureUrl.trim()) {
					metadata.picture = pictureUrl.trim();
				}
				const template = createMetadataEvent(metadata);
				const signedEvent = finalizeEvent(template, secretKeyRef.current);
				await onPublishEvent(signedEvent);
				const pubkey = useAuthStore.getState().publicKey;
				if (pubkey) {
					setProfile(pubkey, {
						name: trimmedName,
						picture: metadata.picture,
					});
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
		setNip07Loading(true);
		try {
			const pubkey = await provider.getPublicKey();
			if (!/^[0-9a-f]{64}$/.test(pubkey)) {
				setError("無効な公開鍵フォーマットです");
				return;
			}
			loginWithNip07(pubkey);
			onClose();
		} catch {
			setError("拡張機能からの公開鍵取得に失敗しました");
		} finally {
			setNip07Loading(false);
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
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
				<div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-xl">
					<h2 className="mb-4 text-lg font-bold text-[var(--fg)]">
						鍵ペアを生成しました
					</h2>
					<div className="mb-4">
						<label
							htmlFor="name-input"
							className="mb-1 block text-sm font-semibold text-[var(--fg)]"
						>
							表示名
						</label>
						<input
							id="name-input"
							type="text"
							value={nameInput}
							onChange={(e) => setNameInput(e.target.value)}
							placeholder="名前を入力"
							className="w-full rounded border border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-mute)] focus:border-[var(--accent)]"
						/>
					</div>
					<div className="mb-4">
						<label
							htmlFor="picture-input"
							className="mb-1 block text-sm font-semibold text-[var(--fg)]"
						>
							アイコン（任意）
						</label>
						<div className="flex items-start gap-3">
							<div className="flex shrink-0 flex-col items-center">
								{uploading ? (
									<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--bg-pane)]">
										<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
									</div>
								) : pictureUrl ? (
									<img
										src={pictureUrl}
										alt="アイコンプレビュー"
										className="h-16 w-16 rounded-full border-2 border-[var(--accent)] object-cover"
									/>
								) : (
									<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--line)] bg-[var(--bg-pane)] text-[var(--fg-mute)]">
										<span className="text-xs">未設定</span>
									</div>
								)}
							</div>
							<div className="flex-1">
								<input
									id="picture-input"
									type="url"
									value={pictureUrl}
									onChange={(e) => setPictureUrl(e.target.value)}
									onPaste={handlePasteImage}
									placeholder="URLを入力 or 画像を貼り付け"
									className="w-full rounded border border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-mute)] focus:border-[var(--accent)]"
								/>
								<p className="mt-1 text-xs text-[var(--fg-mute)]">
									URLを直接入力するか、この欄に画像を貼り付け（Ctrl+V）でアップロード
								</p>
								{error && (
									<p className="mt-1 text-xs text-[var(--err)]">{error}</p>
								)}
							</div>
						</div>
					</div>
					<div className="mb-4 rounded-lg border border-[rgba(250,189,47,0.3)] bg-[rgba(250,189,47,0.06)] p-4 text-sm">
						<p className="mb-2 font-semibold text-[var(--warn)]">
							秘密鍵を安全に保管してください
						</p>
						<p className="mb-2 text-[var(--fg-dim)]">
							この秘密鍵を失うとアカウントを復元できません。
						</p>
						<div className="flex gap-1">
							<input
								type={showNsec ? "text" : "password"}
								value={generatedNsec}
								readOnly
								className="flex-1 rounded bg-[var(--bg-pane)] p-2 font-mono text-xs text-[var(--fg)]"
							/>
							<button
								type="button"
								onClick={() => setShowNsec(!showNsec)}
								className="shrink-0 rounded bg-[var(--bg-elev-2)] px-2 text-xs text-[var(--fg-dim)] hover:bg-[var(--line)]"
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
								className="shrink-0 rounded bg-[var(--bg-elev-2)] px-2 text-xs text-[var(--fg-dim)] hover:bg-[var(--line)]"
							>
								{copied ? "コピー済" : "コピー"}
							</button>
						</div>
					</div>
					<button
						type="button"
						onClick={handleConfirmGenerated}
						className="w-full rounded bg-[var(--accent)] py-2 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--accent-strong)]"
					>
						保管しました
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
			<div className="mx-4 w-full max-w-md rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-lg font-bold text-[var(--fg)]">ログイン</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--fg-dim)] hover:text-[var(--fg)]"
					>
						✕
					</button>
				</div>

				{error && (
					<div className="mb-4 rounded-lg border border-[rgba(251,73,52,0.3)] bg-[rgba(251,73,52,0.08)] p-3 text-sm text-[var(--err)]">
						{error}
					</div>
				)}

				<div className="space-y-3">
					<button
						type="button"
						onClick={handleNip07Login}
						disabled={nip07Loading}
						className="w-full rounded border border-[var(--line)] px-4 py-3 text-left text-sm transition hover:bg-[var(--bg-elev-2)] disabled:opacity-70"
					>
						{nip07Loading ? (
							<div className="flex items-center gap-2">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
								<span className="font-semibold text-[var(--fg)]">
									接続中...
								</span>
							</div>
						) : (
							<>
								<span className="font-semibold text-[var(--fg)]">
									NIP-07 拡張機能でログイン
								</span>
								<br />
								<span className="text-xs text-[var(--fg-mute)]">
									nos2x等のブラウザ拡張を使用（推奨）
								</span>
							</>
						)}
					</button>

					<button
						type="button"
						onClick={handleGenerateKeys}
						className="w-full rounded border border-[var(--line)] px-4 py-3 text-left text-sm transition hover:bg-[var(--bg-elev-2)]"
					>
						<span className="font-semibold text-[var(--fg)]">
							新しい鍵ペアを生成
						</span>
						<br />
						<span className="text-xs text-[var(--fg-mute)]">
							新規アカウントを作成
						</span>
					</button>

					<div className="border-t border-[var(--line)] pt-3">
						<label
							htmlFor="nsec-input"
							className="mb-1 block text-sm font-semibold text-[var(--fg)]"
						>
							秘密鍵（nsec）で直接ログイン
						</label>
						<div className="flex gap-2">
							<input
								id="nsec-input"
								type="password"
								autoComplete="off"
								value={nsecInput}
								onChange={(e) => setNsecInput(e.target.value)}
								placeholder="nsec1..."
								className="flex-1 rounded border border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-mute)] focus:border-[var(--accent)]"
							/>
							<button
								type="button"
								onClick={handleNsecLogin}
								disabled={!nsecInput.trim()}
								className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
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
