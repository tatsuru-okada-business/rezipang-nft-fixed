# 🦊 MetaMask「虚偽のリクエスト」警告の解決方法

## 問題の概要

Vercelのデフォルトドメイン（`*.vercel.app`）を使用している場合、MetaMaskが「虚偽のリクエスト」という警告を表示することがあります。

## 原因

### 1. Vercelデフォルトドメインの影響
- `*.vercel.app`ドメインは開発/テスト用として認識される
- MetaMaskの2025年8月のセキュリティアップデートで検出が強化

### 2. Thirdweb APIキーのドメイン制限
- APIキーに許可されたドメインが設定されていない
- localhostと本番ドメインの不一致

### 3. ERC20 Approve金額の問題
- ZENYトークンのapprove金額が異常に大きい値として検出される可能性

## 解決方法

### ステップ1: Thirdwebダッシュボードでドメインを許可

1. [Thirdweb Dashboard](https://thirdweb.com/team)にアクセス
2. プロジェクトを選択
3. **Settings** → **API Keys**
4. **Allowed Domains**に以下を追加：
   ```
   rezipang-nfts-mint.vercel.app
   rezipang-nfts-mint-*.vercel.app
   localhost:3000
   ```

### ステップ2: カスタムドメインの設定（推奨）

#### Vercelでの設定
1. Vercel Dashboard → プロジェクト選択
2. **Settings** → **Domains**
3. **Add Domain**をクリック
4. カスタムドメイン（例：`mint.rezipang.com`）を入力
5. DNSレコードを設定：
   ```
   Type: CNAME
   Name: mint
   Value: cname.vercel-dns.com
   ```

#### Thirdwebでの更新
カスタムドメインを設定したら、Thirdwebの**Allowed Domains**に追加：
```
mint.rezipang.com
```

### ステップ3: 環境変数の追加（必要に応じて）

`.env.local`に以下を追加（まだない場合）：
```env
# Payment Configuration
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0x7B2d2732dcCC1830AA63241dC13649b7861d9b54
NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL=ZENY
NEXT_PUBLIC_MINT_PRICE=1
```

Vercel Dashboardでも同様に設定。

### ステップ4: コードの最適化（実施済み）

以下の修正を実施済み：
- ✅ approve金額をBigIntから文字列に変換
- ✅ デバッグログの追加
- ✅ エラーハンドリングの改善

## テスト方法

### 1. ローカルテスト
```bash
# サーバー起動
pnpm run dev

# 別ターミナルでテスト実行
node scripts/test-mint.js
```

### 2. 本番環境テスト
1. MetaMaskを開く
2. ネットワークをPolygonに切り替え
3. サイトにアクセスしてウォレット接続
4. MINT操作を実行

## チェックリスト

- [ ] Thirdwebダッシュボードでドメイン許可設定
- [ ] Vercelのドメインが正しく設定されている
- [ ] 環境変数が正しく設定されている
- [ ] MetaMaskがPolygonネットワークに接続されている
- [ ] ZENYトークンの残高が十分にある

## それでも警告が出る場合

### 一時的な対処法
1. MetaMaskの警告画面で「詳細」をクリック
2. 「このサイトを信頼する」を選択（自己責任）

### 恒久的な解決策
1. カスタムドメインの設定（最も効果的）
2. SSL証明書の確認
3. Thirdweb SDKのアップデート確認

## サポート

問題が解決しない場合：
1. ブラウザのコンソールログを確認
2. `scripts/test-mint.js`の実行結果を確認
3. GitHub Issuesに報告

---

最終更新: 2025年1月
対応バージョン: MetaMask 11.x, Thirdweb SDK v5