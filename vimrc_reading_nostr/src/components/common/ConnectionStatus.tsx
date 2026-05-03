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
		<div className="flex items-center gap-2 text-sm">
			<span
				className={`inline-block h-2 w-2 rounded-full ${
					isAnyConnected ? "bg-green-500" : "bg-red-500"
				}`}
			/>
			<span className="text-[var(--sea-ink-soft)]">
				{totalCount === 0
					? "未接続"
					: isAnyConnected
						? `接続中 (${connectedCount}/${totalCount})`
						: "切断"}
			</span>
		</div>
	);
});
