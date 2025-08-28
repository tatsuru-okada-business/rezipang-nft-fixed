# 🚀 デプロイメントガイド

## 本番環境へのデプロイ手順

### 1. Vercelへのデプロイ（推奨）

#### 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | NFTコントラクトアドレス | `0x...` |
| `NEXT_PUBLIC_CHAIN_ID` | チェーンID | `137` (Polygon) |
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | ThirdwebクライアントID | dashboard.thirdweb.comから取得 |
| `NEXT_PUBLIC_ADMIN_ADDRESSES` | 管理者ウォレット（カンマ区切り） | `0x...,0x...` |

#### デプロイフロー

1. **GitHubリポジトリをVercelに接続**
   ```bash
   vercel
   ```

2. **環境変数を設定**
   - Vercelダッシュボード → Settings → Environment Variables

3. **デプロイ実行**
   ```bash
   vercel --prod
   ```

4. **自動初期化**
   - デプロイ後、初回アクセス時に自動的にThirdwebから情報を取得
   - `admin-config.json`、`local-settings.json`、`default-token.json` が自動生成

5. **管理パネルで設定**
   - `https://your-domain.vercel.app/admin` にアクセス
   - プロジェクト名、説明、テーマカラーを設定

### 2. 手動初期化（オプション）

環境変数設定後、以下のコマンドで初期化：

```bash
# 設定ファイルの初期化
npm run init

# または、既存の設定をリセットして再初期化
npm run reset-config
npm run init
```

### 3. 新しいNFTプロジェクトへの切り替え

#### A. 環境変数を変更する方法

1. Vercel環境変数を更新
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` を新しいコントラクトに変更

2. 再デプロイ
   ```bash
   vercel --prod --force
   ```

3. 自動的に新しいコントラクトの情報で初期化

#### B. 設定ファイルをリセットする方法

```bash
# ローカル開発環境
npm run reset-config
npm run dev

# 本番環境（Vercel）
# 環境変数を更新後、再デプロイで自動リセット
```

## 初期化の仕組み

### 自動初期化のタイミング

1. **postinstall（npm install時）**
   - `package.json` の `postinstall` スクリプトが実行
   - 環境変数が設定されていれば自動初期化

2. **初回アクセス時**
   - `/api/initialize` が初期化状態をチェック
   - 必要に応じてThirdwebと同期

### 初期化される内容

| ファイル | 内容 | ソース |
|----------|------|--------|
| `admin-config.json` | NFTメタデータ、価格、通貨 | Thirdweb API |
| `local-settings.json` | 販売期間、表示設定 | デフォルト値（無期限販売） |
| `default-token.json` | デフォルトトークン情報 | 最初のトークン |
| `project-settings.json` | プロジェクト設定 | 管理パネルで設定（初期化されない） |

### 設定の優先順位

```
1. 環境変数（NEXT_PUBLIC_*）
   ↓
2. Thirdweb Claim Condition
   ↓  
3. admin-config.json
   ↓
4. project-settings.json（管理パネル）
   ↓
5. local-settings.json
   ↓
6. デフォルト値
```

## トラブルシューティング

### 初期化が失敗する場合

1. **環境変数の確認**
   ```bash
   echo $NEXT_PUBLIC_CONTRACT_ADDRESS
   echo $NEXT_PUBLIC_THIRDWEB_CLIENT_ID
   ```

2. **Thirdweb接続の確認**
   - Client IDが有効か確認
   - コントラクトアドレスが正しいか確認

3. **手動同期**
   ```bash
   curl -X POST https://your-domain/api/admin/sync-tokens
   ```

### 設定が反映されない場合

1. **キャッシュクリア**
   ```bash
   rm -rf .next
   npm run build
   ```

2. **設定ファイル確認**
   ```bash
   cat admin-config.json
   cat project-settings.json
   ```

## セキュリティ考慮事項

- 管理者アドレスは環境変数で設定
- APIキーは環境変数で管理
- 設定ファイルはサーバーサイドのみアクセス可能
- `.gitignore` で設定ファイルを除外

## まとめ

このシステムにより、新しいNFTプロジェクトのデプロイが簡単になります：

1. 環境変数を設定
2. デプロイ
3. 管理パネルでプロジェクト情報を設定

これだけで新しいミントサイトが完成します！