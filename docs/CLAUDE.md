# CLAUDE.md - システム管理方針と仕様書

最終更新: 2025-08-27

## 🔴 重要：管理方針

### 1. 単一情報源の原則 (Single Source of Truth)

#### トークン情報の管理階層
```
admin-config.json (マスターデータ)
    ↓ 同期
local-settings.json (ローカル設定)
    ↓ キャッシュ
default-token.json (キャッシュ)
```

- **admin-config.json**: Thirdwebから同期されたマスターデータ
- **local-settings.json**: ローカル表示設定（販売期間、表示順など）
- **ハードコーディング禁止**: トークン名、価格等は全て動的取得

### 2. コード管理の原則

#### 絶対にやってはいけないこと
- ❌ トークン情報のハードコーディング
- ❌ 新規ドキュメントの無断作成
- ❌ テスト未実施のコミット
- ❌ 重複する設定ファイルの作成
- ❌ 既存ファイルを無視した新規ファイル作成

#### 必ずやること
- ✅ 既存ファイルの編集を優先
- ✅ admin-configを情報源として使用
- ✅ コードとドキュメントの整合性維持
- ✅ 変更前後のテスト実行
- ✅ エラーハンドリング実装

## 📋 現在のシステム仕様

### 環境設定

#### テスト環境（現在）
```javascript
{
  tokenId: 0,
  name: "MINT-TEST-NFT",
  description: "ミントテスト用のNFT",
  price: "1 ZENY",
  contract: "0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1"
}
```

#### 本番環境
```javascript
{
  tokenIds: [0, 1, 2, 3, 4],
  contract: "0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E"
}
```

### 設定ファイル構造

#### admin-config.json (マスターデータ)
```json
{
  "contractAddress": "0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1",
  "lastSync": "2025-08-27T08:36:15.060Z",
  "tokens": [
    {
      "thirdweb": {
        "tokenId": 0,
        "name": "MINT-TEST-NFT",
        "totalSupply": "0",
        "price": "1",
        "currency": "ZENY",
        "claimConditionActive": true
      },
      "local": {
        "displayEnabled": true,
        "salesPeriodEnabled": false,
        "isUnlimited": true
      }
    }
  ]
}
```

#### local-settings.json (ローカル設定)
```json
{
  "defaultTokenId": 0,
  "tokens": {
    "0": {
      "displayEnabled": true,
      "salesPeriodEnabled": false,
      "isUnlimited": true,
      "totalMinted": 0
    }
  },
  "lastUpdated": "2025-08-27T08:36:15.061Z"
}
```

### APIエンドポイント

| エンドポイント | 用途 | データソース |
|------------|------|------------|
| `/api/tokens` | 全トークン情報取得 | admin-config.json |
| `/api/default-token` | デフォルトトークン取得 | local-settings → admin-config |
| `/api/admin/sync-tokens` | Thirdweb同期 | Thirdweb API → admin-config |
| `/api/verify-allowlist` | アローリスト確認 | allowlist.csv |
| `/api/settings-version` | キャッシュ管理 | local-settings.json |
| `/api/user-claim-info` | ユーザー情報 | Thirdweb API |

### 販売期間管理ロジック

```typescript
// 販売期間の4つの状態
type SaleStatus = 'unlimited' | 'active' | 'before' | 'after';

// チェックフロー
if (isUnlimited) return 'unlimited';  // 無期限販売
if (!salesPeriodEnabled) return 'active';  // 販売期間無効
if (!start && !end) return ERROR;  // 設定エラー
// 日付チェック...
```

### UIコンポーネント構成

#### 使用中のコンポーネント
- `SimpleMint.tsx` - メインミント機能
- `TokenGallery.tsx` - トークン一覧
- `NFTImage.tsx` - 画像表示
- `SalesPeriodDisplay.tsx` - 販売期間表示
- `UserClaimInfo.tsx` - ユーザー情報
- `ApprovalManager.tsx` - トークン承認
- `SettingsUpdateNotification.tsx` - 設定更新通知

#### 削除対象（未使用）
- ~~TokenSelector.tsx~~
- ~~MintButtonDebug.tsx~~
- ~~NFTImageSafe.tsx~~
- ~~ContractInspector.tsx~~
- ~~DebugInfo.tsx~~
- ~~AllowlistStatus.tsx~~

## 📂 ドキュメント管理

### 必要なドキュメント（保持）
```
docs/
├── CLAUDE.md (本ファイル) - 管理方針
├── INDEX.md - ドキュメント一覧
├── ADMIN_GUIDE.md - 管理者ガイド
├── TECHNICAL_SPEC.md - 技術仕様
└── README.md - プロジェクト概要
```

### 削除対象ドキュメント
```
ルートディレクトリ（削除）：
- FEATURE_VERIFICATION.md
- INTEGRATION_CHECK.md
- PERFORMANCE_OPTIMIZATION.md
- TRANSACTION_ANALYSIS.md
- IMPLEMENTATION_RECOMMENDATION.md
- README_ADMIN.md
- SYSTEM_INTEGRITY_ISSUES.md
```

## 🔧 トラブルシューティング

### defaultTokenIdエラーの修正
```bash
# 整合性修正スクリプト
node scripts/fix-token-integrity.js
```

### キャッシュクリア
```bash
rm -rf .next
npm run dev
```

### Thirdweb再同期
```bash
curl http://localhost:3000/api/admin/sync-tokens
```

## 🚀 開発フロー

### 1. 変更前チェック
```bash
git status
npm run build
npm run lint
```

### 2. 実装ルール
- 既存ファイル編集を優先
- admin-configからデータ取得
- ハードコーディング禁止
- エラーハンドリング必須

### 3. テスト実行
```bash
npm run build
npm run typecheck
npm run dev  # localhost:3000で動作確認
```

### 4. コミット
```bash
git add .
git commit -m "fix: 具体的な変更内容"
```

## ⚠️ 重要な注意事項

### データフロー
1. **Thirdweb** → **admin-config.json** (マスターデータ)
2. **admin-config.json** → **local-settings.json** (ローカル設定)
3. **local-settings.json** → **UIコンポーネント** (表示)

### 設定変更時の手順
1. Thirdwebダッシュボードで変更
2. `/api/admin/sync-tokens` で同期
3. local-settings.jsonが自動更新
4. UIに即時反映

### トークン情報の取得方法
```typescript
// 正しい方法
import { getMergedTokenConfigs } from '@/lib/localSettings';
const tokens = getMergedTokenConfigs();

// 間違った方法
const tokens = require('./tokens.json'); // ❌ ハードコーディング
```

## 📝 最近の問題と解決

### 問題1: defaultTokenId=2が存在しない
- **原因**: ハードコーディングされた設定
- **解決**: admin-configから動的取得に変更

### 問題2: 「純金のパスポートNFT」が表示される
- **原因**: project.config.jsとtokens.jsonにハードコーディング
- **解決**: ファイル削除とadmin-config使用

### 問題3: 販売期間が機能しない
- **原因**: saleStatus状態変数の未定義
- **解決**: 適切な状態管理実装

## 🔑 環境変数

```env
# 必須
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=xxx
NEXT_PUBLIC_CONTRACT_ADDRESS=0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1
NEXT_PUBLIC_CHAIN_ID=137

# オプション（admin-configから自動取得）
# NEXT_PUBLIC_DEFAULT_TOKEN_ID=0
# NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=0x7B2d...
```

## 📊 システムアーキテクチャ

```
ユーザー
  ↓
Next.js App Router
  ↓
APIエンドポイント
  ↓
設定管理層
  ├── admin-config.json (マスター)
  └── local-settings.json (キャッシュ)
  ↓
Thirdweb SDK
  ↓
Polygon Network
```

---

**最終更新**: 2025-08-27
**バージョン**: 3.0.0
**管理者**: Claude AI Assistant