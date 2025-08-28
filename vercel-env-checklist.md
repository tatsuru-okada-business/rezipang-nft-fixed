# Vercel環境変数チェックリスト

## 必須の環境変数

以下の環境変数がVercelプロジェクトの Settings → Environment Variables に設定されていることを確認してください：

### 1. NEXT_PUBLIC_CONTRACT_ADDRESS
```
値: 0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
対象環境: Production, Preview, Development
```

### 2. NEXT_PUBLIC_CHAIN_ID
```
値: 137
対象環境: Production, Preview, Development
```

### 3. NEXT_PUBLIC_THIRDWEB_CLIENT_ID
```
値: c2cde64ddaeb11bea253645e26de19ab
対象環境: Production, Preview, Development
```

### 4. THIRDWEB_SECRET_KEY
```
値: WGkCguW5_7-pdSCh4PCr3h7BCUBcS_zbeRzJwbccHpBBiBDkuIgbL77YRKe8jZplr61rrJdBrHASikOJtEvZBw
対象環境: Production, Preview, Development
```

### 5. NEXT_PUBLIC_ADMIN_ADDRESSES
```
値: 0xB773EaE99ae304Cd8f2C2cae6fEF11168e1ABA0d
対象環境: Production, Preview, Development
```

### 6. NEXT_PUBLIC_USE_CSV_FOR_MERKLE (オプション)
```
値: true
対象環境: Production, Preview, Development
```

## 設定手順

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. Settings タブをクリック
4. 左メニューの Environment Variables をクリック
5. 上記の環境変数を追加
   - Key: 環境変数名
   - Value: 値
   - Environment: Production, Preview, Development にチェック
6. Save ボタンをクリック

## 重要な注意点

- `NEXT_PUBLIC_` で始まる変数はクライアント側でも使用されます
- 環境変数を追加/変更した後は、Vercelで再デプロイが必要です
- Vercelの「Redeploy」ボタンで再デプロイしてください

## デバッグ用コード

環境変数が正しく読み込まれているか確認するため、以下のコードをページに追加できます：

```tsx
console.log('CONTRACT_ADDRESS:', process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
console.log('CHAIN_ID:', process.env.NEXT_PUBLIC_CHAIN_ID);
```