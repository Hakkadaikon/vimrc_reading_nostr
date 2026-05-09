export const DEFAULT_RELAY_URLS: string[] = [
	"wss://vim_relay.hakkadaikon.com/",
];

export function getRelayUrls(): string[] {
	const envValue = import.meta.env.VITE_RELAY_URLS as string | undefined;
	if (!envValue) {
		return DEFAULT_RELAY_URLS;
	}
	const urls = envValue
		.split(",")
		.map((url) => url.trim())
		.filter((url) => url.length > 0);
	return urls.length > 0 ? urls : DEFAULT_RELAY_URLS;
}
