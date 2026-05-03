# アーキテクチャ設計書

## 技術スタック

| カテゴリ | 選定 | 理由 |
|---------|------|------|
| フレームワーク | TanStack Start (React) | セットアップ済み。SSR対応 |
| ルーティング | TanStack Router | ファイルベースルーティング |
| スタイリング | Tailwind CSS v4 | セットアップ済み |
| テスト | Vitest + Testing Library | セットアップ済み |
| E2Eテスト | Playwright | Phase 5 で導入 |
| リンター | Biome | セットアップ済み |
| ビルド | Vite | セットアップ済み |
| 言語 | TypeScript (strict) | セットアップ済み |
| Nostrライブラリ | nostr-tools | 最も広く使われる。NIP-28対応。TypeScript型定義充実。軽量 |
| 状態管理 | Zustand | 軽量。React外からもアクセス可能（リレーコールバック内等）。TanStack Startと相性良好 |
| Markdown | marked + DOMPurify | 高速。XSSサニタイズはDOMPurifyで対応 |
| シンタックスハイライト（Markdown内） | highlight.js | 広い言語サポート。Vimscript対応 |
| シンタックスハイライト（GitHubプレビュー） | react-syntax-highlighter | React統合。Prism + oneDarkテーマ |

## 設計判断の記録

### ADR-001: Nostrライブラリに nostr-tools を採用 (2026-05-03)

**決定**: nostr-tools を使用する

**理由**:
- NIP-28 (Public Chat) の kind:40-44 をサポート
- TypeScript型定義が充実
- npm週間ダウンロード数が最も多く、コミュニティが活発
- バンドルサイズが軽量（tree-shaking対応）
- NDKは高機能だがオーバースペック（小規模チャットには不要な抽象化が多い）

**代替案**: NDK（却下: 依存が大きく学習コストが高い）、自前実装（却下: 開発コスト大）

### ADR-002: 状態管理に Zustand を採用 (2026-05-03)

**決定**: Zustand を使用する

**理由**:
- WebSocketコールバック内（React外）から状態更新が容易
- ボイラープレートが少なく、小規模プロジェクトに適する
- TanStack Queryはサーバーステート向きだが、WebSocketリアルタイムデータには過剰

**代替案**: React組み込み（却下: React外からの更新が困難）、TanStack Query（却下: WebSocketデータとの相性）、Jotai（却下: Zustandと同等だがZustandの方がStore単位の管理がしやすい）

### ADR-003: 認証方式 (2026-05-03)

**決定**: 3方式をすべてサポートする

1. **NIP-07（ブラウザ拡張）**: 推奨。最もセキュア
2. **アプリ内鍵生成**: 手軽。localStorageに保存
3. **nsec直接入力**: 上級者向けオプション

**理由**: 参加者は技術者だがNIP-07拡張を入れていない人もいる。手軽さとセキュリティのバランス

**永続化**: ログイン状態（publicKey, loginMethod, secretKey）はlocalStorageに保存し、ページリロード時に自動復元する。ログアウト時にクリアする

### ADR-004: リレーサーバー構成 (2026-05-03)

**決定**: 環境変数 `VITE_RELAY_URLS` でカンマ区切りのリレーURLを管理。デフォルト値あり

- 書き込み: 全リレーに同時書き込み
- 読み取り: 全リレーからマージ（重複排除はイベントIDで）
- 再接続: 指数バックオフ（1s → 2s → 4s → 8s → 16s → 最大30s）
- フェイルオーバー: 1台落ちても他のリレーで継続

### ADR-005: Markdown + シンタックスハイライト (2026-05-03)

**決定**: marked + DOMPurify + highlight.js + react-syntax-highlighter

**理由**:
- marked: 高速で軽量なMarkdownパーサー
- DOMPurify: XSSサニタイズの定番
- highlight.js: Vimscript含む広い言語サポート。vimrc読書会ではVim設定ファイルのコード共有が頻出
- react-syntax-highlighter: GitHubコードプレビュー用。React統合でPrism + oneDarkテーマを使用

## リレーサーバー構成

```
環境変数: VITE_RELAY_URLS
デフォルト: wss://yabu.me,wss://relay-jp.nostr.wirednet.jp
（本番では独自リレー2-3台に置き換え）
```

## ディレクトリ構成

```
vimrc_reading_nostr/src/
├── routes/              # TanStack Router ファイルベースルーティング
│   ├── __root.tsx       # ルートレイアウト
│   └── index.tsx        # メインチャット画面（シングルページ）
├── components/          # UIコンポーネント
│   ├── chat/            # チャット関連（MessageList, MessageItem, MessageForm）
│   ├── auth/            # 認証関連（LoginDialog, ProfileSettings）
│   └── common/          # 共通UI（Header, Footer, ConnectionStatus）
├── hooks/               # カスタムReactフック
├── lib/                 # ユーティリティ・ビジネスロジック
│   └── nostr/           # Nostrプロトコル関連（relay, events, channel, keys）
├── stores/              # Zustand ストア定義
├── types/               # TypeScript型定義
└── styles/              # グローバルスタイル（styles.css）
```

## UI/UX方針

- **シングルページ構成**: チャット画面が常にメイン。ルーティングは最小限
- **レスポンシブ**: モバイル対応は後回し（SHOULD）。まずデスクトップで動くものを作る
- **画面構成**:
  - ヘッダー: チャンネル名 + 接続状態 + 設定リンク + ログイン/プロフィール
  - 左ペイン: 当日の参加者リスト（JSTで当日0:00〜翌日AM2:00に発言した人のアイコン・名前をnjump.meリンク付きで表示）
  - メイン: メッセージ一覧（時系列、下が最新）
  - フッター: 投稿フォーム（未ログイン時はログインボタン）

## 認証方式

- NIP-07: `window.nostr` API 経由
- アプリ内生成: nostr-tools の `generateSecretKey()` → localStorage
- nsec入力: bech32デコード → localStorage
- ログアウト: localStorageから鍵を削除
