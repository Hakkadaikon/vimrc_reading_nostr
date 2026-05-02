import { test as base, expect } from "@playwright/test";
import { type MockRelay, createMockRelay } from "./mock-relay";

type TestFixtures = {
	mockRelay: MockRelay;
};

// ランダムポートを使用して並列テストの衝突を避ける
let portCounter = 18000;
function nextPort(): number {
	return portCounter++;
}

export const test = base.extend<TestFixtures>({
	mockRelay: async ({}, use) => {
		const relay = await createMockRelay(nextPort());
		await use(relay);
		relay.close();
	},
});

export { expect };
