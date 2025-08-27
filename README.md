# 🔥 ReZipang NFT ミントサイト

Polygon上のERC1155 NFTミントサイト。Thirdweb SDK v5を使用した最新の実装。

## 📖 ドキュメント

**[📚 統合ドキュメントを見る](./docs/UNIFIED_DOCUMENTATION.md)**

すべての情報が1つのドキュメントに統合されています。

## 🚀 クイックスタート

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.local.example .env.local

# 開発サーバー起動（ポート3001）
npm run dev

# http://localhost:3001 でアクセス
```

## 🔄 コントラクト切り替え

```bash
# テスト用コントラクトに切り替え
./scripts/switch-contract.sh test

# 本番用コントラクトに切り替え  
./scripts/switch-contract.sh prod
```

**重要**: コントラクトを切り替えると設定ファイルがリセットされます。必要に応じてバックアップを取ってください。

## 📁 プロジェクト構造

```
├── app/              # Next.js App Router
├── components/       # Reactコンポーネント
├── lib/             # ユーティリティ
├── docs/            # ドキュメント
├── scripts/         # 便利スクリプト
└── public/          # 静的ファイル
```

## 🛠 技術スタック

- **Next.js 15** - フレームワーク
- **Thirdweb SDK v5** - ブロックチェーン統合
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **pnpm** - パッケージ管理

## 📝 ライセンス

プライベートプロジェクト

---

詳細は[統合ドキュメント](./docs/UNIFIED_DOCUMENTATION.md)を参照してください。