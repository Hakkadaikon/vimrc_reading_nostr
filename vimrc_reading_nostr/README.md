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

## ディレクトリ構成

```
src/
├── routes/          # ページ（TanStack Router ファイルベースルーティング）
│   ├── __root.tsx   # ルートレイアウト（認証・設定の復元）
│   ├── index.tsx    # メインチャット画面
│   └── settings.tsx # 設定画面
├── components/      # UIコンポーネント
│   ├── chat/        # チャット（MessageList, MessageItem, MessageForm, ParticipantList, GitHubCodePreview）
│   ├── auth/        # 認証（LoginDialog, UserInfo）
│   └── common/      # 共通（ConnectionStatus）
├── hooks/           # カスタムフック（useRelayPool）
├── lib/             # ユーティリティ
│   ├── nostr/       # Nostrプロトコル（channel, events, keys, nip07, nip19, metadata, reactions, relay-*, profile-cache, participants, time）
│   ├── github.ts    # GitHubファイルURL解析
│   └── markdown.ts  # Markdown変換（marked + DOMPurify + highlight.js）
├── stores/          # Zustandストア
│   ├── auth-store.ts      # 認証状態（localStorage永続化）
│   ├── message-store.ts   # メッセージ一覧
│   ├── profile-store.ts   # ユーザープロフィール
│   ├── reaction-store.ts  # リアクション
│   ├── relay-store.ts     # リレー接続状態
│   └── settings-store.ts  # アプリ設定（localStorage永続化）
└── styles.css       # グローバルスタイル
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `VITE_RELAY_URLS` | リレーURLのカンマ区切り | `wss://relay.damus.io,wss://nos.lol` |

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
