import { beforeEach, describe, expect, it } from "vitest";
import { useRelayStore } from "./relay-store";

describe("useRelayStore", () => {
	beforeEach(() => {
		useRelayStore.setState({ statuses: {} });
	});

	it("初期状態ではリレーステータスが空", () => {
		expect(useRelayStore.getState().statuses).toEqual({});
	});

	it("リレーの接続状態を設定できる", () => {
		useRelayStore.getState().setStatus("wss://relay1.example.com", "connected");
		expect(useRelayStore.getState().statuses["wss://relay1.example.com"]).toBe(
			"connected",
		);
	});

	it("複数リレーの状態を管理できる", () => {
		useRelayStore.getState().setStatus("wss://relay1.example.com", "connected");
		useRelayStore
			.getState()
			.setStatus("wss://relay2.example.com", "connecting");
		expect(useRelayStore.getState().statuses["wss://relay1.example.com"]).toBe(
			"connected",
		);
		expect(useRelayStore.getState().statuses["wss://relay2.example.com"]).toBe(
			"connecting",
		);
	});
});
