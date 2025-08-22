# 🎨 複数のNFTコレクションに対応する方法

## 基本概念

**1つのThirdweb Client ID** = **無制限のNFTコントラクトに対応可能**

Client IDは「あなたのアプリケーション」を識別するもので、どのNFTコントラクトでも使用できます。

## 実装パターン

### パターン1: 環境変数で切り替え（最も簡単）

#### 設定例
```env
# 共通設定（変更不要）
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=あなたのClient_ID

# NFTコレクションごとに変更
NEXT_PUBLIC_CONTRACT_ADDRESS=0xコントラクトアドレス
NEXT_PUBLIC_CHAIN_ID=チェーンID
```

#### 運用方法
1. NFT Aをミントする場合
   - `.env.local`でNFT Aのアドレスを設定
   - デプロイ

2. NFT Bをミントする場合
   - `.env.local`でNFT Bのアドレスに変更
   - 再デプロイ

### パターン2: 複数サイトとして運用

#### Vercelでの設定
```
プロジェクト1: nft-genesis.vercel.app
├─ CONTRACT_ADDRESS = 0xGenesis...
├─ CHAIN_ID = 137
└─ CLIENT_ID = 同じClient_ID

プロジェクト2: nft-premium.vercel.app
├─ CONTRACT_ADDRESS = 0xPremium...
├─ CHAIN_ID = 1
└─ CLIENT_ID = 同じClient_ID
```

### パターン3: 動的切り替え（コード修正必要）

#### URLパラメータで切り替え
```typescript
// 例: /mint?collection=genesis
// 例: /mint?collection=premium

const collections = {
  genesis: {
    address: "0xGenesis...",
    chainId: 137,
    name: "Genesis Collection"
  },
  premium: {
    address: "0xPremium...",
    chainId: 1,
    name: "Premium Collection"
  }
};
```

---

## 📝 複数NFT対応の設定ファイル例

### collections.json（新規作成）
```json
{
  "collections": [
    {
      "id": "genesis",
      "name": "Genesis NFT Collection",
      "contractAddress": "0x1234567890123456789012345678901234567890",
      "chainId": 137,
      "allowlistPath": "allowlist-genesis.csv"
    },
    {
      "id": "premium",
      "name": "Premium NFT Collection",
      "contractAddress": "0x0987654321098765432109876543210987654321",
      "chainId": 1,
      "allowlistPath": "allowlist-premium.csv"
    }
  ]
}
```

### 各コレクション用のアローリスト
```
allowlist-genesis.csv
allowlist-premium.csv
allowlist-special.csv
```

---

## 🚀 実装の簡単さ比較

| 方法 | 難易度 | メリット | デメリット |
|------|--------|----------|------------|
| **環境変数切り替え** | ⭐ 簡単 | コード変更不要 | 同時運用できない |
| **複数サイト** | ⭐⭐ 普通 | 独立して運用 | 管理が複雑 |
| **動的切り替え** | ⭐⭐⭐ 難しい | 1サイトで全対応 | コード修正必要 |

---

## 推奨アプローチ

### 少数のNFT（2-3個）の場合
→ **複数サイトとして運用**
- 各NFTに専用URL
- 管理が明確
- デザインもカスタマイズ可能

### 多数のNFT（4個以上）の場合
→ **動的切り替えを実装**
- 1つのサイトで管理
- URLパラメータで切り替え
- 効率的な運用

### とりあえず試したい場合
→ **環境変数切り替え**
- 今すぐ使える
- コード変更不要
- 後で他の方法に移行可能

---

## ✅ まとめ

**Q: 複数のNFTに対応できる？**
A: **はい！**同じClient IDで無制限に対応可能

**Q: どうやって切り替える？**
A: 
1. 環境変数を変更（簡単）
2. 複数サイトを作る（推奨）
3. コードで動的に切り替え（上級）

**Q: 追加料金は？**
A: **なし！**1つのClient IDで全て対応

---

## 次のステップ

1. まず1つ目のNFTで動作確認
2. 2つ目のNFTは環境変数を変えてテスト
3. 本格運用時に最適な方法を選択

すべて同じThirdweb Client IDで動作します！