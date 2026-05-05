# 対応NIP一覧

本プロジェクトで使用しているNostr Implementation Possibilities (NIP) の一覧です。

## NIP対応表

| NIP | 名称 | 利用シーン | 関連ファイル |
|-----|------|-----------|-------------|
| NIP-01 | Basic Protocol | イベントの作成・署名・検証、リレーとのWebSocket通信（REQ/EVENT/EOSE） | `src/hooks/useRelayPool.ts`, `src/lib/nostr/events.ts` |
| NIP-07 | Browser Extension | ブラウザ拡張（nos2x等）経由でのログイン・イベント署名 | `src/lib/nostr/nip07.ts`, `src/components/auth/LoginDialog.tsx` |
| NIP-09 | Event Deletion | メッセージ削除（kind:5イベントの作成・処理） | `src/lib/nostr/events.ts` |
| NIP-19 | bech32 Encoding | npub/nsec/neventのエンコード・デコード、Permalink生成 | `src/lib/nostr/nip19.ts`, `src/lib/nostr/keys.ts` |
| NIP-25 | Reactions | メッセージへのリアクション（kind:7イベント） | `src/lib/nostr/reactions.ts`, `src/stores/reaction-store.ts` |
| NIP-28 | Public Chat | チャンネルメッセージの投稿・受信（kind:40チャンネル定義、kind:42メッセージ） | `src/lib/nostr/channel.ts`, `src/lib/nostr/events.ts` |
| NIP-65 | Relay List Metadata | ユーザーのリレーリスト取得（kind:10002）、プロフィール解決時のリレー探索 | `src/lib/nostr/relay-discovery.ts` |
| NIP-94 | File Metadata | 画像アップロードのレスポンス解析（nip94_event.tags内のURL取得） | `src/lib/image-upload.ts` |
| NIP-96 | HTTP File Storage | 画像アップロードAPI（`/api/v2/nip96/upload`エンドポイント） | `src/lib/image-upload.ts` |
| NIP-98 | HTTP Auth | 画像アップロード時の認証（kind:27235イベントをAuthorizationヘッダーに付与） | `src/lib/image-upload.ts` |

## kindイベント一覧

| kind | NIP | 用途 | 操作 |
|------|-----|------|------|
| 0 | NIP-01 | ユーザーメタデータ（名前、アイコン等） | 読み取り・書き込み |
| 5 | NIP-09 | イベント削除 | 書き込み |
| 7 | NIP-25 | リアクション | 読み取り・書き込み |
| 40 | NIP-28 | チャンネル作成 | 読み取り（固定チャンネルID参照） |
| 42 | NIP-28 | チャンネルメッセージ | 読み取り・書き込み |
| 10002 | NIP-65 | リレーリストメタデータ | 読み取り |
| 27235 | NIP-98 | HTTP認証イベント | 書き込み（アップロード認証用） |
