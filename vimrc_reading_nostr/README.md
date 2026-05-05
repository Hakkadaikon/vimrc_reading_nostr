# vimrc読書会 Nostrクライアント

vimrc読書会用チャットアプリケーションのソースコードです。

## セットアップ

```bash
pnpm install
pnpm dev
```

`http://localhost:3000` でアクセスできます。

## スクリプト

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動（port 3000） |
| `pnpm build` | プロダクションビルド |
| `pnpm preview` | ビルド結果のプレビュー |
| `pnpm test` | ユニットテスト実行（Vitest） |
| `pnpm check` | Biome lint + format チェック |
| `pnpm format` | Biome フォーマット |
| `pnpm lint` | Biome lint |
| `pnpm test:e2e` | E2Eテスト実行（Playwright） |
| `pnpm deploy` | Cloudflare Workersへデプロイ |

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `VITE_RELAY_URLS` | リレーURLのカンマ区切り | `wss://yabu.me,wss://relay-jp.nostr.wirednet.jp` |

## テスト

テストファイルは実装ファイルと同ディレクトリに `*.test.ts(x)` として配置しています。

```bash
pnpm test              # 全テスト実行
pnpm test:e2e          # E2Eテスト実行
pnpm test:e2e:ui       # E2Eテスト（UIモード）
pnpm test:e2e:debug    # E2Eテスト（デバッグモード）
```

## インポートエイリアス

`#/` が `./src/` にマッピングされています（package.json の `imports` フィールド）。

```ts
import { useAuthStore } from "#/stores/auth-store";
```

## 詳細ドキュメント

プロジェクトルートの `docs/` を参照してください。
