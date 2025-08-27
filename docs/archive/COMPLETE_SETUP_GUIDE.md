# 🚀 ReZipang NFT Mint Site - 完全セットアップガイド（2025年版）

## 目次
1. [プロジェクト概要](#プロジェクト概要)
2. [クイックスタート](#クイックスタート)
3. [Thirdweb設定](#thirdweb設定)
4. [環境変数設定](#環境変数設定)
5. [価格設定](#価格設定)
6. [アローリスト設定](#アローリスト設定)
7. [デプロイ](#デプロイ)
8. [複数NFT対応](#複数nft対応)
9. [トラブルシューティング](#トラブルシューティング)

---

## プロジェクト概要

### 技術スタック
- **Framework**: Next.js 14+ (App Router)
- **Blockchain**: Thirdweb SDK v5
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm
- **Deployment**: Vercel
- **Language**: TypeScript

### 主要機能
- 🔐 アローリストベースのミント
- 💰 動的価格表示
- 🌍 多言語対応（日本語/英語）
- 🧪 ミントシミュレーター
- 📊 価格チェッカー
- 🎯 ERC1155 Token #4対応

---

## クイックスタート

### 1. プロジェクトのクローン
```bash
git clone [repository-url]
cd Rezipang-NFTs-MINT
```

### 2. 依存関係のインストール
```bash
pnpm install
```

### 3. 環境変数の設定
```bash
cp .env.local.example .env.local
```

`.env.local`を編集:
```env
# Thirdweb設定
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id_here
THIRDWEB_SECRET_KEY=your_secret_key_here

# NFTコントラクト設定
NEXT_PUBLIC_CONTRACT_ADDRESS=0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_DEFAULT_TOKEN_ID=4

# アローリスト（オプション）
NEXT_PUBLIC_ALLOWLIST_ADDRESSES=0xAddress1,0xAddress2
```

### 4. 開発サーバー起動
```bash
pnpm run dev
```

http://localhost:3000 でアクセス

---

## Thirdweb設定

### Client ID & Secret Key取得手順（2025年8月版）

#### Growthプランの場合

1. **チームページへアクセス**
   ```
   https://thirdweb.com/team
   ```

2. **プロジェクト作成**
   - 「Add New」→「Create Project」
   - プロジェクト名: 「ReZipang NFT Mint」

3. **API Key設定**
   
   **Client ID（公開可）**:
   - プロジェクトページで確認
   - `.env.local`の`NEXT_PUBLIC_THIRDWEB_CLIENT_ID`に設定
   
   **Secret Key（秘密）**:
   - 初回作成時のみ表示
   - `.env.local`の`THIRDWEB_SECRET_KEY`に設定
   - ⚠️ 必ずコピーして安全に保管

4. **ドメイン制限（推奨）**
   ```
   開発環境:
   - localhost:3000
   - localhost:*
   
   本番環境:
   - your-domain.vercel.app
   - your-custom-domain.com
   ```

#### 既存プロジェクトの場合

**Client ID確認方法**:
1. https://thirdweb.com/team
2. プロジェクトを選択
3. Settingsタブ

**Secret Key再発行**:
1. Settings → API Keys
2. 「Regenerate」（注意: 既存のキーは無効化）

---

## 環境変数設定

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb Client ID | `abc123...` |
| `THIRDWEB_SECRET_KEY` | Thirdweb Secret Key | `sk_live_...` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | NFTコントラクトアドレス | `0xeEb45AD...` |
| `NEXT_PUBLIC_CHAIN_ID` | チェーンID | `137` (Polygon) |
| `NEXT_PUBLIC_DEFAULT_TOKEN_ID` | ERC1155 Token ID | `4` |

### チェーンID一覧

| ネットワーク | Chain ID |
|-------------|----------|
| Ethereum Mainnet | 1 |
| Polygon | 137 |
| Sepolia Testnet | 11155111 |
| Mumbai Testnet | 80001 |

---

## 価格設定

### Thirdweb Dashboardから設定（推奨）

1. **コントラクトページを開く**
   ```
   https://thirdweb.com/polygon/0xeEb45AD49C073b0493B7104c8975ac7eaF8d003E
   ```

2. **Claim Conditionsタブ**

3. **価格を設定**
   ```yaml
   Token ID: 4
   Price per token: 0.05
   Currency: MATIC
   ```

4. **保存**

### 価格確認方法

**方法1: Price Checker（開発用）**
- サイトの「🔍 Price Checker」セクション
- 「Check All Prices」ボタン

**方法2: Mint Simulator**
- 「🧪 Mint Simulator」セクション
- 実際のミント前に価格を確認

---

## アローリスト設定

### 方法1: CSV ファイル（簡単）

`allowlist.csv`を作成:
```csv
address
0xB773EaE99ae304Cd8f2C2cae6fEF11168e1ABA0d
0x1234567890123456789012345678901234567890
```

### 方法2: 環境変数

`.env.local`:
```env
NEXT_PUBLIC_ALLOWLIST_ADDRESSES=0xAddress1,0xAddress2,0xAddress3
```

### 方法3: Thirdweb Claim Conditions（推奨）

1. Thirdweb Dashboardで設定
2. Merkle Tree自動生成
3. ガス効率が良い

---

## デプロイ

### Vercelへのデプロイ

1. **GitHubにプッシュ**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Vercelにインポート**
   - https://vercel.com/new
   - GitHubリポジトリを選択

3. **環境変数設定**
   - Vercel Dashboard → Settings → Environment Variables
   - `.env.local`の内容を追加

4. **デプロイ**
   - 自動的にビルド&デプロイ

### デプロイ後の確認

1. **価格表示**: 正しく表示されているか
2. **ウォレット接続**: MetaMaskが接続できるか
3. **ミントテスト**: Sepoliaでテストミント
4. **アローリスト**: 制限が機能しているか

---

## 複数NFT対応

### 同じClient IDで複数NFTに対応

**1つのClient ID = 無制限のコントラクト**

### 実装方法

#### 方法1: 環境変数で切り替え
```env
# コレクション1
NEXT_PUBLIC_CONTRACT_ADDRESS=0xContract1
NEXT_PUBLIC_DEFAULT_TOKEN_ID=1

# コレクション2（切り替え時）
NEXT_PUBLIC_CONTRACT_ADDRESS=0xContract2
NEXT_PUBLIC_DEFAULT_TOKEN_ID=2
```

#### 方法2: 動的選択UI
`components/TokenSelector.tsx`を使用してユーザーが選択

#### 方法3: マルチサイト
- `/collection1` - NFT 1用
- `/collection2` - NFT 2用

---

## トラブルシューティング

### よくある問題と解決方法

#### ❌ parseEther is not a function
**解決**: `toWei`を使用
```javascript
import { toWei } from "thirdweb";
const value = toWei("0.05");
```

#### ❌ 価格が0円と表示される
**解決**: 
1. Thirdweb DashboardでClaim Conditions設定
2. PriceCheckerで確認

#### ❌ Hydration error
**解決**: 
- 重複した`<html>`タグを削除
- `use client`ディレクティブを確認

#### ❌ ミントが失敗する
**解決**:
1. MintSimulatorで事前確認
2. アローリスト登録確認
3. 残高確認（価格+ガス代）

#### ❌ TypeScript エラー
**解決**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  }
}
```

---

## 開発ツール

### デバッグコンポーネント

| コンポーネント | 用途 |
|---------------|------|
| `PriceChecker` | 価格関数の確認 |
| `MintSimulator` | ミント前のシミュレーション |
| `ContractInspector` | コントラクト関数の調査 |

### コマンド

```bash
# 開発
pnpm run dev

# ビルド
pnpm run build

# 本番起動
pnpm run start

# 型チェック
pnpm run type-check

# リント
pnpm run lint
```

---

## セキュリティベストプラクティス

1. **Secret Keyの管理**
   - 絶対にクライアントサイドに露出させない
   - `.env.local`をGitにコミットしない

2. **ドメイン制限**
   - Thirdwebで本番ドメインのみ許可

3. **アローリスト**
   - Merkle Tree使用でプライバシー保護

4. **価格検証**
   - MintSimulatorで事前確認

---

## リソース

- [Thirdweb Documentation](https://portal.thirdweb.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Polygon Documentation](https://wiki.polygon.technology/)
- [プロジェクトGitHub](https://github.com/your-repo)

---

## サポート

問題が発生した場合:
1. このドキュメントのトラブルシューティングを確認
2. GitHub Issuesで報告
3. Thirdweb Discord: https://discord.gg/thirdweb

---

最終更新: 2025年1月
バージョン: 1.0.0