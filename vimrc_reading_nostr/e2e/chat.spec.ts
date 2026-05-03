import { expect, test } from "./fixtures/test-helpers";

// ヘッダーのログインボタン（フッターにも「ログイン」リンクがあるため.first()で特定）
function headerLoginButton(page: import("@playwright/test").Page) {
	return page.getByRole("button", { name: "ログイン" }).first();
}

// SSR hydration完了後にログインダイアログを開く
async function openLoginDialog(page: import("@playwright/test").Page) {
	await page.goto("/");
	// DOMContentLoadedで十分。networkidleはWebSocket接続でtimeoutする
	await page.waitForLoadState("domcontentloaded");
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
		await page.goto("/");

		await expect(page.getByText("vimrc読書会")).toBeVisible();
		await expect(headerLoginButton(page)).toBeVisible();
		await expect(
			page.getByText("するとメッセージを投稿できます"),
		).toBeVisible();
	});

	test("未ログイン状態ではメッセージ入力欄が表示されない", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.getByRole("button", { name: "投稿" })).not.toBeVisible();
	});

	test("メッセージがないとき空メッセージが表示される", async ({ page }) => {
		await page.goto("/");
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

		// ダイアログ内のnsec表示を確認（DevToolsのcode要素を除外）
		const nsecElement = page.locator("code").filter({ hasText: /^nsec1/ });
		await expect(nsecElement).toBeVisible();
		const nsecText = await nsecElement.textContent();
		expect(nsecText?.trim()).toMatch(/^nsec1/);
	});

	test("鍵ペア生成後に「保管しました」を押すとログイン済みになる", async ({
		page,
	}) => {
		await openLoginDialog(page);
		await page.getByText("新しい鍵ペアを生成").click();
		await page.getByRole("button", { name: "保管しました" }).click();

		await expect(page.getByText("ログアウト")).toBeVisible({ timeout: 10000 });
		await expect(page.getByPlaceholder("メッセージを入力...")).toBeVisible();
		await expect(page.getByRole("button", { name: "投稿" })).toBeVisible();
	});

	test("ログアウトすると未ログイン状態に戻る", async ({ page }) => {
		await openLoginDialog(page);
		await page.getByText("新しい鍵ペアを生成").click();
		await page.getByRole("button", { name: "保管しました" }).click();

		await page.getByText("ログアウト").click();

		await expect(headerLoginButton(page)).toBeVisible();
	});

	test("閉じるボタンでダイアログを閉じる", async ({ page }) => {
		await openLoginDialog(page);

		await page.getByText("✕").click();

		await expect(page.getByText("vimrc読書会")).toBeVisible();
		await expect(page.getByText("新しい鍵ペアを生成")).not.toBeVisible();
	});
});
