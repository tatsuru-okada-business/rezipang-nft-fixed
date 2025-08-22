# 💰 NFT価格設定完全ガイド

## 目次
1. [価格設定の基本概念](#価格設定の基本概念)
2. [Thirdweb Dashboardでの価格設定](#thirdweb-dashboardでの価格設定)
3. [コントラクト直接設定](#コントラクト直接設定)
4. [価格確認方法](#価格確認方法)
5. [トラブルシューティング](#トラブルシューティング)

---

## 価格設定の基本概念

### NFTの価格設定方法は3種類

| 設定方法 | 推奨度 | 難易度 | 説明 |
|---------|--------|--------|------|
| **Claim Conditions** | ⭐⭐⭐⭐⭐ | 簡単 | Thirdweb Dashboardから設定 |
| **Contract Function** | ⭐⭐⭐ | 中級 | スマートコントラクトに直接設定 |
| **Custom Price Logic** | ⭐⭐ | 上級 | カスタムコントラクトで実装 |

---

## Thirdweb Dashboardでの価格設定

### ステップ1: コントラクトページへアクセス

1. **Thirdweb Dashboard**にログイン
   ```
   https://thirdweb.com/dashboard/contracts
   ```

2. **あなたのNFTコントラクト**を選択
   - ReZipang NFTの場合:
   ```
   https://thirdweb.com/polygon/0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
   ```

### ステップ2: Claim Conditionsの設定

#### A. NFT Dropコントラクトの場合

1. **「Claim Conditions」タブ**をクリック

2. **「Set Claim Conditions」**ボタンをクリック

3. **価格設定フィールド**:
   ```yaml
   Phase Name: "Public Sale"
   Start Time: 即座に開始 or 指定日時
   
   # 価格設定 ⬇️ ここが重要！
   Price per token: 0.05  # 価格を入力
   Currency: MATIC        # 通貨を選択（Polygon = MATIC）
   
   Max Claimable Supply: 1000  # 最大供給量
   Limit per Wallet: 5         # ウォレットあたりの上限
   ```

4. **「Update Claim Conditions」**をクリックして保存

#### B. ERC1155 Edition Dropの場合

1. **Token ID #4を選択**（ReZipangの場合）

2. **「Claim Conditions」**セクションで設定:
   ```yaml
   Token ID: 4
   Price: 0.05 MATIC
   Start: 2025-01-20 12:00 JST
   Supply: Unlimited or 固定数
   ```

### ステップ3: 複数フェーズの価格設定（上級）

```yaml
Phase 1 - Allowlist Sale:
  Price: 0.03 MATIC
  Start: 2025-01-20 12:00
  Allowlist: CSVアップロード
  
Phase 2 - Public Sale:
  Price: 0.05 MATIC
  Start: 2025-01-21 12:00
  Allowlist: なし（誰でも購入可）
```

---

## コントラクト直接設定

### Write Contractから価格を設定

1. **Thirdweb Explorer**でコントラクトを開く

2. **「Write」タブ**を選択

3. **価格設定関数を探す**:
   - `setPrice(uint256 _price)`
   - `setPricePerToken(uint256 _tokenId, uint256 _price)`
   - `updateClaimConditions(...)`

4. **価格を入力**（Wei単位）:
   ```javascript
   // 0.05 MATIC = 50000000000000000 Wei
   setPrice(50000000000000000)
   ```

---

## 価格確認方法

### 方法1: ミントサイトの価格チェッカー

サイトに実装済みの**PriceChecker**コンポーネントで確認：

1. ミントサイトにアクセス
2. 「🔍 Price Checker」セクション
3. 「Check All Prices」ボタンをクリック

期待される出力:
```
=== PRICE CHECK FOR TOKEN #4 ===

1. CLAIM CONDITIONS CHECK:
✅ claimCondition: Found
   → Price: 0.050000 MATIC

2. DIRECT PRICE FUNCTIONS:
✅ pricePerToken(tokenId): 50000000000000000 wei (0.050000 MATIC)
```

### 方法2: Thirdweb Dashboardで確認

1. コントラクトページの「Claim Conditions」タブ
2. 現在のPhaseの価格を確認

### 方法3: ミントシミュレーター

サイトの**MintSimulator**で事前確認：

1. ウォレット接続
2. 「🧪 Mint Simulator」セクション
3. 「ミントをシミュレート」ボタン

出力例:
```
2️⃣ PRICE CHECK:
✅ Price: 0.0500 MATIC

5️⃣ FINAL VERDICT:
✅ READY TO MINT!
Expected cost: 0.0500 MATIC + gas fees
```

---

## トラブルシューティング

### ❌ 価格が0または無料と表示される

**原因と解決方法:**

1. **Claim Conditionsが未設定**
   - 解決: Thirdweb Dashboardで価格を設定

2. **間違ったToken IDを参照**
   - 解決: `.env.local`で正しいToken IDを設定
   ```env
   NEXT_PUBLIC_DEFAULT_TOKEN_ID=4
   ```

3. **コントラクトが異なる関数名を使用**
   - 解決: ContractInspectorで関数を確認

### ❌ 価格設定しても反映されない

1. **キャッシュの問題**
   - ブラウザのキャッシュをクリア
   - `pnpm run dev`を再起動

2. **トランザクション未完了**
   - Polygonscanで確認:
   ```
   https://polygonscan.com/address/[コントラクトアドレス]
   ```

3. **権限不足**
   - コントラクトのOwnerまたはAdminロールが必要

### ❌ ミント時に「Insufficient funds」エラー

**確認事項:**
- ウォレットに十分なMATIC残高があるか
- ガス代を含めた合計金額: `価格 + 0.01 MATIC`

---

## 価格設定のベストプラクティス

### 推奨設定

```yaml
開発環境（Sepolia）:
  Price: 0.001 ETH
  理由: テスト用の小額

本番環境（Polygon）:
  Price: 0.01 - 0.1 MATIC
  理由: ガス代が安いため手頃な価格設定可能

高級NFT（Ethereum）:
  Price: 0.05 - 0.5 ETH
  理由: ブランド価値とガス代を考慮
```

### セキュリティ考慮事項

1. **価格変更の権限管理**
   - Ownerのみ変更可能に設定
   - Multi-sigウォレット推奨

2. **フェーズ別価格設定**
   - Early Bird: 低価格
   - Public Sale: 通常価格
   - Late Sale: プレミアム価格

---

## クイックリファレンス

### Wei変換表（Polygon MATIC）

| MATIC | Wei |
|-------|-----|
| 0.001 | 1000000000000000 |
| 0.01  | 10000000000000000 |
| 0.05  | 50000000000000000 |
| 0.1   | 100000000000000000 |
| 1     | 1000000000000000000 |

### JavaScript変換コード

```javascript
// MATIC to Wei
import { toWei } from "thirdweb";
const priceInWei = toWei("0.05"); // 0.05 MATIC

// Wei to MATIC
const priceInMatic = Number(priceInWei) / 10**18;
```

---

## サポート

価格設定で問題が発生した場合:

1. **PriceChecker**で現在の設定を確認
2. **MintSimulator**でテスト
3. **Thirdweb Discord**でサポート依頼: https://discord.gg/thirdweb

---

最終更新: 2025年1月