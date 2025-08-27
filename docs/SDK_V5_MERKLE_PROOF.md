# Thirdweb SDK v5 の Merkle Proof 処理

## 重要な発見

SDK v5 の `claimTo` 関数は、**Claim Conditions が設定されている場合、自動的に Merkle Proof を取得して処理します**。

## SDK v5 の動作

### 自動処理の流れ

1. **claimTo 呼び出し時**
   ```typescript
   const claimTransaction = claimTo({
     contract,
     to: account.address,
     tokenId: BigInt(tokenId),
     quantity: BigInt(quantity),
     from: account.address,
   });
   ```

2. **SDK 内部での処理**
   - Claim Conditions を自動取得
   - アローリストが設定されている場合、Merkle Root を確認
   - ユーザーアドレスに対する Merkle Proof を自動生成
   - トランザクションに Merkle Proof を含める

3. **開発者側で必要な作業**
   - **何もしない！SDK が全て自動処理**

## なぜローカル生成が機能しないのか

### 問題の本質
```
Thirdweb Dashboard の Merkle Root ≠ ローカル CSV から生成した Merkle Root
```

### 原因
1. **データソースの違い**
   - Thirdweb: Dashboard で設定したアドレスリスト
   - ローカル: allowlist.csv ファイル

2. **SDK v5 の仕様**
   - SDK は Thirdweb のバックエンドから Proof を取得
   - ローカルで生成した Proof は使われない

## 本番環境で機能している理由

1. **Claim Conditions が正しく設定されている**
   - Thirdweb Dashboard でアローリスト設定済み
   - Merkle Root が正しく登録されている

2. **SDK v5 が自動処理**
   - `claimTo` が Merkle Proof を自動取得
   - 開発者は Proof を意識する必要なし

## テスト環境での問題

1. **Claim Conditions の不一致**
   - Dashboard のアローリストと CSV が異なる
   - または Claim Conditions が未設定

2. **回避策の必要性**
   - Merkle Root がある場合は全員ミント可能にする
   - CSV ベースの検証は補助的に使用

## 正しい実装方法

### 方法1: Thirdweb Dashboard のみ使用（推奨）

```typescript
// SimpleMint.tsx
const claimTransaction = claimTo({
  contract,
  to: account.address,
  tokenId: BigInt(tokenId),
  quantity: BigInt(quantity),
  from: account.address,
});
// SDK が自動的に Merkle Proof を処理
```

**設定手順:**
1. Thirdweb Dashboard でアローリスト設定
2. SDK v5 の `claimTo` を使用
3. 自動的に動作

### 方法2: CSV のみ使用（Merkle なし）

1. Thirdweb Dashboard の Claim Conditions を削除
2. サーバーサイドで CSV 検証
3. Signature Minting を使用

## 結論

**SDK v5 では Merkle Proof は自動処理されます。**

- ✅ 本番環境: Dashboard と SDK が連携して正常動作
- ⚠️ テスト環境: Dashboard と CSV の不一致で問題発生
- 📝 解決策: Dashboard のアローリストを正しく設定するだけ

**開発者が Merkle Proof を手動で扱う必要はありません。**