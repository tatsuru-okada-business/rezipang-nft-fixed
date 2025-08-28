/**
 * プロジェクト設定ファイル
 * 各プロジェクトに応じて、このファイルを編集してください
 */

const projectConfig = {
  // プロジェクト基本情報（デフォルト値）
  // 実際の値はproject-settings.jsonまたは管理パネルから設定
  projectName: "NFT Minting Site",
  projectDescription: "NFT Minting Platform",
  
  // NFT情報
  nft: {
    // トークン情報は全てThirdwebから動的に取得
    tokenNames: {}, // 使用しない - Thirdwebから取得
    defaultName: "NFT", // フォールバック用のデフォルト名
    collectionName: "NFT Collection",
    useExternalTokenConfig: false, // 常にThirdwebのデータを使用
  },

  // 支払い設定（ClaimConditionから動的取得）
  payment: {
    // これらの値は使用されません - ClaimConditionが優先されます
    useCustomToken: false,
    tokenSymbol: "POL",
    tokenAddress: null,
    defaultPrice: "0",
  },

  // UI設定
  ui: {
    // カラーテーマ
    theme: {
      backgroundColor: "#E0E7FF",    // サイト全体の背景色
      textColor: "#7C3AED",          // メインの文字色
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

  // メタデータ（デフォルト値）
  metadata: {
    title: "NFT Mint Site",
    description: "Mint your NFT",
    keywords: ["NFT", "Mint", "Blockchain"],
    ogImage: "/og-image.png",
  },
};

module.exports = projectConfig;