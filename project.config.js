/**
 * プロジェクト設定ファイル
 * 各プロジェクトに応じて、このファイルを編集してください
 */

const projectConfig = {
  // プロジェクト基本情報
  projectName: "ReZipang NFT",
  projectDescription: "ReZipang NFT Minting Site",
  
  // NFT情報
  nft: {
    // トークン名はThirdwebから動的に取得されます
    // ハードコーディングは使用しません
    tokenNames: {}, // 空のオブジェクト - Thirdwebから取得
    defaultName: "NFT", // フォールバック用のデフォルト名
    collectionName: "NFT Collection",
    // 外部トークン設定ファイルを使用するか
    useExternalTokenConfig: false, // falseにしてThirdwebのデータを使用
  },

  // 支払い設定
  payment: {
    // ZENY支払いを有効化（falseにするとMATIC/ETH支払い）
    useCustomToken: true,
    tokenSymbol: "ZENY",
    tokenAddress: "0x7B2d2732dcCC1830AA63241dC13649b7861d9b54",
    defaultPrice: "1",
  },

  // UI設定
  ui: {
    // カラーテーマ
    theme: {
      primary: "purple",    // purple, blue, green, red, etc.
      secondary: "blue",
    },
    // ロゴやブランディング
    branding: {
      showLogo: false,      // ロゴ表示（将来的な拡張用）
      logoUrl: "",
    },
  },

  // 多言語対応
  localization: {
    defaultLocale: "ja",    // ja or en
    availableLocales: ["ja", "en"],
  },

  // 機能フラグ
  features: {
    showTokenGallery: true,     // トークンギャラリー表示
    showPriceChecker: false,    // 価格チェッカー表示（開発用）
    showMintSimulator: false,   // ミントシミュレーター表示
    showDebugInfo: false,       // デバッグ情報表示
    maxMintPerWallet: true,     // ウォレットごとの最大MINT数制限
  },

  // メタデータ
  metadata: {
    title: "ReZipang NFT Mint Site",
    description: "Mint your ReZipang NFT on Polygon",
    keywords: ["NFT", "ReZipang", "Polygon", "Mint"],
    ogImage: "/og-image.png",
  },
};

module.exports = projectConfig;