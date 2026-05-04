import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
	clearProfileCache,
	getCacheEntryCount,
} from "#/lib/nostr/profile-cache";
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

	return (
		<main className="page-wrap px-4 py-8">
			<div className="mx-auto max-w-2xl">
				<div className="mb-6 flex items-center gap-4">
					<Link
						to="/"
						className="text-sm text-[var(--fg-dim)] hover:text-[var(--accent)] hover:underline"
					>
						← チャットに戻る
					</Link>
					<h1 className="text-xl font-bold text-[var(--fg)]">設定</h1>
				</div>

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
						className="rounded bg-[var(--err)] px-4 py-2 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
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
	);
}
