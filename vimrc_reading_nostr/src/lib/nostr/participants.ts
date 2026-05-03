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
	const jstDayStart = jstSeconds - (jstSeconds % 86400);
	const utcDayStart = jstDayStart - JST_OFFSET_SECONDS;
	const utcNextDay2am = utcDayStart + 26 * 60 * 60; // +26h = 翌日AM2:00 JST
	return { start: utcDayStart, end: utcNextDay2am };
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
