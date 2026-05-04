import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useRelayStore } from "#/stores/relay-store";

export const ConnectionStatus = memo(function ConnectionStatus() {
	const statuses = useRelayStore((s) => s.statuses);
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const connectedCount = Object.values(statuses).filter(
		(s) => s === "connected",
	).length;
	const totalCount = Object.keys(statuses).length;
	const isAnyConnected = connectedCount > 0;

	const handleClickOutside = useCallback((e: MouseEvent) => {
		if (ref.current && !ref.current.contains(e.target as Node)) {
			setOpen(false);
		}
	}, []);

	useEffect(() => {
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open, handleClickOutside]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs hover:bg-[var(--bg-elev-2)] md:gap-2 md:px-2 md:py-1 md:text-sm"
			>
				<span
					className={`inline-block h-2 w-2 rounded-full md:h-3 md:w-3 ${
						isAnyConnected
							? "bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]"
							: "bg-[var(--err)]"
					}`}
				/>
				<span className="text-[var(--fg-mute)]">
					{totalCount === 0
						? "未接続"
						: isAnyConnected
							? `${connectedCount}/${totalCount}`
							: "切断"}
				</span>
			</button>

			{open && (
				<div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] rounded border border-[var(--line)] bg-[var(--bg-elev)] shadow-lg">
					<div className="border-b border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--fg-dim)]">
						リレー接続状況
					</div>
					<ul className="py-1">
						{Object.entries(statuses).map(([url, status]) => (
							<li
								key={url}
								className="flex items-center gap-2 px-3 py-1.5 text-xs"
							>
								<span
									className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
										status === "connected"
											? "bg-[var(--accent)]"
											: status === "connecting"
												? "bg-[var(--warn)]"
												: "bg-[var(--err)]"
									}`}
								/>
								<span className="flex-1 truncate text-[var(--fg)]">
									{url.replace("wss://", "")}
								</span>
								<span className="flex-shrink-0 text-[var(--fg-mute)]">
									{status === "connected"
										? "接続中"
										: status === "connecting"
											? "接続試行中"
											: status === "error"
												? "エラー"
												: "切断"}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
});
