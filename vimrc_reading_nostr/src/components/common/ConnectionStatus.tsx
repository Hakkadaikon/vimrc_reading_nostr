import { useRelayStore } from "#/stores/relay-store";

export function ConnectionStatus() {
	const statuses = useRelayStore((s) => s.statuses);
	const isAnyConnected = useRelayStore((s) => s.isAnyConnected());

	const connectedCount = Object.values(statuses).filter(
		(s) => s === "connected",
	).length;
	const totalCount = Object.keys(statuses).length;

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
}
