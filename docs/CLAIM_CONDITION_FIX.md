# クレーム条件修正ガイド - 2025年8月

## 問題の概要
- **現在の設定**: USDC (0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) で無料ミント
- **期待する設定**: ZENY (0x7B2d2732dcCC1830AA63241dC13649b7861d9b54) で1トークン

## Thirdwebダッシュボードがグレーアウトしている場合の対処法

### 方法1: 直接コントラクトから変更（推奨）

```javascript
// scripts/update-claim-condition.js
const { ethers } = require("ethers");

// 設定
const CONTRACT_ADDRESS = "0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E";
const ZENY_ADDRESS = "0x7B2d2732dcCC1830AA63241dC13649b7861d9b54";
const TOKEN_ID = 2;

// ABI（必要な関数のみ）
const ABI = [
  "function setClaimConditions(uint256 tokenId, (uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)[] phases, bool resetClaimEligibility)"
];

async function updateClaimCondition() {
  // Polygonネットワークに接続
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  
  // ウォレット（管理者権限を持つアドレス）
  const privateKey = "YOUR_PRIVATE_KEY"; // 環境変数から取得推奨
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // コントラクトインスタンス
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  
  // 新しいクレーム条件
  const newClaimCondition = {
    startTimestamp: Math.floor(Date.now() / 1000), // 現在時刻
    maxClaimableSupply: ethers.constants.MaxUint256, // 無制限
    supplyClaimed: 0,
    quantityLimitPerWallet: 10, // ウォレットあたり最大10個
    merkleRoot: ethers.constants.HashZero, // アローリストなし（または既存のMerkle Root）
    pricePerToken: ethers.utils.parseEther("1"), // 1 ZENY
    currency: ZENY_ADDRESS, // ZENYトークンアドレス
    metadata: ""
  };
  
  try {
    const tx = await contract.setClaimConditions(
      TOKEN_ID,
      [newClaimCondition],
      false // resetClaimEligibility
    );
    
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("Claim condition updated successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

updateClaimCondition();
```

### 方法2: Thirdweb SDK v5を使用

```typescript
// scripts/update-with-sdk.ts
import { getContract } from "thirdweb";
import { polygon } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const contract = getContract({
  client,
  chain: polygon,
  address: "0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E",
});

// Admin SDKを使用してクレーム条件を更新
// ※ 管理者権限を持つウォレットで実行する必要があります
```

### 方法3: アプリケーション側で対応（暫定対処）

SimpleMint.tsxを以下のように修正：

```typescript
// components/SimpleMint.tsx の修正

// 現在のコントラクト設定（USDC無料）に合わせて動作させる
const executeMint = async () => {
  // ... 既存のコード ...
  
  // USDCでの無料ミントとして処理
  const transaction = claimTo({
    contract,
    to: account.address,
    tokenId: BigInt(tokenId),
    quantity: BigInt(quantity),
    from: account.address,
  });
  
  // 価格は0なので、支払い処理をスキップ
  sendTransaction(transaction, {
    onSuccess: () => {
      setMintSuccess(true);
      setMinting(false);
    },
    onError: (error) => {
      console.error("Mint failed:", error);
      setMintError(error.message);
      setMinting(false);
    },
  });
};
```

## 確認事項

1. **管理者権限の確認**
```bash
# Polygonscanで確認
https://polygonscan.com/address/0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E#readContract
# hasRole関数でDEFAULT_ADMIN_ROLEを確認
```

2. **現在のクレーム条件の確認**
```typescript
// コンソールで実行
const claimCondition = await contract.claimCondition(2);
console.log("Current currency:", claimCondition.currency);
console.log("Current price:", claimCondition.pricePerToken.toString());
```

## 推奨アクション

### 即座の対処（今すぐ動作させる）
1. アプリ側をUSDC無料ミントに対応させる（上記方法3）
2. ユーザーに無料ミントであることを伝える

### 根本的な解決
1. 管理者権限を持つウォレットでsetClaimConditionsを実行
2. またはThirdwebサポートに連絡して権限を確認

## 連絡先
- Thirdweb Support: https://support.thirdweb.com
- Discord: https://discord.gg/thirdweb

---
作成日: 2025年8月22日