import projectConfig from '../project.config.js';

export interface ProjectConfig {
  projectName: string;
  projectDescription: string;
  nft: {
    tokenNames: { [key: number]: string };
    defaultName: string;
    collectionName: string;
  };
  payment: {
    useCustomToken: boolean;
    tokenSymbol: string;
    tokenAddress: string;
    defaultPrice: string;
  };
  ui: {
    theme: {
      primary: string;
      secondary: string;
    };
    branding: {
      showLogo: boolean;
      logoUrl: string;
    };
  };
  localization: {
    defaultLocale: string;
    availableLocales: string[];
  };
  features: {
    showTokenGallery: boolean;
    showPriceChecker: boolean;
    showMintSimulator: boolean;
    showDebugInfo: boolean;
    maxMintPerWallet: boolean;
  };
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
}

// プロジェクト設定を取得
export function getProjectConfig(): ProjectConfig {
  return projectConfig;
}

// トークンIDに基づいてNFT名を取得
export function getNFTName(tokenId: number): string {
  const config = getProjectConfig();
  return config.nft.tokenNames[tokenId] || `${config.nft.defaultName} #${tokenId}`;
}

// 支払いトークン情報を取得
export function getPaymentInfo() {
  const config = getProjectConfig();
  if (config.payment.useCustomToken) {
    return {
      symbol: config.payment.tokenSymbol,
      address: config.payment.tokenAddress,
      price: config.payment.defaultPrice,
    };
  }
  return null;
}

// 機能フラグを確認
export function isFeatureEnabled(feature: keyof ProjectConfig['features']): boolean {
  const config = getProjectConfig();
  return config.features[feature] ?? false;
}