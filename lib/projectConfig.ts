import projectConfigDefault from '../project.config.js';

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

// キャッシュ用の変数
let cachedSettings: ProjectConfig | null = null;
let lastFetch = 0;
const CACHE_DURATION = 30000; // 30秒

// プロジェクト設定を取得（管理パネル設定を優先）
export async function getProjectConfigAsync(): Promise<ProjectConfig> {
  // キャッシュが有効な場合はそれを返す
  if (cachedSettings && Date.now() - lastFetch < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    // APIから設定を取得
    const response = await fetch('/api/admin/project-settings');
    if (response.ok) {
      const settings = await response.json();
      
      // 管理パネル設定とデフォルト設定をマージ
      cachedSettings = {
        ...projectConfigDefault,
        projectName: settings.projectName || projectConfigDefault.projectName,
        projectDescription: settings.projectDescription || projectConfigDefault.projectDescription,
        features: {
          ...projectConfigDefault.features,
          ...settings.features,
        },
        ui: {
          ...projectConfigDefault.ui,
          ...settings.ui,
        },
        localization: {
          ...projectConfigDefault.localization,
          ...settings.localization,
        },
        metadata: {
          title: settings.projectName || projectConfigDefault.metadata.title,
          description: settings.projectDescription || projectConfigDefault.metadata.description,
          keywords: projectConfigDefault.metadata.keywords,
          ogImage: projectConfigDefault.metadata.ogImage,
        }
      };
      lastFetch = Date.now();
      return cachedSettings;
    }
  } catch (error) {
    console.warn('Failed to load project settings from API');
  }
  
  return projectConfigDefault;
}

// 同期版（デフォルト設定のみ）
export function getProjectConfig(): ProjectConfig {
  // クライアントサイドではデフォルト設定を返す
  // 実際の設定はuseEffectなどで非同期に取得
  return cachedSettings || projectConfigDefault;
}

// トークンIDに基づいてNFT名を取得（デフォルト値のみ）
export function getNFTName(tokenId: number): string {
  // クライアントサイドではデフォルト名を返す
  // 実際の名前はAPIから取得
  const config = getProjectConfig();
  return config.nft.defaultName;
}

// 支払いトークン情報を取得（デフォルト値のみ）
export function getPaymentInfo() {
  // クライアントサイドでは null を返す
  // 実際の情報はAPIから取得
  return null;
}

// 機能フラグを確認
export function isFeatureEnabled(feature: keyof ProjectConfig['features']): boolean {
  const config = getProjectConfig();
  return config.features[feature] ?? false;
}