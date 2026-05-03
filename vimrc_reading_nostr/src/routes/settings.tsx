import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
	clearProfileCache,
	getCacheEntryCount,
} from "#/lib/nostr/profile-cache";
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

	const cacheEntryCount = useMemo(() => getCacheEntryCount(), [cleared]);

	const handleClearCache = useCallback(() => {
		clearProfileCache();
		useProfileStore.getState().clearProfiles();
		setCleared(true);
		setTimeout(() => setCleared(false), 3000);
	}, []);

	return (
		<main className="page-wrap px-4 py-8">
			<div className="mx-auto max-w-2xl">
				<div className="mb-6 flex items-center gap-4">
					<Link
						to="/"
						className="text-sm text-[var(--sea-ink-soft)] hover:underline"
					>
						← チャットに戻る
					</Link>
					<h1 className="text-xl font-bold text-[var(--sea-ink)]">設定</h1>
				</div>

				<section className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
					<h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
						キャッシュ管理
					</h2>
					<p className="mb-2 text-sm text-[var(--sea-ink-soft)]">
						プロフィール（kind:0）とリレーリスト（kind:10002）のlocalStorageキャッシュを管理します。
					</p>

					<div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
						<div className="flex justify-between">
							<span className="text-[var(--sea-ink-soft)]">
								メモリ上のプロフィール数
							</span>
							<span className="font-mono text-[var(--sea-ink)]">
								{profileCount}
							</span>
						</div>
						<div className="mt-1 flex justify-between">
							<span className="text-[var(--sea-ink-soft)]">
								localStorageキャッシュエントリ数
							</span>
							<span className="font-mono text-[var(--sea-ink)]">
								{cacheEntryCount}
							</span>
						</div>
					</div>

					<button
						type="button"
						onClick={handleClearCache}
						className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
					>
						キャッシュをクリア
					</button>

					{cleared && (
						<p className="mt-2 text-sm text-green-600 dark:text-green-400">
							キャッシュをクリアしました。リロードするとプロフィールが再取得されます。
						</p>
					)}
				</section>

				<section className="mt-6 rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
					<h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
						表示設定
					</h2>
					<label className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-[var(--sea-ink)]">
								GitHubコードプレビュー
							</p>
							<p className="text-xs text-[var(--sea-ink-soft)]">
								投稿内のGitHubファイルリンクからソースコードを取得して表示します
							</p>
						</div>
						<input
							type="checkbox"
							checked={githubPreviewEnabled}
							onChange={(e) => setGithubPreviewEnabled(e.target.checked)}
							className="h-5 w-5 rounded accent-[rgba(233,84,32,0.9)]"
						/>
					</label>
				</section>
			</div>
		</main>
	);
}
