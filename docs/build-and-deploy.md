# ビルド・デプロイ手順

## 前提条件

- Node.js
- pnpm
- Cloudflare アカウント（デプロイ時）
- wrangler CLI（`pnpm add -g wrangler` または npx 経由で使用）

## ビルド

```bash
cd vimrc_reading_nostr
pnpm install
pnpm build
```

ビルド成果物は `dist/` に出力されます。

### ビルド結果のローカル確認

```bash
pnpm preview
```

Vite のプレビューサーバーが起動し、ビルド結果を確認できます。

### Cloudflare Workers ローカルプレビュー

```bash
pnpm preview:worker
```

wrangler dev で Workers 環境をローカルにエミュレートして動作確認できます。

## デプロイ

### デプロイ先

- **プラットフォーム**: Cloudflare Workers
- **ドメイン / Worker名**: `wrangler.jsonc` の `name` および `routes` で設定

### 手順

```bash
cd vimrc_reading_nostr
pnpm deploy
```

内部的に `wrangler deploy` が実行されます。

初回はブラウザが開いて Cloudflare への認証が求められます。2回目以降は認証情報がキャッシュされます。

### 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `VITE_RELAY_URLS` | Nostrリレーサーバーのカンマ区切りURL | `wss://yabu.me,wss://relay-jp.nostr.wirednet.jp` |

環境変数はビルド時に埋め込まれます（`VITE_` プレフィックスの変数は Vite によってクライアントバンドルに含まれる）。

### wrangler 設定

`wrangler.jsonc` で管理しています:

- `name`: Worker 名
- `compatibility_date`: Workers 互換日付
- `compatibility_flags`: `nodejs_compat`（Node.js 互換モード）
- `routes`: カスタムドメインの設定（任意のドメインを指定可能）

### デプロイの流れ

1. `pnpm build` でアプリケーションをビルド（Vite + TanStack Start）
2. `wrangler deploy` がビルド成果物を Cloudflare Workers にアップロード
3. アセット（静的ファイル）は Workers の Assets 機能で配信
4. サーバーサイドのエントリポイントは `@tanstack/react-start/server-entry`

### トラブルシューティング

- **認証エラー**: `wrangler login` を実行して再認証
- **ビルドエラー**: `pnpm build` を先に実行してエラーがないか確認
- **デプロイ後に反映されない**: Cloudflare のキャッシュが残っている場合がある。数分待つか、ダッシュボードからキャッシュをパージ
