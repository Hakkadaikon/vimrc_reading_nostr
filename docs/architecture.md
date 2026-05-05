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
- リレープール管理: モジュールレベルのシングルトン（ページ遷移で接続を維持）

### ADR-005: Markdown + シンタックスハイライト (2026-05-03)

**決定**: marked + DOMPurify + highlight.js + react-syntax-highlighter

**理由**:
- marked: 高速で軽量なMarkdownパーサー
- DOMPurify: XSSサニタイズの定番
- highlight.js: Vimscript含む広い言語サポート。vimrc読書会ではVim設定ファイルのコード共有が頻出
- react-syntax-highlighter: GitHubコードプレビュー用。React統合でPrism + oneDarkテーマを使用

## メッセージ管理アーキテクチャ

```
[リレー(WebSocket)] → バックグラウンド受信 → localStorage蓄積
                                                    ↓
                                              UI表示（50件ずつページング）
```

- **バックグラウンド同期**: リレープールはモジュールレベルのシングルトン。ページ遷移しても接続を維持し、kind:42を常時受信してlocalStorageに蓄積する
- **UI表示**: localStorageから最新50件を読み出して表示。無限スクロールで古いメッセージを追加読み込み（localStorage → 不足分のみリレーへ問い合わせ）
- **PAGE_SIZE**: 50件（UI表示単位）
- **新着メッセージ**: 500msデバウンスでバッファリング → localStorage追記 + UIにリアルタイム反映

## ディレクトリ構成

```
vimrc_reading_nostr/src/
├── routes/              # TanStack Router ファイルベースルーティング
│   ├── __root.tsx       # ルートレイアウト
│   ├── index.tsx        # メインチャット画面（シングルページ）
│   └── settings.tsx     # 設定画面（キャッシュ管理、表示設定）
├── components/          # UIコンポーネント
│   ├── chat/            # チャット関連（MessageList, MessageItem, MessageForm, ParticipantList）
│   ├── auth/            # 認証関連（LoginDialog, UserInfo）
│   └── common/          # 共通UI（ConnectionStatus）
├── hooks/               # カスタムフック（useRelayPool: シングルトンリレープール管理）
├── lib/                 # ユーティリティ・ビジネスロジック
│   ├── github.ts        # GitHubファイルリンク解析・コードプレビュー
│   ├── markdown.ts      # Markdownレンダリング（marked + DOMPurify）
│   └── nostr/           # Nostrプロトコル関連
│       ├── channel.ts       # NIP-28チャンネルフィルタ生成
│       ├── events.ts        # イベントテンプレー��生成（kind:0,5,42）
│       ├── keys.ts          # 鍵ペア生成、nsecエンコード/デコード
│       ├── nip07.ts         # NIP-07ブラウザ拡張連携
│       ├── nip19.ts         # bech32エンコード（npub, nevent）
│       ├── participants.ts  # 当日参加者リスト算出
│       ├── profile-cache.ts # プロフィールlocalStorageキャッシュ
│       ├── reactions.ts     # リアクションイベント生成
│       ├── relay-config.ts  # リレーURL設定管理
│       ├── relay-discovery.ts # プロフィール解決（リレー+directory問い合わせ）
│       ├── metadata.ts      # kind:0メタデータパース
│       └── time.ts          # Unix時刻ユーティリティ
├── stores/              # Zustand ストア定義（auth, message, profile, relay, reaction, settings）
└── styles/              # グローバルスタイル（styles.css）
```

## UI/UX方針

- **シングルページ構成**: チャット画面が常にメイン。設定画面のみ別ルート
- **レスポンシブ対応**: モバイル（ドロワー式参加者リスト）とデスクトップ（リサイズ可能サイドバー）
- **テーマ**: Vim/ターミナル風ダーク固定（gruvbox系カラー、JetBrains Monoフォント）
- **画面構成**:
  - ヘッダー: チャンネル名 + リレー接続状態（クリックで詳細） + ユーザー名 + 設定/ログイン/ログアウト
  - 左ペイン: 当日の参加者リスト（AM5:00 JST切り替え、presence dot付き）
  - メイン: メッセージ一覧（時系列、下が最新、行番号ガター風タイムスタンプ）
  - フッター: 投稿フォーム（Slackライク送信アイコン、自動高さ調整）、未ログイン時はログイン促進バー

