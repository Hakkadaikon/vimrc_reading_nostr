import type { NostrMessage } from "#/stores/message-store";

const JST_OFFSET_SECONDS = 9 * 60 * 60;

export function isWithinTodayRange(
	createdAt: number,
	rangeStart: number,
	rangeEnd: number,
): boolean {
	return createdAt >= rangeStart && createdAt < rangeEnd;
}

export function getTodayRange(nowUnix: number): {
	start: number;
	end: number;
} {
	const jstSeconds = nowUnix + JST_OFFSET_SECONDS;
	// AM5:00 JST で日付切り替え
	const BOUNDARY_HOUR = 5;
	const adjustedJst = jstSeconds - BOUNDARY_HOUR * 3600;
	const dayStart = adjustedJst - (adjustedJst % 86400);
	const utcStart = dayStart + BOUNDARY_HOUR * 3600 - JST_OFFSET_SECONDS;
	const utcEnd = utcStart + 86400;
	return { start: utcStart, end: utcEnd };
}

export function getTodayParticipants(
	messages: NostrMessage[],
	rangeStart: number,
	rangeEnd: number,
): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const msg of messages) {
		if (
			isWithinTodayRange(msg.created_at, rangeStart, rangeEnd) &&
			!seen.has(msg.pubkey)
		) {
			seen.add(msg.pubkey);
			result.push(msg.pubkey);
		}
	}
	return result;
}
