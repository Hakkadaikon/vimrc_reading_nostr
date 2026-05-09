import { expect, test } from "./fixtures/test-helpers";

// ヘッダーのログインボタン（アイコンボタン、title="ログイン"）
function headerLoginButton(page: import("@playwright/test").Page) {
	return page.getByRole("button", { name: "ログイン" }).first();
}

// 初期ロードが完了するまで待つ（モックリレーからEOSEを受信して読み込み完了）
async function waitForInitialLoad(page: import("@playwright/test").Page) {
	await page.goto("/");
	await page.waitForLoadState("domcontentloaded");
	// 読み込み中スピナーが消えてコンテンツが表示されるまで待つ
	await expect(
		page.getByText("メッセージを読み込んでいます..."),
	).not.toBeVisible({ timeout: 30000 });
}

// SSR hydration完了後にログインダイアログを開く
async function openLoginDialog(page: import("@playwright/test").Page) {
	await waitForInitialLoad(page);
	// hydration完了を待ってからクリック — リトライでhydration遅延に対応
	await expect(async () => {
		await headerLoginButton(page).click({ timeout: 2000 });
		await expect(page.getByText("新しい鍵ペアを生成")).toBeVisible({
			timeout: 2000,
		});
	}).toPass({ timeout: 15000 });
}

test.describe("チャット画面", () => {
	test("未ログイン状態でチャット画面が表示される", async ({ page }) => {
		await waitForInitialLoad(page);

		await expect(page.getByText("vimrc読書会")).toBeVisible();
		await expect(headerLoginButton(page)).toBeVisible();
		await expect(
			page.getByText("するとメッセージを投稿できます"),
		).toBeVisible();
	});

	test("未ログイン状態ではメッセージ入力欄が表示されない", async ({
		page,
	}) => {
		await waitForInitialLoad(page);
		await expect(
			page.getByPlaceholder("メッセージを入力... (Ctrl+Enterで送信)"),
		).not.toBeVisible();
	});

	test("メッセージがないとき空メッセージが表示される", async ({ page }) => {
		await waitForInitialLoad(page);
		await expect(page.getByText("メッセージはまだありません")).toBeVisible();
	});
});

test.describe("ログインダイアログ", () => {
	test("ログインボタンを押すとダイアログが開く", async ({ page }) => {
		await openLoginDialog(page);

		await expect(page.getByText("NIP-07 拡張機能でログイン")).toBeVisible();
		await expect(page.getByText("新しい鍵ペアを生成")).toBeVisible();
		await expect(page.getByPlaceholder("nsec1...")).toBeVisible();
	});

	test("鍵ペアを生成するとnsecが表示される", async ({ page }) => {
		await openLoginDialog(page);
		await page.getByText("新しい鍵ペアを生成").click();

		await expect(page.getByText("鍵ペアを生成しました")).toBeVisible();
		await expect(
			page.getByText("秘密鍵を安全に保管してください"),
		).toBeVisible();

		// nsecはパスワード入力欄に格納されている。「表示」ボタンで可視化できる
		await page.getByRole("button", { name: "表示" }).click();
		const nsecInput = page.locator("input[type='text'][readonly]");
		await expect(nsecInput).toBeVisible();
		const nsecValue = await nsecInput.inputValue();
		expect(nsecValue).toMatch(/^nsec1/);
	});

	test("鍵ペア生成後に「保管しました」を押すとログイン済みになる", async ({
		page,
	}) => {
		await openLoginDialog(page);
		await page.getByText("新しい鍵ペアを生成").click();
		await page.getByRole("button", { name: "保管しました" }).click();

		// ログアウトボタンはアイコン（title="ログアウト"）
		await expect(
			page.getByRole("button", { name: "ログアウト" }),
		).toBeVisible({ timeout: 10000 });
		// メッセージ入力欄が表示される（Ctrl+Enterで送信）
		await expect(
			page.getByPlaceholder("メッセージを入力... (Ctrl+Enterで送信)"),
		).toBeVisible();
	});

	test("ログアウトすると未ログイン状態に戻る", async ({ page }) => {
		await openLoginDialog(page);
		await page.getByText("新しい鍵ペアを生成").click();
		await page.getByRole("button", { name: "保管しました" }).click();

		// ログアウト確認ダイアログ経由（ヘッダーのアイコンボタン）
		await page.getByRole("button", { name: "ログアウト" }).click();
		// 確認ダイアログが表示される
		await expect(page.getByText("ログアウト確認")).toBeVisible({
			timeout: 5000,
		});
		// 確認ダイアログ内の「ログアウト」ボタンをクリック（赤いボタン）
		await page.getByRole("button", { name: "ログアウト" }).last().click();

		await expect(headerLoginButton(page)).toBeVisible();
	});

	test("閉じるボタンでダイアログを閉じる", async ({ page }) => {
		await openLoginDialog(page);

		await page.getByText("✕").click();

		await expect(page.getByText("vimrc読書会")).toBeVisible();
		await expect(page.getByText("新しい鍵ペアを生成")).not.toBeVisible();
	});
});
