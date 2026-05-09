import { createMockRelay, type MockRelay } from "./fixtures/mock-relay";

const MOCK_RELAY_PORT = 17999;

let relay: MockRelay;

export default async function globalSetup() {
	relay = await createMockRelay(MOCK_RELAY_PORT);
	process.env.VITE_RELAY_URLS = relay.url;
	return async () => {
		relay.close();
	};
}
