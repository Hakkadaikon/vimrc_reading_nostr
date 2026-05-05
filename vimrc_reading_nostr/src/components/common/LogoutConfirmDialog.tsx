type LogoutConfirmDialogProps = {
	onConfirm: () => void;
	onCancel: () => void;
};

export function LogoutConfirmDialog({
	onConfirm,
	onCancel,
}: LogoutConfirmDialogProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
			<div className="mx-4 w-full max-w-sm rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-6 shadow-xl">
				<h2 className="mb-2 text-lg font-bold text-[var(--fg)]">
					ログアウト確認
				</h2>
				<p className="mb-6 text-sm text-[var(--fg-dim)]">
					ログアウトしますか？鍵生成で作成したアカウントの場合、秘密鍵（nsec）を保管していないとアカウントを復元できません。
				</p>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="flex-1 rounded border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--fg)] hover:bg-[var(--bg-elev-2)]"
					>
						キャンセル
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="flex-1 rounded bg-[var(--err)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
					>
						ログアウト
					</button>
				</div>
			</div>
		</div>
	);
}
