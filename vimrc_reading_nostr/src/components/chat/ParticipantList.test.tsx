/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useProfileStore } from "#/stores/profile-store";
import { ParticipantList } from "./ParticipantList";

afterEach(cleanup);

describe("ParticipantList", () => {
	beforeEach(() => {
		useProfileStore.getState().clearProfiles();
	});

	it("発言者のプロフィール名がリンク付きで表示される", () => {
		useProfileStore.getState().setProfile("pubkey1", {
			name: "alice",
			display_name: "Alice",
			picture: "https://example.com/alice.png",
		});

		render(<ParticipantList participantPubkeys={["pubkey1"]} />);

		expect(screen.getByText("Alice")).toBeDefined();
		const link = screen.getByRole("link", { name: /Alice/ });
		expect(link.getAttribute("href")).toContain("njump.me");
	});

	it("プロフィールが未取得の場合でも短縮pubkeyが表示される", () => {
		render(
			<ParticipantList
				participantPubkeys={["abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"]}
			/>,
		);

		// shortenNpubで短縮された表示になる
		const items = screen.getAllByRole("link");
		expect(items.length).toBe(1);
	});

	it("参加者が0人の場合、リストは空", () => {
		render(<ParticipantList participantPubkeys={[]} />);

		const links = screen.queryAllByRole("link");
		expect(links.length).toBe(0);
	});

	it("アイコンがある場合はimg要素が表示される", () => {
		useProfileStore.getState().setProfile("pubkey1", {
			name: "alice",
			picture: "https://example.com/alice.png",
		});

		render(<ParticipantList participantPubkeys={["pubkey1"]} />);

		const img = screen.getByRole("img");
		expect(img.getAttribute("src")).toBe("https://example.com/alice.png");
	});
});
