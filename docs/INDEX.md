# 📚 ReZipang NFT ミントサイト - ドキュメント一覧

最終更新: 2025年8月25日

## 🏗️ システム概要

- **[CLAUDE.md](./CLAUDE.md)** - プロジェクト全体の技術仕様とアーキテクチャ
- **[TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)** - 詳細な技術仕様書

## 🚀 セットアップ・デプロイ

- **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)** - 完全セットアップガイド
- **[VERCEL_DEPLOY_GUIDE.md](./VERCEL_DEPLOY_GUIDE.md)** - Vercelデプロイ手順
- **[PROJECT_CUSTOMIZATION_GUIDE.md](./PROJECT_CUSTOMIZATION_GUIDE.md)** - プロジェクトカスタマイズ方法

## 👨‍💼 管理機能

- **[ADMIN_GUIDE.md](./ADMIN_GUIDE.md)** - 管理パネル使用ガイド
- **[README_ADMIN.md](../README_ADMIN.md)** - 管理者向けクイックガイド

## 💰 価格・販売設定

- **[PRICE_SETUP.md](./PRICE_SETUP.md)** - 価格設定ガイド
- **[MULTIPLE_NFTS.md](./MULTIPLE_NFTS.md)** - 複数NFT管理

## 🎁 新機能

- **[REFERRAL_SYSTEM.md](./REFERRAL_SYSTEM.md)** ⭐ - リファラルシステム実装仕様

## 🛡️ セキュリティ・トラブルシューティング

- **[SECURITY_REPORT_2025.md](./SECURITY_REPORT_2025.md)** - セキュリティレポート
- **[CUSTOMER_ERROR_GUIDE.md](./CUSTOMER_ERROR_GUIDE.md)** - 顧客向けエラー対処法
- **[METAMASK_WARNING_FIX.md](./METAMASK_WARNING_FIX.md)** - MetaMask警告の対処
- **[CLAIM_CONDITION_FIX.md](./CLAIM_CONDITION_FIX.md)** - クレーム条件エラー対処

## 🧪 テスト

- **[TEST_CHECKLIST.md](./TEST_CHECKLIST.md)** - テストチェックリスト

## 📋 設定ファイル

### 現在使用中
- `admin-config.json` - Thirdweb同期データ（自動更新）
- `local-settings.json` - ローカル設定（販売期間等）
- `project.config.js` - プロジェクト基本設定
- `tokens.json` - トークン情報（バックアップ用）

### 削除候補
- ~~`allowlist.csv`~~ - アローリスト機能未使用のため削除可能
- ~~`sale-config.json`~~ - local-settings.jsonに統合済み

## 🗂️ ディレクトリ構造

```
Rezipang-NFTs-MINT/
├── app/                    # Next.js App Router
│   ├── [locale]/          # 多言語対応ページ
│   ├── admin/             # 管理パネル
│   └── api/               # APIエンドポイント
├── components/            # Reactコンポーネント
├── lib/                   # ユーティリティ・ヘルパー
├── docs/                  # ドキュメント
├── scripts/               # 実行スクリプト
└── locales/              # 翻訳ファイル
```

## 🔧 主要コンポーネント

### フロントエンド
- `SimpleMint.tsx` - メインミントコンポーネント（最適化済み）
- `TokenGallery.tsx` - NFTギャラリー表示
- `SalesPeriodDisplay.tsx` - 販売期間表示

### 管理機能
- `app/admin/new-admin.tsx` - 新管理パネル
- `app/api/admin/sync-tokens` - Thirdweb同期API

### 最適化
- 優先度付きトークンローディング
- 画像プリロード
- APIキャッシング

## 📝 更新履歴

### 2025年8月25日
- リファラルシステム仕様書追加
- ドキュメント整理・統合
- パフォーマンス最適化実装
- 販売期間管理機能追加

### 2025年8月24日
- USDC/ZENY価格表示修正
- POL（旧MATIC）対応
- 管理パネルリニューアル

## 🚨 重要な注意事項

1. **環境変数**は`.env.local`で管理（Git管理外）
2. **秘密鍵**は絶対にコミットしない
3. **admin-config.json**は自動更新されるため手動編集禁止
4. **local-settings.json**で販売期間等を管理

## 📞 サポート

問題が発生した場合は、以下のドキュメントを参照してください：

1. [顧客向けエラーガイド](./CUSTOMER_ERROR_GUIDE.md)
2. [技術仕様書](./TECHNICAL_SPEC.md)
3. [セキュリティレポート](./SECURITY_REPORT_2025.md)

---

© 2025 ReZipang NFT Project