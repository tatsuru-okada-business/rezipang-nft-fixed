# アローリスト設定ガイド

## 推奨：Thirdweb Dashboard での設定方法

### ステップ1: コントラクトページへアクセス
1. https://thirdweb.com/dashboard/contracts へアクセス
2. あなたのNFTコントラクトを選択
3. 「Claim Conditions」タブをクリック

### ステップ2: Claim Conditionの作成

#### NFT Drop契約の場合：
```
1. "Set Claim Conditions" をクリック
2. Phase を追加：
   - Phase Name: "Allowlist Sale"
   - Start Time: 開始日時
   - Price: 0.05 MATIC（価格設定）
   - Currency: MATIC
   - Quantity: 無制限 or 数量制限
```

#### Allowlistの設定：
```
3. "Who can claim?" セクション：
   - "Specific Wallets" を選択
   - "Upload CSV" または "Add Wallets"
   
4. CSVフォーマット：
   address,maxClaimable
   0xAddress1,1
   0xAddress2,1
   0xAddress3,2
```

### ステップ3: Merkle Tree（推奨）

大規模なアローリスト（100アドレス以上）の場合：
1. Thirdwebが自動的にMerkle Treeを生成
2. ガス効率が良い
3. プライバシー保護（全アドレスを公開しない）

---

## 現在の実装（WebUI側）との統合

### オプション1: ハイブリッド方式（推奨）

```javascript
// 1. Thirdwebでベースのアローリストを設定
// 2. WebUIで追加の検証

async function canMint(address) {
  // Phase 1: WebUI検証（高速）
  const isInCSV = checkCSVAllowlist(address);
  
  // Phase 2: コントラクト検証（確実）
  const canClaim = await contract.canClaim(address);
  
  return isInCSV && canClaim;
}
```

### オプション2: Thirdwebのみ使用

```javascript
// SimpleMint.tsx を修正
import { useClaimConditions } from "thirdweb/react";

function SimpleMint() {
  const { data: claimConditions } = useClaimConditions({
    contract,
    tokenId: 4, // Token #4
  });
  
  // Thirdwebが自動的にアローリストを検証
  const canClaim = claimConditions?.canClaim;
}
```

---

## セキュリティ比較

| 方法 | セキュリティ | 更新の容易さ | ガス効率 |
|------|------------|-------------|----------|
| **Thirdweb Claim Conditions** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **WebUI CSV** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **ハイブリッド** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 実装の選択

### Thirdweb Claim Conditionsを使うべき場合：
- ✅ 高価値NFT
- ✅ 大規模プロジェクト
- ✅ セキュリティ重視
- ✅ ガス代削減重視

### WebUI CSVを使うべき場合：
- ✅ テスト環境
- ✅ 頻繁にリスト更新
- ✅ 小規模プロジェクト
- ✅ 開発スピード重視

---

## コード例：Thirdweb Claim Conditions の確認

```typescript
// 現在のClaim Conditionsを確認
const checkClaimConditions = async () => {
  const contract = getContract({
    client,
    chain,
    address: contractAddress,
  });
  
  // アクティブなClaim Conditionを取得
  const claimCondition = await contract.claimCondition();
  
  console.log({
    price: claimCondition.pricePerToken,
    currency: claimCondition.currency,
    startTime: claimCondition.startTimestamp,
    merkleRoot: claimCondition.merkleRoot, // アローリストのルート
  });
};
```

---

## 移行手順

現在のCSV方式からThirdweb Claim Conditionsへ：

1. **CSVエクスポート**
   ```bash
   cat allowlist.csv
   ```

2. **Thirdwebダッシュボード**
   - Claim Conditions → Set Conditions
   - CSVをアップロード

3. **コード修正**
   ```typescript
   // 削除: CSV検証ロジック
   // 追加: Thirdweb SDK のclaim検証
   ```

4. **テスト**
   - Sepoliaでテスト
   - 本番環境へ適用