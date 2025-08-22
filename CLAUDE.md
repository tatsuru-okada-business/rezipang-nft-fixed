# CLAUDE.md - ReZipang NFT ミントサイト

## プロジェクト概要

このプロジェクトは、Polygon上のERC1155 NFTの汎用ミントサイトです。Thirdweb SDK v5を使用し、カスタマイズ可能な設定で異なるNFTプロジェクトに対応できます。

## 技術スタック

- **フレームワーク**: Next.js 14+ (App Router)
- **ブロックチェーン統合**: Thirdweb SDK v5
- **スタイリング**: Tailwind CSS
- **パッケージマネージャー**: pnpm
- **デプロイ**: Vercel
- **言語**: TypeScript
- **多言語対応**: 日本語/英語
- **ブロックチェーン**: Polygon (Chain ID: 137)

## 主要機能

### 1. NFTミント機能
- ERC1155/ERC721トークンのミント
- スマートコントラクトからの自動トークン検出
- NFTメタデータの自動取得（IPFS対応）

### 2. 柔軟な支払いオプション
- カスタムERC20トークン（ZENY等）での支払い
- ネイティブトークン（MATIC/ETH）での支払い
- 無料ミント対応

### 3. アローリスト機能
- CSVファイルベースの管理
- ウォレットアドレスごとの最大MINT数制限
- リアルタイムのアローリスト確認

### 4. 多言語対応
- 日本語/英語の切り替え
- すべてのUIコンポーネントで対応

### 5. カスタマイズ機能
- project.config.jsでの簡単な設定変更
- トークン情報の自動取得またはファイル読み込み
- 機能フラグによる表示制御

## プロジェクト構造

```
Rezipang-NFTs-MINT/
├── app/
│   ├── [locale]/          # 多言語対応ルーティング
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   └── verify-allowlist/  # アローリスト確認API
│   └── providers.tsx      # Thirdwebプロバイダー
├── components/
│   ├── SimpleMint.tsx     # メインミントコンポーネント
│   ├── NFTImage.tsx       # NFT画像表示
│   ├── TokenGallery.tsx   # トークン一覧
│   ├── MintSimulator.tsx  # ミントシミュレーター
│   ├── PriceChecker.tsx   # 価格チェッカー
│   ├── WalletConnect.tsx  # ウォレット接続
│   └── LanguageSwitcher.tsx # 言語切り替え
├── lib/
│   ├── thirdweb.ts        # Thirdweb設定
│   ├── allowlist.ts       # アローリスト処理
│   ├── projectConfig.ts   # プロジェクト設定ヘルパー
│   ├── tokenMetadata.ts   # トークンメタデータ自動取得
│   └── tokenConfig.ts     # トークン設定ファイル処理
├── locales/               # 翻訳ファイル
│   ├── en.json
│   └── ja.json
├── docs/                  # ドキュメント
│   ├── PROJECT_CUSTOMIZATION_GUIDE.md
│   ├── VERCEL_DEPLOY_GUIDE.md
│   ├── PRICE_SETUP.md
│   └── ...
├── project.config.js      # プロジェクト設定ファイル
├── tokens.json            # トークン情報（オプション）
├── allowlist.csv          # アローリストデータ
└── .env.local.example     # 環境変数テンプレート
```

## 環境変数

```env
# Thirdweb
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=xxx
THIRDWEB_SECRET_KEY=xxx

# NFTコントラクト
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
NEXT_PUBLIC_CHAIN_ID=137

# トークン設定
NEXT_PUBLIC_DEFAULT_TOKEN_ID=2
NEXT_PUBLIC_AVAILABLE_TOKEN_IDS=2

# ZENY支払い
NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0x7B2d2732dcCC1830AA63241dC13649b7861d9b54
NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL=ZENY
NEXT_PUBLIC_MINT_PRICE=1
```

## アーキテクチャ決定

### 1. Thirdweb SDK v5採用理由
- 最新版で高速・軽量（10倍高速、30倍軽量）
- ERC20トークン支払いのネイティブサポート
- 優れたTypeScript型定義

### 2. App Router採用理由
- Next.js 14+の推奨アーキテクチャ
- サーバーコンポーネントによる高速化
- 多言語対応の簡単な実装

### 3. pnpm採用理由
- npmより高速なインストール
- ディスク容量の効率的な使用
- 厳密な依存関係管理

### 4. CSVベースのアローリスト
- シンプルで管理しやすい
- GitHubでのバージョン管理が容易
- 最大MINT数の個別設定に対応

### 5. トークン情報の自動取得
- Thirdwebから直接メタデータ取得
- 自動トークン検出
- ファイルベースのフォールバック

## コンポーネント仕様

### SimpleMint.tsx
**責務**: NFTミントのメインロジック
- アローリスト確認
- ZENY支払い処理
- ミント実行
- エラーハンドリング

**状態管理**:
- `quantity`: ミント数量
- `maxMintAmount`: 最大ミント可能数
- `isAllowlisted`: アローリスト登録状態
- `minting`: ミント処理中フラグ

### NFTImage.tsx
**責務**: NFTメタデータと画像の表示
- IPFSからの画像取得
- フォールバック表示
- ローディング状態

### TokenGallery.tsx
**責務**: 利用可能なトークンの一覧表示
- API経由でのトークン情報取得
- 自動検出/ファイル/コントラクトからの取得
- 選択UI

## API仕様

### POST /api/verify-allowlist
**リクエスト**:
```json
{
  "address": "0x..."
}
```

**レスポンス**:
```json
{
  "address": "0x...",
  "isAllowlisted": true,
  "maxMintAmount": 2
}
```

## セキュリティ考慮事項（2025年更新）

1. **環境変数管理**
   - `THIRDWEB_SECRET_KEY`は本番環境のみ
   - クライアント側には`NEXT_PUBLIC_`プレフィックスのみ
   - 秘密情報はVercelのEnvironment Variablesで管理

2. **アローリスト**
   - CSVファイルは公開情報として扱う
   - アドレスの正規化（小文字変換）
   - サーバーサイドでの検証

3. **トークン支払い**
   - Approve前の残高確認
   - トランザクション失敗時のエラーハンドリング
   - リエントランシー防止

4. **コントラクト通信**
   - 読み取り専用関数の使用
   - エラーハンドリングとフォールバック
   - キャッシュ戦略の実装

## デプロイメント

### Vercel設定
- Node.js: 18.x
- Build Command: `pnpm run build`
- Install Command: `pnpm install`

### 環境変数設定
Vercel Dashboardで以下を設定：
- すべての`NEXT_PUBLIC_`変数
- `THIRDWEB_SECRET_KEY`（Production環境のみ）

## トラブルシューティング

### よくある問題

1. **parseEther is not a function**
   - 解決: `toWei`を使用

2. **価格が0と表示される**
   - 確認: 環境変数`NEXT_PUBLIC_MINT_PRICE`
   - 確認: Thirdweb Dashboard設定

3. **ZENY支払いが失敗する**
   - 確認: ZENY残高
   - 確認: トークンアドレス

4. **アローリストが機能しない**
   - 確認: CSVフォーマット
   - 確認: アドレスの大文字小文字

## パフォーマンス最適化

1. **画像最適化**
   - Next.js Imageコンポーネント使用
   - IPFS画像のキャッシュ

2. **コード分割**
   - 動的インポート
   - クライアントコンポーネントの最小化

3. **キャッシュ戦略**
   - アローリストのメモリキャッシュ
   - 価格情報のキャッシュ

## 開発ワークフロー

### 新機能追加時
1. ローカルブランチ作成
2. 機能実装とテスト
3. allowlist.csvの更新（必要時）
4. Pull Request作成
5. Vercelプレビューで確認
6. マージ後自動デプロイ

### アローリスト更新
1. `allowlist.csv`編集
2. GitHubにプッシュ
3. Vercelが自動再デプロイ

## テスト戦略

### 手動テスト項目
- [ ] ウォレット接続
- [ ] アローリスト確認
- [ ] 最大MINT数制限
- [ ] ZENY Approve
- [ ] ミント実行
- [ ] 言語切り替え
- [ ] レスポンシブ表示

### テストネット
Sepolia testnetでの事前テスト推奨

## 今後の拡張可能性

1. **追加トークン対応**
   - 複数のERC20トークン支払い
   - ダイナミックプライシング

2. **高度なアローリスト**
   - Merkle Tree実装
   - 時間制限付きアローリスト

3. **分析機能**
   - ミント統計
   - ユーザー行動追跡

## メンテナンス

### 定期的な更新
- Thirdweb SDKのアップデート
- Next.jsのアップデート
- 依存関係の脆弱性チェック

### モニタリング
- Vercelのエラーログ
- ブロックチェーンイベント
- ユーザーフィードバック

## リソース

- [Thirdweb Documentation](https://portal.thirdweb.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Polygon Documentation](https://wiki.polygon.technology/)
- [プロジェクトGitHub](https://github.com/your-repo)

---

最終更新: 2025年8月
バージョン: 2.0.0
作成者: Claude AI Assistant