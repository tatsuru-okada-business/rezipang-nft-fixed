# 環境別設定ガイド

## テスト環境と本番環境の切り替え

### 環境変数（.env.local）

```env
# テスト環境
NEXT_PUBLIC_CONTRACT_ADDRESS=0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1
NEXT_PUBLIC_CHAIN_ID=137

# 本番環境（コメントアウトで切り替え）
# NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
# NEXT_PUBLIC_CHAIN_ID=137
```

## 環境別の挙動

### テスト環境の動作
- **コントラクト**: `0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1`
- **支払いトークン**: ZENY（`0x7B2d2732dcCC1830AA63241dC13649b7861d9b54`）
- **ミント処理**: 2ステップ（Approve → Mint）
  1. ZENYトークンの使用承認
  2. NFTのミント実行
- **価格**: 1 ZENY

### 本番環境の動作
- **コントラクト**: `0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E`
- **支払い方法**: ClaimConditionに従う
  - ZENY使用時: 2ステップ（Approve → Mint）
  - USDC使用時: 2ステップ（Approve → Mint）
  - POL/MATIC使用時: 1ステップ（直接Mint）
  - 無料時: 1ステップ（直接Mint）

## 切り替え手順

### 1. テスト環境に切り替え
```bash
# .env.localを編集
NEXT_PUBLIC_CONTRACT_ADDRESS=0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1
```

### 2. 本番環境に切り替え
```bash
# .env.localを編集
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
```

### 3. サーバー再起動
```bash
# 開発環境
pnpm dev

# 本番環境（Vercel）
vercel --prod
```

## トラブルシューティング

### ミントエラーが発生する場合
1. ウォレットにZENY/USDC/POLが十分にあるか確認
2. コントラクトアドレスが正しいか確認
3. ネットワークがPolygonメインネット（Chain ID: 137）か確認

### Approve/Mintの2ステップが動作しない場合
- テスト環境: 常に2ステップで動作
- 本番環境: 支払いトークンがZENY/USDCの場合のみ2ステップ

### 価格が正しく表示されない場合
1. 管理パネルで「同期」ボタンをクリック
2. ClaimConditionが正しく設定されているか確認