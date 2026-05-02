import { beforeEach, describe, expect, it } from "vitest";
import { useReactionStore } from "./reaction-store";

describe("useReactionStore", () => {
	beforeEach(() => {
		useReactionStore.getState().clearReactions();
	});

	it("初期状態ではリアクションが空", () => {
		expect(useReactionStore.getState().reactions).toEqual({});
	});

	it("リアクションを追加できる", () => {
		useReactionStore.getState().addReaction("event1", {
			id: "reaction1",
			pubkey: "pubkey1",
			content: "+",
		});
		const reactions = useReactionStore.getState().getReactions("event1");
		expect(reactions).toHaveLength(1);
		expect(reactions[0].content).toBe("+");
	});

	it("同じイベントに複数リアクションを追加できる", () => {
		useReactionStore.getState().addReaction("event1", {
			id: "r1",
			pubkey: "pubkey1",
			content: "+",
		});
		useReactionStore.getState().addReaction("event1", {
			id: "r2",
			pubkey: "pubkey2",
			content: "+",
		});
		expect(useReactionStore.getState().getReactions("event1")).toHaveLength(2);
	});

	it("同じリアクションIDは重複追加されない", () => {
		useReactionStore.getState().addReaction("event1", {
			id: "r1",
			pubkey: "pubkey1",
			content: "+",
		});
		useReactionStore.getState().addReaction("event1", {
			id: "r1",
			pubkey: "pubkey1",
			content: "+",
		});
		expect(useReactionStore.getState().getReactions("event1")).toHaveLength(1);
	});

	it("リアクション数を取得できる", () => {
		useReactionStore.getState().addReaction("event1", {
			id: "r1",
			pubkey: "p1",
			content: "+",
		});
		useReactionStore.getState().addReaction("event1", {
			id: "r2",
			pubkey: "p2",
			content: "+",
		});
		expect(useReactionStore.getState().getReactionCount("event1")).toBe(2);
	});

	it("存在しないイベントのリアクション数は0", () => {
		expect(useReactionStore.getState().getReactionCount("unknown")).toBe(0);
	});
});
