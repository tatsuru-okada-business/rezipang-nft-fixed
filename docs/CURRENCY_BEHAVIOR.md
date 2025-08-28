# 通貨別の挙動ガイド

## Polygon最新情報（2024年9月4日〜）
**重要**: 2024年9月4日より、MATICからPOLへの移行が正式に開始されました。
- Polygon PoSネットワーク上のMATICは自動的にPOLに移行済み
- POLがネイティブガス・ステーキングトークンとして使用されます
- 交換比率: 1:1（1 MATIC = 1 POL）

## 通貨別のミント処理

### 1. ZENY（カスタムトークン）
**処理フロー**: 2ステップ
1. **Approve**: ZENYトークンの使用許可
2. **Mint**: NFTのミント実行

**特徴**:
- トークンアドレス: `0x7B2d2732dcCC1830AA63241dC13649b7861d9b54`
- 小数点: 0桁（整数値）
- セキュリティ: 毎回新規承認を実行（既存の承認は上書き）

```javascript
// テスト環境での設定例
if (isTestEnvironment || tokenCurrency === 'ZENY') {
  // 2ステップ処理を実行
}
```

### 2. USDC（ステーブルコイン）
**処理フロー**: 2ステップ
1. **Approve**: USDCトークンの使用許可
2. **Mint**: NFTのミント実行

**特徴**:
- トークンアドレス: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`（Polygon）
- 小数点: 6桁
- 価格計算: `価格 / 1e6`

```javascript
if (tokenCurrency === 'USDC') {
  const priceInToken = Number(priceFromContract) / 1e6;
}
```

### 3. POL（ネイティブトークン）
**処理フロー**: 1ステップ
- **Mint**: 直接NFTをミント（valueフィールドに金額を含める）

**特徴**:
- トークンアドレス: 不要（ネイティブトークン）
- 小数点: 18桁
- ガス代: POLで支払い
- トランザクション: valueフィールドにミント価格を含める

```javascript
if (!paymentTokenAddress || tokenCurrency === 'POL') {
  // 1ステップで直接ミント
  const totalValue = toWei(mintPrice * quantity);
}
```

### 4. 無料ミント
**処理フロー**: 1ステップ
- **Mint**: 直接NFTをミント（value = 0）

**特徴**:
- 支払い不要
- ガス代のみPOLで必要
- アローリストチェックのみ実施

## 環境別設定

### テスト環境
```javascript
const isTestEnvironment = contractAddress === '0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1';
```
- 強制的にZENY使用（2ステップ）
- 価格: 1 ZENY固定

### 本番環境
```javascript
// ClaimConditionから自動判定
```
- ClaimConditionのcurrencyフィールドに従う
- 動的に1ステップ/2ステップを判定

## 価格取得の優先順位

1. **ClaimCondition**（最優先）
   - Thirdwebコントラクトから直接取得
   - 最も信頼できるデータソース

2. **admin-config.json**
   - 管理パネルで同期したデータ
   - ClaimConditionのキャッシュ

3. **環境変数**（フォールバック）
   - `NEXT_PUBLIC_MINT_PRICE`
   - デフォルト値として使用

## エラーハンドリング

### ZENY/USDCの承認エラー
```javascript
// 承認失敗時の処理
onError: (error) => {
  if (error.message.includes('insufficient allowance')) {
    // 承認額不足
  }
}
```

### POLの残高不足
```javascript
if (error.message.includes('insufficient funds')) {
  // POL残高不足
}
```

## デバッグ情報

### 通貨判定ログ
```javascript
console.log('Currency detected:', tokenCurrency);
console.log('Payment token:', paymentTokenAddress || 'Native POL');
console.log('Processing steps:', paymentTokenAddress ? 2 : 1);
```

### トランザクション確認
- ZENY/USDC: Polygonscanで2つのトランザクション（Approve + Mint）
- POL: Polygonscanで1つのトランザクション（Mint）