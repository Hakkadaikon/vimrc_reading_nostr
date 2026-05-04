import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, LogIn, LogOut } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { UserInfo } from "#/components/auth/UserInfo";
import { ConnectionStatus } from "#/components/common/ConnectionStatus";
import {
	clearProfileCache,
	getCacheEntryCount,
} from "#/lib/nostr/profile-cache";
import { useAuthStore } from "#/stores/auth-store";
import { useMessageStore } from "#/stores/message-store";
import { useProfileStore } from "#/stores/profile-store";
import { useSettingsStore } from "#/stores/settings-store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
	const [cleared, setCleared] = useState(false);
	const profileCount = useProfileStore((s) => Object.keys(s.profiles).length);
	const githubPreviewEnabled = useSettingsStore((s) => s.githubPreviewEnabled);
	const setGithubPreviewEnabled = useSettingsStore(
		(s) => s.setGithubPreviewEnabled,
	);

	const messageCount = useMessageStore((s) => s.messages.length);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearedの変化でキャッシュクリア後に再計算する
	const cacheEntryCount = useMemo(() => getCacheEntryCount(), [cleared]);

	const handleClearCache = useCallback(() => {
		clearProfileCache();
		useProfileStore.getState().clearProfiles();
		useMessageStore.getState().clearMessages();
		setCleared(true);
		setTimeout(() => setCleared(false), 3000);
	}, []);

	const isLoggedIn = useAuthStore((s) => s.publicKey !== null);

	return (
		<div className="flex h-dvh flex-col bg-[var(--bg)]">
			<SettingsHeader isLoggedIn={isLoggedIn} />
			<main className="flex-1 overflow-y-auto px-4 py-8">
				<div className="mx-auto max-w-2xl">
					<section className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-6">
						<h2 className="mb-4 text-lg font-semibold text-[var(--fg)]">
							キャッシュ管理
						</h2>
						<p className="mb-2 text-sm text-[var(--fg-dim)]">
							プロフィール・リレーリスト・メッセージのlocalStorageキャッシュを管理します。
						</p>

						<div className="mb-4 rounded border border-[var(--line-soft)] bg-[var(--bg-pane)] p-4 text-sm">
							<div className="flex justify-between">
								<span className="text-[var(--fg-dim)]">
									メモリ上のプロフィール数
								</span>
								<span className="font-mono text-[var(--fg)]">
									{profileCount}
								</span>
							</div>
							<div className="mt-1 flex justify-between">
								<span className="text-[var(--fg-dim)]">
									キャッシュ済みメッセージ数
								</span>
								<span className="font-mono text-[var(--fg)]">
									{messageCount}
								</span>
							</div>
							<div className="mt-1 flex justify-between">
								<span className="text-[var(--fg-dim)]">
									localStorageキャッシュエントリ数
								</span>
								<span className="font-mono text-[var(--fg)]">
									{cacheEntryCount}
								</span>
							</div>
						</div>

						<button
							type="button"
							onClick={handleClearCache}
							className="rounded border border-[var(--line)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-semibold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
						>
							キャッシュをクリア
						</button>

						{cleared && (
							<p className="mt-2 text-sm text-[var(--accent)]">
								キャッシュをクリアしました。リロードするとプロフィールが再取得されます。
							</p>
						)}
					</section>

					<section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-6">
						<h2 className="mb-4 text-lg font-semibold text-[var(--fg)]">
							表示設定
						</h2>
						<label className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-[var(--fg)]">
									GitHubコードプレビュー
								</p>
								<p className="text-xs text-[var(--fg-dim)]">
									投稿内のGitHubファイルリンクからソースコードを取得して表示します
								</p>
							</div>
							<input
								type="checkbox"
								checked={githubPreviewEnabled}
								onChange={(e) => setGithubPreviewEnabled(e.target.checked)}
								className="h-5 w-5 rounded accent-[var(--accent)]"
							/>
						</label>
					</section>
				</div>
			</main>
		</div>
	);
}

function SettingsHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
	return (
		<div className="relative z-50 flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-pane)] px-3 py-2 md:px-5 md:py-3">
			<div className="flex items-center gap-2 md:gap-4">
				<h1 className="text-base font-bold text-[var(--fg)] md:text-lg">
					設定
				</h1>
				<ConnectionStatus />
			</div>
			<div className="flex items-center gap-2 md:gap-4">
				{isLoggedIn && (
					<span className="hidden md:inline-flex">
						<UserInfo />
					</span>
				)}
				<Link
					to="/"
					className="rounded p-2 text-[var(--accent)] hover:bg-[var(--bg-elev-2)]"
					title="ホームに戻る"
				>
					<Home className="h-5 w-5 md:h-6 md:w-6" />
				</Link>
				{isLoggedIn ? (
					<button
						type="button"
						onClick={() => useAuthStore.getState().logout()}
						className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
						title="ログアウト"
					>
						<LogOut className="h-5 w-5 md:h-6 md:w-6" />
					</button>
				) : (
					<Link
						to="/"
						className="rounded p-2 text-[var(--fg-dim)] hover:bg-[var(--bg-elev-2)]"
						title="ログイン"
					>
						<LogIn className="h-5 w-5 md:h-6 md:w-6" />
					</Link>
				)}
			</div>
		</div>
	);
}
