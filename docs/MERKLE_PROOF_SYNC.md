# Merkle Proof 同期ガイド

## 問題の本質

Thirdweb Dashboard で設定した Merkle Root と、ローカルで生成する Merkle Root が一致しない問題の解決方法です。

## 解決方法

### 方法1: Thirdweb Dashboard のデータと完全同期する

1. **Thirdweb Dashboard からアドレスリストをエクスポート**
   ```
   1. Thirdweb Dashboard にログイン
   2. Contract > NFTs > Token ID を選択
   3. Claim Conditions > Allowlist を開く
   4. アドレスリストをコピー
   5. allowlist.csv に貼り付け
   ```

2. **アドレスの順序とフォーマットを統一**
   ```csv
   address,maxMintAmount
   0xB773EaE99ae304Cd8f2C2cae6fEF11168e1ABA0d,10
   0x1234567890123456789012345678901234567890,5
   ```
   
   注意点：
   - アドレスは Thirdweb と同じ大文字小文字を使用
   - 順序も Thirdweb と同じにする
   - 余分なスペースは削除

3. **Merkle Tree 生成アルゴリズムを調整**
   ```typescript
   // lib/merkleProof.ts を修正
   function hashAddress(address: string): Buffer {
     // Thirdweb の実装に合わせる
     const normalized = address.toLowerCase();
     const packed = encodePacked(['address'], [normalized as `0x${string}`]);
     return Buffer.from(keccak256(packed).slice(2), 'hex');
   }
   ```

### 方法2: Claim Condition を削除して CSV のみ使用

1. **Thirdweb Dashboard で Claim Condition を削除**
   ```
   1. Dashboard で該当トークンを選択
   2. Claim Conditions を開く
   3. 既存の Condition を削除
   4. Save Changes
   ```

2. **CSV ベースのアローリストのみ使用**
   - `allowlist.csv` でアドレス管理
   - サーバーサイドで検証
   - Merkle Proof 不要

### 方法3: Thirdweb の Snapshot 機能を使用

1. **Snapshot URL を Thirdweb に設定**
   ```
   1. CSV を公開 URL にアップロード（GitHub Gist など）
   2. Thirdweb Dashboard > Claim Conditions
   3. Snapshot URL に CSV の URL を設定
   4. Thirdweb が自動で Merkle Tree を生成
   ```

2. **API 経由で Proof を取得**
   ```typescript
   // Thirdweb SDK で自動取得される
   const canClaim = await contract.erc1155.claim.conditions.canClaim(
     tokenId,
     quantity,
     userAddress
   );
   ```

## 推奨アプローチ

### 短期的解決策（現在実装済み）
- Merkle Root 設定時は全員ミント可能にする
- CSV でのアローリスト管理は継続

### 長期的解決策
1. Thirdweb の Claim Condition を削除
2. CSV ベースのアローリストのみ使用
3. または Thirdweb Snapshot 機能で同期

## トラブルシューティング

### Merkle Root が一致しない場合のチェック項目

1. **アドレスリストの確認**
   ```bash
   # Thirdweb のリストと CSV を比較
   diff thirdweb-addresses.txt allowlist-addresses.txt
   ```

2. **ハッシュアルゴリズムの確認**
   ```typescript
   // テストコード
   const address = "0xB773EaE99ae304Cd8f2C2cae6fEF11168e1ABA0d";
   const hash1 = hashAddressThirdweb(address);
   const hash2 = hashAddressLocal(address);
   console.log('Thirdweb hash:', hash1);
   console.log('Local hash:', hash2);
   ```

3. **ソート順の確認**
   - Thirdweb: アルファベット順でソート
   - ローカル: sortPairs: true オプション

## まとめ

**自動取得が難しい理由:**
1. Thirdweb API が Merkle Proof を公開していない
2. Merkle Tree 生成アルゴリズムの微妙な違い
3. データソースの不一致（Dashboard vs CSV）

**現実的な解決策:**
- Claim Condition を使わず CSV のみで管理
- または Thirdweb Snapshot で自動同期
- または現在の「全員ミント可能」の回避策を継続