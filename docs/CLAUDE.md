# NFT Mint Site - 技術仕様書

## プロジェクト概要
このプロジェクトは、Polygon ネットワーク上の ERC1155 NFT をミントするための Web アプリケーションです。

## 現在のアーキテクチャ（2025年8月29日時点）

### 使用している設定ファイル
1. **settings.json** - プロジェクト全体の設定とトークン個別の設定
   - `defaultTokenId`: デフォルトで表示するトークンID
   - `tokens`: 各トークンのカスタム設定（表示設定、販売期間、価格など）

2. **tokens-cache.json** - Thirdwebから取得したトークン情報のキャッシュ
   - トークンの基本情報（名前、説明、画像URL）
   - 価格情報（price, currency, currencySymbol）
   - 供給量とクレーム条件

3. **currency-config.json** - 通貨設定
   - USDC、ZENY、POLなどの通貨アドレスとデシマル情報

4. **project-settings.json** - サイト全体の設定
   - サイトタイトル、説明
   - UI設定（テーマ、背景、フォントなど）
   - 機能のオン/オフ設定

5. **allowlist.csv** - アローリスト管理
   - ウォレットアドレスごとの最大ミント数を管理

### 使用していない（削除済み）ファイル
- ~~admin-config.json~~ (削除済み - tokens-cache.jsonとsettings.jsonに移行)
- ~~local-settings.json~~ (削除済み - settings.jsonに統合)
- ~~default-token.json~~ (削除済み - settings.jsonに統合)

### 主要なライブラリとフレームワーク
- Next.js 15.4.7 (App Router)
- React 19.1.0
- Thirdweb SDK v5.105.35
- TypeScript 5.x
- Tailwind CSS 4.x

### API エンドポイント

#### トークン関連
- `GET /api/tokens` - トークン情報の取得（tokens-cache.json + settings.json）
- `GET /api/default-token` - デフォルトトークンの取得
- `POST /api/default-token` - デフォルトトークンの設定

#### 管理画面関連
- `GET /api/admin/tokens` - 管理画面用トークン一覧
- `GET /api/admin/sync-tokens` - Thirdwebとの同期
- `POST /api/admin/sync-tokens` - トークン設定の更新
- `GET /api/admin/project-settings` - プロジェクト設定の取得
- `POST /api/admin/project-settings` - プロジェクト設定の更新

#### アローリスト関連
- `GET /api/admin/view-allowlist` - アローリスト表示
- `POST /api/admin/upload-allowlist` - CSVアップロード
- `POST /api/verify-allowlist` - アローリスト確認

### コンポーネント構成

#### メインコンポーネント
- `SimpleMintV2` - メインのミントコンポーネント（SimpleMint.tsx、SimpleMintWrapper.tsxは削除済み）
- `WalletConnect` - ウォレット接続
- `NFTDetails` - NFT詳細表示
- `TokenGallery` - トークンギャラリー

#### 管理画面
- `app/admin/new-admin.tsx` - 新しい管理画面（page-client.tsxは削除済み）
- `components/admin/ProjectSettings.tsx` - プロジェクト設定管理

### データフロー
1. **トークン情報の取得**
   - `tokens-cache.json`から基本情報を読み込み
   - `settings.json`からカスタム設定を読み込み
   - 両者をマージして表示

2. **価格情報**
   - `tokens-cache.json`の`price`フィールドを使用
   - `currency-config.json`で通貨情報を解決

3. **アローリスト**
   - `allowlist.csv`でウォレットごとの制限を管理
   - CSVパーサーで読み込み、メモリにキャッシュ

### パフォーマンス最適化
1. **Dynamic Import** - Client Componentでの遅延読み込み
2. **コード分割** - Webpack設定で最適化
3. **キャッシュ** - API応答とトークン情報のキャッシュ

### 環境変数
- `NEXT_PUBLIC_CONTRACT_ADDRESS` - NFTコントラクトアドレス
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` - Thirdweb クライアントID
- `NEXT_PUBLIC_CHAIN_ID` - チェーンID（137 for Polygon）
- `NEXT_PUBLIC_ADMIN_ADDRESSES` - 管理者ウォレットアドレス（カンマ区切り）

### ビルドとデプロイ
```bash
# 開発環境
pnpm dev

# ビルド
pnpm build

# 本番環境起動
pnpm start
```

### 重要な注意事項
1. **型定義の一貫性** - `MergedTokenConfig`型を使用してデータを統一
2. **BigInt処理** - トークンIDと供給量はBigIntで処理
3. **エラーハンドリング** - Thirdweb APIのタイムアウトとエラー処理
4. **セキュリティ** - 管理者機能はウォレットアドレスで制限

### 今後の課題
- [ ] テストコードの追加
- [ ] エラーロギングの改善
- [ ] パフォーマンスモニタリング