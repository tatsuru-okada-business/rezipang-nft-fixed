# 📦 プロジェクトカスタマイズガイド

このガイドでは、NFTミントサイトを異なるNFTプロジェクト用にカスタマイズする方法を説明します。

## 目次
1. [クイックスタート](#クイックスタート)
2. [設定ファイル詳細](#設定ファイル詳細)
3. [NFT設定](#nft設定)
4. [支払い設定](#支払い設定)
5. [UI設定](#ui設定)
6. [機能フラグ](#機能フラグ)
7. [多言語対応](#多言語対応)
8. [実例](#実例)

---

## クイックスタート

プロジェクトをカスタマイズするには、`project.config.js`ファイルを編集するだけです。

### 最小限の変更例

```javascript
// project.config.js
const projectConfig = {
  projectName: "あなたのNFTプロジェクト名",
  
  nft: {
    tokenNames: {
      1: "限定NFT #1",
      2: "レアNFT #2",
    },
    defaultName: "標準NFT",
  },
  
  payment: {
    useCustomToken: false,  // ETH/MATIC支払いの場合
    defaultPrice: "0.01",
  },
};
```

---

## 設定ファイル詳細

### 設定ファイルの場所
```
/
├── project.config.js     # メイン設定ファイル（編集対象）
└── lib/
    └── projectConfig.ts   # TypeScript型定義（編集不要）
```

### 設定変更の流れ
1. `project.config.js`を編集
2. `pnpm run dev`で開発サーバーを再起動
3. 変更を確認

---

## NFT設定

### トークン名の設定

特定のトークンIDに対して個別の名前を設定できます。

```javascript
nft: {
  // 特定のトークンIDに名前を設定
  tokenNames: {
    1: "ゴールドパス NFT",
    2: "シルバーパス NFT",
    3: "ブロンズパス NFT",
    100: "特別記念NFT",
  },
  
  // 未定義のトークンIDの場合のデフォルト名
  defaultName: "メンバーシップNFT",
  
  // コレクション全体の名前
  collectionName: "Exclusive Membership Collection",
}
```

### 表示ロジック
- 設定されたトークンID → `tokenNames`の値を表示
- 未設定のトークンID → `{defaultName} #{tokenId}`形式で表示

例：
- Token ID 1 → "ゴールドパス NFT"
- Token ID 5 → "メンバーシップNFT #5"

---

## 支払い設定

### カスタムトークン支払い（ZENY等）

```javascript
payment: {
  useCustomToken: true,
  tokenSymbol: "ZENY",
  tokenAddress: "0x7B2d2732dcCC1830AA63241dC13649b7861d9b54",
  defaultPrice: "1",  // 1 ZENY
}
```

### ネイティブトークン支払い（ETH/MATIC）

```javascript
payment: {
  useCustomToken: false,
  tokenSymbol: "MATIC",  // 表示用（実際はチェーンから自動判定）
  tokenAddress: "",       // 空文字列
  defaultPrice: "0.01",   // 0.01 MATIC
}
```

### 無料ミント

```javascript
payment: {
  useCustomToken: false,
  defaultPrice: "0",  // 無料（ガス代のみ）
}
```

---

## UI設定

### カラーテーマ

```javascript
ui: {
  theme: {
    primary: "purple",    // 選択肢: purple, blue, green, red, orange
    secondary: "blue",    // 選択肢: 同上
  },
  branding: {
    showLogo: true,       // ロゴ表示（将来実装予定）
    logoUrl: "/logo.png", // ロゴファイルパス
  },
}
```

---

## 機能フラグ

各機能の表示/非表示を制御できます。

```javascript
features: {
  // トークンギャラリー（全トークン一覧）
  showTokenGallery: true,
  
  // 価格チェッカー（開発ツール）
  showPriceChecker: false,  // 本番環境では false 推奨
  
  // ミントシミュレーター
  showMintSimulator: true,
  
  // デバッグ情報
  showDebugInfo: false,
  
  // ウォレットごとの最大ミント数制限
  maxMintPerWallet: true,
}
```

### 用途別推奨設定

#### 開発環境
```javascript
features: {
  showPriceChecker: true,
  showMintSimulator: true,
  showDebugInfo: true,
}
```

#### 本番環境
```javascript
features: {
  showPriceChecker: false,
  showMintSimulator: false,
  showDebugInfo: false,
}
```

---

## 多言語対応

### デフォルト言語の設定

```javascript
localization: {
  defaultLocale: "ja",        // "ja" または "en"
  availableLocales: ["ja", "en"],
}
```

### 言語別テキストのカスタマイズ

`locales/ja.json` と `locales/en.json` を編集：

```json
// locales/ja.json
{
  "title": "あなたのNFTプロジェクト",
  "subtitle": "限定NFTをミントしよう",
  // ...
}
```

---

## 実例

### 例1: 純金のパスポートNFT

```javascript
const projectConfig = {
  projectName: "純金のパスポートNFT",
  projectDescription: "Rezipang Pure Gold Passport NFT",
  
  nft: {
    tokenNames: {
      2: "純金のパスポートNFT",
    },
    defaultName: "純金のパスポートNFT",
    collectionName: "Rezipang Collection",
  },
  
  payment: {
    useCustomToken: true,
    tokenSymbol: "ZENY",
    tokenAddress: "0x7B2d2732dcCC1830AA63241dC13649b7861d9b54",
    defaultPrice: "1",
  },
  
  features: {
    showTokenGallery: false,  // 単一トークンのみ
    showPriceChecker: false,
    showMintSimulator: true,
    maxMintPerWallet: true,
  },
};
```

### 例2: マルチトークンコレクション

```javascript
const projectConfig = {
  projectName: "Fantasy Heroes",
  projectDescription: "Collect unique fantasy heroes",
  
  nft: {
    tokenNames: {
      1: "Fire Dragon",
      2: "Ice Phoenix",
      3: "Thunder Wolf",
      4: "Earth Golem",
      5: "Wind Fairy",
    },
    defaultName: "Mystery Hero",
    collectionName: "Fantasy Heroes Collection",
  },
  
  payment: {
    useCustomToken: false,
    defaultPrice: "0.05",  // 0.05 MATIC
  },
  
  features: {
    showTokenGallery: true,   // 全ヒーロー表示
    showPriceChecker: false,
    showMintSimulator: true,
    maxMintPerWallet: false,  // 制限なし
  },
};
```

### 例3: 無料配布NFT

```javascript
const projectConfig = {
  projectName: "Community Badge",
  projectDescription: "Free community member badge",
  
  nft: {
    tokenNames: {
      1: "Early Supporter Badge",
    },
    defaultName: "Community Badge",
  },
  
  payment: {
    useCustomToken: false,
    defaultPrice: "0",  // 無料
  },
  
  features: {
    showTokenGallery: false,
    showPriceChecker: false,
    showMintSimulator: false,
    maxMintPerWallet: true,  // 1人1個まで
  },
};
```

---

## 環境変数との関係

`project.config.js`の設定は環境変数よりも優先されます：

1. **優先順位**：
   - project.config.js > 環境変数 > デフォルト値

2. **環境変数が必要な項目**：
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`（コントラクトアドレス）
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`（Thirdweb認証）
   - `NEXT_PUBLIC_CHAIN_ID`（ブロックチェーン）

3. **設定ファイルで上書き可能**：
   - トークン名
   - 支払い設定
   - UI設定
   - 機能フラグ

---

## トラブルシューティング

### 設定が反映されない

```bash
# 開発サーバーを再起動
pnpm run dev

# キャッシュをクリア
rm -rf .next
pnpm run dev
```

### TypeScriptエラー

```bash
# 型定義を再生成
pnpm run build
```

### 設定の検証

ブラウザのコンソールで現在の設定を確認：

```javascript
// ブラウザコンソールで実行
console.log(window.__PROJECT_CONFIG__);  // 将来実装予定
```

---

## ベストプラクティス

1. **バージョン管理**
   - `project.config.js`は必ずGitにコミット
   - プロジェクトごとにブランチを分ける

2. **設定の分離**
   - 秘密情報は環境変数に
   - プロジェクト固有設定は`project.config.js`に

3. **テスト**
   - 設定変更後は必ず動作確認
   - 特に支払い設定は慎重にテスト

4. **ドキュメント化**
   - カスタム設定はREADMEに記載
   - 特殊な設定は理由をコメントで説明

---

## サポート

設定で困ったら：

1. このドキュメントを確認
2. `project.config.js`のコメントを確認
3. GitHub Issuesで質問

---

最終更新: 2025年1月
対応バージョン: v1.0.0