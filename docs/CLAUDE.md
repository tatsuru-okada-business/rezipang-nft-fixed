# CLAUDE.md - システム管理方針と仕様書

最終更新: 2025-08-27

## 🔴 重要：汎用NFTミントサイトの管理方針

### 1. 汎用性の原則 (Universal Design Principle)

このシステムは**任意のNFTプロジェクトで使用可能**な汎用プラットフォームとして設計されています。

#### データ取得の優先順位
```
1. Thirdweb ClaimCondition（価格・通貨・販売条件）
    ↓
2. admin-config.json（Thirdweb同期データ）
    ↓
3. project-settings.json（管理パネル設定）
    ↓
4. local-settings.json（ローカル表示設定）
    ↓
5. project.config.js（デフォルト値のみ）
```

### 2. コード管理の鉄則

#### 🚫 絶対禁止事項
- ❌ プロジェクト固有名のハードコーディング（"ReZipang"等）
- ❌ 色・スタイルの直接埋め込み（Tailwindクラスで統一）
- ❌ トークンアドレス・価格のハードコーディング
- ❌ 環境固有設定のコード埋め込み
- ❌ 言語テキストのコード内記載

#### ✅ 必須実装事項
- ✅ 全設定を管理パネルから変更可能に
- ✅ ClaimConditionから動的に情報取得
- ✅ 環境変数による環境切り替え
- ✅ 多言語対応（localesファイル使用）
- ✅ テーマシステムの実装

## 📋 システムアーキテクチャ

### 環境切り替え方式

#### 1. 環境変数（.env.local）
```env
# テスト環境
NEXT_PUBLIC_CONTRACT_ADDRESS=0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1
NEXT_PUBLIC_CHAIN_ID=137

# 本番環境（コメントアウトで切り替え）
# NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
# NEXT_PUBLIC_CHAIN_ID=137
```

#### 2. 自動検出される情報
- **NFT名**: Thirdwebメタデータから取得
- **価格・通貨**: ClaimConditionから取得
- **販売期間**: local-settings.jsonで管理
- **画像**: IPFSから自動取得

### 設定ファイル体系

#### 1. admin-config.json（自動生成・編集禁止）
```json
{
  "contractAddress": "動的取得",
  "tokens": [
    {
      "thirdweb": {
        "tokenId": "ClaimConditionから",
        "name": "メタデータから",
        "price": "ClaimConditionから",
        "currency": "ClaimConditionから"
      },
      "local": "local-settings.jsonと同期"
    }
  ]
}
```

#### 2. project-settings.json（管理パネルで編集）
```json
{
  "projectName": "管理パネルから設定",
  "projectDescription": "管理パネルから設定",
  "features": {
    "showTokenGallery": true,
    "showPriceChecker": false
  },
  "ui": {
    "theme": {
      "primary": "purple",
      "secondary": "blue"
    }
  }
}
```

#### 3. local-settings.json（販売期間等）
```json
{
  "defaultTokenId": 0,
  "tokens": {
    "0": {
      "salesPeriodEnabled": true,
      "salesStartDate": "2025-01-01T00:00:00Z",
      "salesEndDate": "2025-12-31T23:59:59Z",
      "isUnlimited": false
    }
  }
}
```

#### 4. project.config.js（デフォルト値のみ）
```javascript
// ハードコーディング禁止 - デフォルト値のみ定義
{
  projectName: "NFT Minting Site", // 汎用的な名前
  projectDescription: "NFT Minting Platform",
  // 実際の値は管理パネルから設定
}
```

## 🎨 UIカスタマイズシステム

### テーマ管理（実装予定）
```css
/* CSS変数による動的テーマ */
:root {
  --color-primary: /* 管理パネルから設定 */;
  --color-secondary: /* 管理パネルから設定 */;
}
```

### カラーシステム
- Tailwind CSSのユーティリティクラスを使用
- 色の直接指定禁止（purple-600等は使用しない）
- CSS変数経由で動的に適用

## 🌍 多言語対応

### 実装方式
```typescript
// ❌ 悪い例
{locale === "ja" ? "価格" : "Price"}

// ✅ 良い例
{t.price} // locales/ja.json から取得
```

### ファイル構成
```
locales/
├── ja.json  # 日本語
└── en.json  # 英語
```

## 🔄 APIエンドポイント

| エンドポイント | 用途 | データソース |
|------------|------|------------|
| `/api/tokens` | トークン一覧 | admin-config.json |
| `/api/default-token` | デフォルトトークン | local-settings → admin-config |
| `/api/admin/sync-tokens` | Thirdweb同期 | Thirdweb API |
| `/api/admin/project-settings` | プロジェクト設定 | project-settings.json |
| `/api/verify-allowlist` | アローリスト | allowlist.csv |

## 🚀 デプロイメント

### 環境別設定

#### 開発環境
```bash
cp .env.example .env.local
# テスト用コントラクトアドレスを設定
npm run dev
```

#### 本番環境
```bash
# Vercel環境変数に本番コントラクトアドレスを設定
# 自動的にadmin-configが生成される
```

### 初回セットアップ
1. 環境変数設定（.env.local）
2. 管理パネルアクセス（/admin）
3. 「同期」ボタンでThirdwebと同期
4. プロジェクト設定を入力

## ⚠️ トラブルシューティング

### JSONファイルが存在しない場合
- admin-config.json → 管理パネルの「同期」で自動生成
- project-settings.json → 管理パネルの「設定を保存」で自動生成
- local-settings.json → API呼び出し時に自動生成

### defaultTokenIdエラー
```bash
node scripts/fix-token-integrity.js
```

### キャッシュクリア
```bash
rm -rf .next
rm -f default-token.json
npm run dev
```

## 📊 管理パネル機能

### 現在実装済み
- ✅ トークン同期（Thirdweb）
- ✅ 販売期間設定
- ✅ 最大発行数管理
- ✅ プロジェクト名・説明設定
- ✅ 機能フラグ管理

### 実装予定
- ✅ テーマカラー設定（実装済み）
- ✅ Favicon自動生成（実装済み）
- ⏳ ロゴアップロード
- ⏳ SEO設定
- ⏳ 多言語テキスト編集

## 🔒 セキュリティ

### アクセス制御
```typescript
// 管理者アドレス（環境変数で設定）
NEXT_PUBLIC_ADMIN_ADDRESSES=0x...,0x...
```

### データ検証
- ClaimConditionの整合性チェック
- Merkle Proof検証
- アローリスト確認

## 📝 コード規約

### インポート順序
1. React/Next.js
2. サードパーティライブラリ
3. 内部モジュール
4. 型定義

### 命名規則
- コンポーネント: PascalCase
- 関数: camelCase
- 定数: UPPER_SNAKE_CASE
- ファイル: kebab-case

### コメント
```typescript
// ❌ 悪い例
// ReZipangコントラクトに対応

// ✅ 良い例
// ERC1155コントラクトのclaim関数を実行
```

## 🎯 チェックリスト

### 新機能追加時
- [ ] ハードコーディングなし
- [ ] 管理パネルから設定可能
- [ ] 環境変数で切り替え可能
- [ ] 多言語対応
- [ ] エラーハンドリング実装

### デプロイ前
- [ ] 環境変数確認
- [ ] ビルドテスト実行
- [ ] 管理パネル動作確認
- [ ] ClaimCondition取得確認
- [ ] 販売期間動作確認

---

## 🎯 最大発行数管理

### 無制限販売の設定
```json
// local-settings.json
{
  "tokens": {
    "0": {
      "isUnlimited": true,  // 無制限販売を有効化
      "maxSupply": undefined // 最大発行数は設定しない
    }
  }
}
```

### 最大発行数の動作
- `isUnlimited: true` の場合、ミント制限なし
- `maxSupply` が設定されている場合、その数量まで販売
- `getMaxSupplyConfig` が null を返す場合は無制限を意味

## 🎨 Favicon管理

### 自動生成機能
- 管理パネルからプロジェクト名の頭文字を使用して自動生成
- テーマカラー（背景色・文字色）を反映
- 文字の縁取り設定も可能

### API エンドポイント
- `/api/favicon` - Faviconを配信
- `/api/admin/generate-favicon` - Favicon生成
- キャッシュバスティング: `?t=timestamp` パラメータで無効化

**最終更新**: 2025-08-28
**バージョン**: 4.1.0
**管理者**: Claude AI Assistant