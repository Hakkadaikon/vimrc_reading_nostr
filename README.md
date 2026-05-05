# vimrc読書会クライアント(Nostr)

[vimrc読書会](https://vim-jp.org/reading-vimrc/)用のチャットクライアントです。Nostrプロトコル（NIP-28 Public Chat）上で動作します。

## 主な機能

- NIP-28チャンネルでのメッセージ投稿・リアルタイム表示
- Markdown + シンタックスハイライト（Vimscript対応）
- GitHubファイルリンクのコードプレビュー（行範囲指定対応）
- NIP-07（ブラウザ拡張）/ 鍵ペア生成 / nsec入力によるログイン
- アイコン設定（URL入力 / クリップボードから画像アップロード）
- Permalink（nevent）によるメッセージ共有
- リアクション・メッセージ削除
- 当日の参加者リスト表示

## 技術スタック

- **フレームワーク**: TanStack Start (React) + TanStack Router
- **スタイリング**: Tailwind CSS v4
- **Nostr**: nostr-tools
- **状態管理**: Zustand
- **テスト**: Vitest + Testing Library / Playwright (E2E)
- **リンター**: Biome
- **ビルド**: Vite

## セットアップ

```bash
cd vimrc_reading_nostr
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
| `pnpm test` | ユニットテスト実行 |
| `pnpm check` | Biome lint + format チェック |
| `pnpm test:e2e` | E2Eテスト実行 |

## ディレクトリ構成

```
.
├── docs/                  # プロジェクトドキュメント
├── vimrc_reading_nostr/   # アプリケーション本体
│   ├── src/
│   │   ├── routes/        # ページコンポーネント（TanStack Router）
│   │   ├── components/    # UIコンポーネント（chat/, auth/, common/）
│   │   ├── hooks/         # カスタムReactフック
│   │   ├── lib/           # ユーティリティ・ビジネスロジック
│   │   │   └── nostr/     # Nostrプロトコル関連
│   │   ├── stores/        # Zustandストア
│   │   └── types/         # TypeScript型定義
│   ├── e2e/               # E2Eテスト（Playwright）
│   └── package.json
├── LICENSE                # MIT License
└── README.md
```

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [docs/specs.md](docs/specs.md) | 要件定義。MUST/SHOULD/MAYの機能一覧と実装済み追加機能 |
| [docs/architecture.md](docs/architecture.md) | アーキテクチャ設計書。技術スタック、ADR（設計判断記録）、UI/UX方針、認証方式、リレー構成 |
| [docs/TODO.md](docs/TODO.md) | 実装計画。Phase 0〜6のタスク一覧と進捗状況 |
| [docs/build-and-deploy.md](docs/build-and-deploy.md) | ビルド・デプロイ手順。Cloudflare Workers への配備方法 |

## ライセンス

MIT
