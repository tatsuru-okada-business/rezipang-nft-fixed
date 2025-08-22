# 🚀 Vercelデプロイ完全ガイド（2025年版）

## 目次
1. [事前準備](#事前準備)
2. [環境変数の設定](#環境変数の設定)
3. [GitHubリポジトリの準備](#githubリポジトリの準備)
4. [Vercelへのデプロイ](#vercelへのデプロイ)
5. [デプロイ後の設定](#デプロイ後の設定)
6. [トラブルシューティング](#トラブルシューティング)

---

## 事前準備

### 必要なアカウント
- [ ] GitHubアカウント
- [ ] Vercelアカウント（GitHubでサインイン可能）
- [ ] Thirdwebアカウント（API Key取得済み）

### ローカル環境の確認
```bash
# Node.jsバージョン確認（18以上推奨）
node --version

# pnpmインストール確認
pnpm --version

# プロジェクトのビルドテスト
pnpm run build
```

---

## 環境変数の設定

### 環境変数の設定

`.env.local`ファイルに以下を設定：

```env
# Thirdweb設定
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
THIRDWEB_SECRET_KEY=your_secret_key_here

# NFTコントラクト設定
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
NEXT_PUBLIC_CHAIN_ID=137

# トークン設定
NEXT_PUBLIC_AVAILABLE_TOKEN_IDS=2
NEXT_PUBLIC_DEFAULT_TOKEN_ID=2

# 支払い設定（project.config.jsで上書き可能）
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0x7B2d2732dcCC1830AA63241dC13649b7861d9b54
NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL=ZENY
NEXT_PUBLIC_MINT_PRICE=1

# アローリスト（オプション - CSVファイル推奨）
# NEXT_PUBLIC_ALLOWLIST_ADDRESSES=
```

### プロジェクト固有設定

NFT名称や機能フラグなどは`project.config.js`で設定します。
詳細は[PROJECT_CUSTOMIZATION_GUIDE.md](./PROJECT_CUSTOMIZATION_GUIDE.md)を参照してください。

---

## GitHubリポジトリの準備

### 1. 新規リポジトリ作成
```bash
# Gitリポジトリ初期化
git init

# .gitignoreの確認（.env.localが含まれていることを確認）
cat .gitignore | grep .env

# ファイルをステージング
git add .

# 初回コミット
git commit -m "ReZipang NFT ミントサイト初期構築"
```

### 2. GitHubにプッシュ
```bash
# リモートリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# mainブランチにプッシュ
git branch -M main
git push -u origin main
```

### 3. allowlist.csvの配置
```csv
address,maxMintAmount
0x3f64bD02365F47eeC24c82CE5829eeb9489E8665,2
0x72182aF98F83d3b97A727a95B8E7EA94b424107B,1
0x783d751d33Ab68C3DB7390EF306B5a863D627940,1
```

**重要**: allowlist.csvはGitHubにコミットしてOK（秘密情報ではないため）

---

## Vercelへのデプロイ

### ステップ1: Vercelにログイン
1. https://vercel.com にアクセス
2. 「Sign Up」または「Log In」
3. GitHubアカウントで認証

### ステップ2: プロジェクトインポート
1. Vercelダッシュボードで「New Project」
2. GitHubリポジトリ一覧から選択
3. 「Import」をクリック

### ステップ3: プロジェクト設定

#### Framework Preset
- **Framework**: Next.js（自動検出）
- **Node.js Version**: 18.x

#### Build & Output Settings
```
Build Command: pnpm run build
Output Directory: .next
Install Command: pnpm install
```

#### 環境変数の設定
Vercelの設定画面で以下を追加：

| Key | Value | 環境 |
|-----|-------|------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | `your_client_id` | Production, Preview, Development |
| `THIRDWEB_SECRET_KEY` | `your_secret_key` | Production |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E` | Production, Preview, Development |
| `NEXT_PUBLIC_CHAIN_ID` | `137` | Production, Preview, Development |
| `NEXT_PUBLIC_DEFAULT_TOKEN_ID` | `2` | Production, Preview, Development |
| `NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS` | `0x7B2d2732dcCC1830AA63241dC13649b7861d9b54` | Production, Preview, Development |
| `NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL` | `ZENY` | Production, Preview, Development |
| `NEXT_PUBLIC_MINT_PRICE` | `1` | Production, Preview, Development |

**セキュリティ注意事項**:
- `THIRDWEB_SECRET_KEY`は**Production環境のみ**に設定
- PreviewやDevelopmentには設定しない

### ステップ4: デプロイ実行
「Deploy」ボタンをクリックして自動デプロイ開始

---

## デプロイ後の設定

### 1. カスタムドメイン設定（オプション）
1. Vercel Dashboard → Settings → Domains
2. 「Add Domain」
3. DNSレコードの設定指示に従う

### 2. Thirdwebドメイン制限
1. https://thirdweb.com/team へアクセス
2. プロジェクトを選択
3. API Keys → Allowed Domains
4. 以下を追加：
   - `your-project.vercel.app`
   - `your-custom-domain.com`（カスタムドメインの場合）

### 3. アローリスト更新方法

#### 方法1: CSV更新（推奨）
1. ローカルで`allowlist.csv`を編集
2. GitHubにプッシュ
```bash
git add allowlist.csv
git commit -m "アローリスト更新"
git push
```
3. Vercelが自動的に再デプロイ

#### 方法2: 環境変数更新
1. Vercel Dashboard → Settings → Environment Variables
2. `NEXT_PUBLIC_ALLOWLIST_ADDRESSES`を更新
3. 「Save」→ 再デプロイ

---

## デプロイ確認チェックリスト

### 基本動作確認
- [ ] サイトにアクセスできる
- [ ] ウォレット接続が動作する
- [ ] NFT画像が表示される
- [ ] 価格が正しく表示される（project.config.jsの設定に応じて）
- [ ] 言語切り替えが動作する
- [ ] プロジェクト名が正しく表示される

### アローリスト確認
- [ ] 登録済みアドレスで「最大X枚までミント可能」が表示される
- [ ] 未登録アドレスで警告が表示される

### ミント機能確認（Sepoliaテストネット推奨）
- [ ] ZENYトークンのApproveが要求される
- [ ] ミントトランザクションが送信される
- [ ] 成功メッセージが表示される

---

## トラブルシューティング

### ❌ ビルドエラー: Module not found

```bash
# 依存関係を再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### ❌ 環境変数が読み込まれない

**確認事項**:
1. Vercel Dashboardで環境変数が設定されているか
2. `NEXT_PUBLIC_`プレフィックスがついているか（クライアント側変数）
3. 再デプロイが必要

```bash
# Vercel CLIで強制再デプロイ
vercel --prod
```

### ❌ ウォレット接続エラー

**Thirdweb設定確認**:
1. Client IDが正しいか
2. ドメイン制限にVercelのURLが追加されているか
3. ネットワーク（Polygon）が正しいか

### ❌ ZENY支払いが動作しない

**確認事項**:
1. ZENYトークンアドレスが正しいか
2. ユーザーのZENY残高が十分か
3. コントラクトがZENY受け取りに対応しているか

### ❌ アローリストが機能しない

**CSVファイル確認**:
```bash
# CSVフォーマット確認
head allowlist.csv
# 出力例:
# address,maxMintAmount
# 0x3f64bD02365F47eeC24c82CE5829eeb9489E8665,2
```

---

## 継続的デプロイ

### 自動デプロイの流れ
1. ローカルで変更
2. GitHubにプッシュ
3. Vercelが自動的にビルド&デプロイ

### プレビューデプロイ
- Pull Requestを作成すると自動的にプレビュー環境が作成される
- 本番デプロイ前のテストに便利

---

## セキュリティベストプラクティス

1. **環境変数の管理**
   - Secret Keyは本番環境のみ
   - ローカル`.env.local`はGitにコミットしない

2. **アローリスト管理**
   - CSVは公開情報として扱う
   - 秘密にしたい場合は環境変数使用

3. **ドメイン制限**
   - Thirdwebで本番ドメインのみ許可
   - 開発環境は別のClient ID使用推奨

---

## サポート

デプロイで問題が発生した場合：

1. Vercelのビルドログを確認
2. ブラウザのコンソールエラーを確認
3. GitHub Issuesで報告

---

最終更新: 2025年1月
対応バージョン: Next.js 14+, Thirdweb SDK v5