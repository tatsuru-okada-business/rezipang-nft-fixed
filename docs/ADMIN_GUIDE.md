# 管理者ガイド / Admin Guide（v2.0）

## 概要
このドキュメントでは、NFTミントサイトの新しい管理者機能について説明します。

## ⚠️ 重要な変更（2025年1月）

### 新しい管理画面の設計思想
- **Thirdwebが真実の源（Source of Truth）**
- **ローカルは補助情報のみ管理**
- **役割の明確な分離**

## 管理者アクセスの設定

### 1. 管理者ウォレットアドレスの登録

`.env.local`ファイルに管理者のウォレットアドレスを設定します：

```env
# 単一の管理者
NEXT_PUBLIC_ADMIN_ADDRESSES=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7

# 複数の管理者（カンマ区切り）
NEXT_PUBLIC_ADMIN_ADDRESSES=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7,0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed
```

**重要**: アドレスは大文字小文字を区別しません。

### 2. 管理画面へのアクセス

1. ブラウザで `/admin` にアクセス
2. MetaMaskなどのウォレットを接続
3. 登録された管理者ウォレットでログイン

URL例：
- ローカル環境: `http://localhost:3000/admin`
- 本番環境: `https://yourdomain.com/admin`

## 管理画面の機能

### 販売設定の管理

管理画面では以下の設定が可能です：

#### 1. 基本設定
- **Token ID**: 販売するNFTのトークンID
- **Name**: 販売設定の名前
- **Total Supply**: 総供給量
- **Current Supply**: 現在の供給量（販売済み数）
- **Active**: 販売の有効/無効

#### 2. クレーム条件（Claim Conditions）

各販売設定に複数のクレーム条件を設定できます：

- **Start Time**: 販売開始日時
- **End Time**: 販売終了日時（オプション）
- **Price**: 価格
- **Currency**: 通貨（MATIC/ZENY/USDC）
- **Max Per Wallet**: ウォレットごとの最大購入数
- **Max Supply**: この条件での最大供給量
- **Token Address**: ERC20トークンのアドレス（ZENY/USDC使用時）

### 操作方法

#### 新規販売設定の追加
1. 「+ Add New Sale Configuration」ボタンをクリック
2. 必要な情報を入力
3. 「Save All Changes」をクリック

#### クレーム条件の追加
1. 販売設定の「Add Condition」ボタンをクリック
2. 条件の詳細を入力
3. 「Save All Changes」をクリック

#### 設定の削除
- 条件の削除: 「Delete Condition」ボタン
- 販売設定の削除: 「Delete Configuration」ボタン

## 重要な注意事項

### Thirdwebコントラクトとの関係

現在のシステムは2つの設定場所があります：

1. **Thirdweb Dashboard** (優先)
   - コントラクトに直接設定されるクレーム条件
   - Merkle Root（アローリスト）
   - 実際の価格と購入制限

2. **ローカル設定** (`sale-config.json`)
   - 管理画面から設定する追加情報
   - 在庫管理
   - 複数条件の管理

**重要**: 実際のミント時は**Thirdweb Dashboardの設定が優先**されます。

### アローリスト管理

アローリスト（許可リスト）は**Thirdweb Dashboard**で管理します：

1. [Thirdweb Dashboard](https://thirdweb.com/dashboard)にアクセス
2. 対象のコントラクトを選択
3. 「Claim Conditions」タブを開く
4. 「Allowlist」セクションでCSVをアップロード

### 価格設定の優先順位

1. **最優先**: Thirdwebコントラクトのクレーム条件
2. **次点**: ローカルの`sale-config.json`
3. **デフォルト**: 環境変数（`.env.local`）

## トラブルシューティング

### アクセスできない場合

1. **ウォレットアドレスの確認**
   ```bash
   # .env.localの設定を確認
   cat .env.local | grep ADMIN_ADDRESSES
   ```

2. **正しいネットワークに接続**
   - Polygon Mainnet (Chain ID: 137)に接続していることを確認

3. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

### 設定が保存されない

1. **ファイル権限の確認**
   ```bash
   ls -la sale-config.json
   ```

2. **JSONフォーマットの確認**
   ```bash
   # JSONの妥当性チェック
   cat sale-config.json | python -m json.tool
   ```

### 設定が反映されない

1. **サーバーの再起動**
   ```bash
   # 開発環境
   pnpm run dev
   
   # 本番環境（Vercel）
   # 自動的に再デプロイされます
   ```

2. **Thirdweb Dashboardの確認**
   - 実際のクレーム条件はThirdweb側で設定

## セキュリティ上の注意

1. **管理者アドレスの保護**
   - 管理者ウォレットの秘密鍵は絶対に共有しない
   - ハードウェアウォレットの使用を推奨

2. **環境変数の管理**
   - `.env.local`をGitにコミットしない
   - 本番環境ではVercelの環境変数を使用

3. **定期的な監査**
   - 管理者リストを定期的に確認
   - 不要なアドレスは削除

## よくある質問

### Q: 管理画面で設定した価格が反映されない
A: Thirdweb Dashboardでコントラクトのクレーム条件を確認してください。コントラクトの設定が優先されます。

### Q: アローリストはどこで設定する？
A: Thirdweb Dashboardで設定します。CSVファイルをアップロードしてMerkle Rootを生成します。

### Q: 複数の管理者を設定できる？
A: はい、カンマ区切りで複数のウォレットアドレスを設定できます。

### Q: 販売期間を設定したい
A: 管理画面のクレーム条件で「Start Time」と「End Time」を設定します。

### Q: 在庫管理はどうなっている？
A: 「Current Supply」で販売済み数を、「Total Supply」で総供給量を管理できます。

## サポート

問題が解決しない場合は、以下の情報と共に開発チームに連絡してください：

- エラーメッセージのスクリーンショット
- ブラウザのコンソールログ
- 使用しているウォレットアドレス
- 実行した操作の詳細

---

最終更新: 2025年1月
バージョン: 1.0.0