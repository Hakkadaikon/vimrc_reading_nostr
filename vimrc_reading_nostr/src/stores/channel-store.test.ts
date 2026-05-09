import { beforeEach, describe, expect, it } from "vitest";
import { useChannelStore } from "./channel-store";

describe("channel-store", () => {
	beforeEach(() => {
		useChannelStore.setState({
			metadata: { name: "vimrc読書会" },
			lastUpdatedAt: 0,
		});
	});

	it("初期状態ではデフォルトのチャンネル名が設定されている", () => {
		expect(useChannelStore.getState().metadata.name).toBe("vimrc読書会");
	});

	it("setMetadataでメタデータを更新できる", () => {
		useChannelStore
			.getState()
			.setMetadata({ name: "新しい名前", about: "説明文" }, 1000);
		const { metadata, lastUpdatedAt } = useChannelStore.getState();
		expect(metadata.name).toBe("新しい名前");
		expect(metadata.about).toBe("説明文");
		expect(lastUpdatedAt).toBe(1000);
	});

	it("古いタイムスタンプのメタデータは無視する", () => {
		useChannelStore.getState().setMetadata({ name: "新しい名前" }, 1000);
		useChannelStore.getState().setMetadata({ name: "古い名前" }, 500);
		expect(useChannelStore.getState().metadata.name).toBe("新しい名前");
	});

	it("同じタイムスタンプのメタデータは無視する", () => {
		useChannelStore.getState().setMetadata({ name: "最初" }, 1000);
		useChannelStore.getState().setMetadata({ name: "同時刻" }, 1000);
		expect(useChannelStore.getState().metadata.name).toBe("最初");
	});

	it("nameが空の場合はデフォルト名を使う", () => {
		useChannelStore
			.getState()
			.setMetadata({ name: "", about: "説明のみ" }, 1000);
		expect(useChannelStore.getState().metadata.name).toBe("vimrc読書会");
		expect(useChannelStore.getState().metadata.about).toBe("説明のみ");
	});

	it("nameがundefinedの場合はデフォルト名を使う", () => {
		useChannelStore.getState().setMetadata({ about: "説明のみ" }, 1000);
		expect(useChannelStore.getState().metadata.name).toBe("vimrc読書会");
	});
});
