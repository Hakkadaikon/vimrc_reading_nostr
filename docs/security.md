# セキュリティポリシー

本ドキュメントでは、vimrc読書会Nostrクライアントで実施済みのセキュリティ対策を記載する。

---

## 1. OGPプロキシ

### SSRF防止

OGPプロキシは外部URLを取得する機能を持つため、以下のSSRF対策を実施している。

- **スキーム制限**: `http:` / `https:` のみ許可。それ以外は400を返す
- **プライベートIP/ホストブロック**: `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `::1`, `fc00::/7`, `fe80::/10` へのリクエストを403で拒否
- **タイムアウト**: `AbortController`による10秒タイムアウトを設定し、Slow Loris攻撃を緩和

| ファイル | 関数/箇所 |
|---------|----------|
| `ogp-proxy/index.ts` | `isPrivateHost()`, fetch呼び出し |

### Content-Type検証

`text/html` に加え `application/xhtml+xml` も許可している。それ以外のContent-Typeは拒否する。

---

## 2. XSS対策

### Markdownレンダリング

ユーザー入力のMarkdownは以下のパイプラインで処理する。

1. `escapeHtml()` でHTML特殊文字をエスケープ
2. `marked.parse()` でMarkdownからHTMLを生成
3. **クライアント**: `DOMPurify.sanitize()` でサニタイズ
4. **SSR**: `window`が未定義の場合、HTMLタグをストリップして安全なテキストを返す

| ファイル | 関数 |
|---------|------|
| `vimrc_reading_nostr/src/lib/markdown.ts` | `renderMarkdown()` |

### プロフィール画像URL

kind:0メタデータの`picture`フィールドに対して、`http:` / `https:` スキームのみ許可する。`data:` / `javascript:` 等の危険なスキームは除外される。

| ファイル | 関数 |
|---------|------|
| `vimrc_reading_nostr/src/lib/nostr/metadata.ts` | `sanitizeUrl()` |

---

## 3. Nostrイベント検証

### 署名検証

`finalizeEvent()` または NIP-07拡張機能による署名後、`verifyEvent()` で署名の正当性を検証してからリレーに publish する。

### kind:5 削除イベントの権限チェック

他ユーザーのメッセージを不正に削除されることを防ぐため、kind:5イベント受信時に削除対象メッセージの`pubkey`と削除イベントの`pubkey`の一致を確認する。一致しない場合は削除を無視する。

### プロフィールキャッシュのpubkey検証

kind:0イベント受信時に`event.pubkey`がリクエストした`pubkey`と一致することを確認し、悪意あるリレーによるキャッシュ汚染を防止する。

### タイムスタンプ検証

`created_at`が現在時刻から15分(900秒)以上未来のイベントを拒否し、タイムスタンプ操作によるタイムライン操作を防止する。

### oneventエラーハンドリング

リレーからの不正なイベントによりサブスクリプションが停止することを防ぐため、全`onevent`コールバックを`try/catch`で保護する。

| ファイル | 箇所 |
|---------|------|
| `vimrc_reading_nostr/src/routes/index.tsx` | `signAndPublish()`, 各subscribeコールバック |
| `vimrc_reading_nostr/src/stores/message-store.ts` | `addMessage()`, `addMessages()` |
| `vimrc_reading_nostr/src/lib/nostr/relay-discovery.ts` | `fetchProfileViaPool()` |

---

## 4. 画像アップロード

### NIP-98認証イベント

アップロード時のNIP-98認証イベントに`payload`タグ(ファイルのSHA-256ハッシュ)を含め、サーバー側でペイロードの整合性を検証可能にする。

### 返却URL検証

NIP-96サーバーから返却されたURLが`https:`スキームであることを検証する。それ以外のURLはエラーとして拒否する。

### ファイルサイズ制限

アップロードファイルのサイズ上限を10MBとする。

| ファイル | 関数 |
|---------|------|
| `vimrc_reading_nostr/src/lib/image-upload.ts` | `uploadImage()`, `createNip98AuthEvent()` |

---

## 5. 認証・入力検証

### nsec入力フィールド

秘密鍵入力フィールドに`autoComplete="off"`を設定し、ブラウザによる秘密鍵の保存を防止する。

### NIP-07 pubkeyフォーマット検証

NIP-07拡張機能から取得した公開鍵が64文字のhex文字列(`/^[0-9a-f]{64}$/`)であることを検証する。

| ファイル | 箇所 |
|---------|------|
| `vimrc_reading_nostr/src/components/auth/LoginDialog.tsx` | `handleNip07Login()`, nsec入力フィールド |

---

## 6. リレー接続

### 再接続回数制限

リレーへの再接続試行回数を最大20回に制限する。上限到達時はステータスを`error`に設定し、無限リトライを防止する。

### WebSocketリーク防止

リレー再接続時、既存のRelay接続を`close()`してから新しい接続に置換する。

### リレーURL検証

kind:10002(リレーリスト)イベントから抽出したURLが`ws:` / `wss:` スキームであることを検証する。

| ファイル | 関数 |
|---------|------|
| `vimrc_reading_nostr/src/hooks/useRelayPool.ts` | `scheduleReconnect()`, `connectToRelay()` |
| `vimrc_reading_nostr/src/lib/nostr/relay-discovery.ts` | `parseRelayListEvent()` |

---

## 7. GitHubコードプレビュー

### 行範囲バリデーション

GitHubファイルURLの行番号指定(`#L1-L100`)に対し、1〜10000の範囲であること、および`endLine >= startLine`であることを検証する。範囲外の場合はプレビューを表示しない。

### 表示行数制限

コードプレビューの表示を最大500行に制限する。

| ファイル | 関数 |
|---------|------|
| `vimrc_reading_nostr/src/lib/github.ts` | `parseGitHubFileUrl()` |
| `vimrc_reading_nostr/src/components/chat/GitHubCodePreview.tsx` | `GitHubCodePreview` |
