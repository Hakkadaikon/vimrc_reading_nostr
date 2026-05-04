import { memo } from "react";
import { useRelayStore } from "#/stores/relay-store";

export const ConnectionStatus = memo(function ConnectionStatus() {
	const statuses = useRelayStore((s) => s.statuses);

	const connectedCount = Object.values(statuses).filter(
		(s) => s === "connected",
	).length;
	const totalCount = Object.keys(statuses).length;
	const isAnyConnected = connectedCount > 0;

	return (
		<div className="flex items-center gap-1.5 text-xs">
			<span
				className={`inline-block h-2 w-2 rounded-full ${
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
		</div>
	);
});
