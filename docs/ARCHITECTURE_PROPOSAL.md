# アーキテクチャ改善提案

## 概要
クレーム条件のAllowlistを活用し、サーバー側で販売管理を行う方式への移行

## 現状の課題
1. Thirdwebとローカル設定の二重管理による複雑性
2. execution revertedエラーの原因特定が困難
3. テスト環境と本番環境で異なる処理ロジック

## 提案アーキテクチャ

### 1. 責任分担の明確化

#### Thirdweb (コントラクト側)
- 価格設定
- 通貨設定
- ウォレットあたりの最大購入数
- 総供給量
- クレーム条件（常に有効）

#### サーバー側 (Next.js API)
- Allowlistの管理
- Merkle Proof生成
- 無制限販売対象者の管理
- 販売期間の制御

### 2. データフロー

```
User → Frontend → Server API → Merkle Proof生成
                              ↓
                     Thirdweb Contract ← claim with proof
```

### 3. 実装ステップ

#### Phase 1: サーバー側Allowlist管理
```typescript
// /app/api/allowlist/route.ts
export async function POST(req: Request) {
  const { address, tokenId } = await req.json();
  
  // DBまたはファイルからAllowlist取得
  const allowlist = await getTokenAllowlist(tokenId);
  
  // ユーザーの購入条件を判定
  const userStatus = {
    isUnlimited: allowlist.unlimited.includes(address),
    isWhitelisted: allowlist.whitelist.includes(address),
    isPublicSale: allowlist.publicSale
  };
  
  // Merkle Proof生成
  const proof = generateMerkleProof(address, allowlist);
  
  return {
    proof,
    maxMintAmount: userStatus.isUnlimited ? 9999 : 10,
    canMint: userStatus.isUnlimited || userStatus.isWhitelisted || userStatus.isPublicSale
  };
}
```

#### Phase 2: SimpleMintの簡素化
```typescript
const executeMint = async () => {
  // 1. サーバーからAllowlist情報取得
  const { proof, maxMintAmount, canMint } = await fetch('/api/allowlist', {
    method: 'POST',
    body: JSON.stringify({ address: account.address, tokenId })
  }).then(r => r.json());
  
  if (!canMint) {
    setMintError('Not eligible to mint');
    return;
  }
  
  // 2. Thirdwebのclaim関数を直接使用
  const transaction = claimTo({
    contract,
    to: account.address,
    tokenId: BigInt(tokenId),
    quantity: BigInt(quantity),
    proofs: proof // サーバーから取得したproof
  });
  
  // 3. トランザクション実行
  await sendTransaction(transaction);
};
```

#### Phase 3: 管理画面の改善
```typescript
// 管理画面でAllowlistをアップロード
const updateAllowlist = async (tokenId: number, addresses: string[], type: 'unlimited' | 'whitelist') => {
  await fetch('/api/admin/allowlist', {
    method: 'POST',
    body: JSON.stringify({ tokenId, addresses, type })
  });
};
```

### 4. メリット

1. **エラーハンドリングの改善**
   - Thirdwebのエラーメッセージがそのまま活用可能
   - execution revertedの原因が明確に

2. **柔軟な販売管理**
   - サーバー側で即座にAllowlist更新可能
   - 無制限販売と通常販売の切り替えが容易

3. **セキュリティ向上**
   - Merkle Proofの生成がサーバー側
   - Allowlistの内容が公開されない

4. **テスト環境の簡素化**
   - 本番と同じロジックを使用
   - 環境別の分岐が不要

### 5. 移行計画

1. **Phase 1** (1週間)
   - Allowlist管理APIの実装
   - Merkle Proof生成機能の実装

2. **Phase 2** (1週間)
   - SimpleMintコンポーネントの簡素化
   - エラーハンドリングの改善

3. **Phase 3** (3日)
   - 管理画面のAllowlist管理機能
   - CSVアップロード機能

### 6. 注意点

- Thirdweb側のクレーム条件は常に設定しておく必要がある
- Merkle Rootの更新時はガス代が発生
- 大量のアドレスを扱う場合はDBが必要

## まとめ

この方式により、以下が実現できます：
- エラーの削減
- 管理の簡素化
- 柔軟な販売制御
- より良いユーザー体験

実装時期は、現在の問題が安定してから段階的に移行することを推奨します。