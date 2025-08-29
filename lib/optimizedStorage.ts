import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ThirdwebTokenInfo, LocalTokenSettings, ManagedToken } from './types/adminConfig';

const SETTINGS_PATH = join(process.cwd(), 'settings.json');
const TOKENS_CACHE_PATH = join(process.cwd(), 'tokens-cache.json');

interface Settings {
  defaultTokenId: number;
  lastSync?: string;
  tokens: Record<number, {
    displayEnabled: boolean;
    displayOrder: number;
    salesPeriodEnabled: boolean;
    isUnlimited: boolean;
    totalMinted?: number;
  }>;
}

interface TokensCache {
  lastUpdate: string;
  tokens: Array<{
    tokenId: number;
    name: string;
    description?: string;
    image?: string;
    totalSupply: string;
    price?: number;
    currencySymbol?: string;
    maxPerWallet?: number;
    merkleRoot?: string;
    claimConditionActive: boolean;
  }>;
}

// 設定を読み込み
export function loadSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) {
    // デフォルト設定を作成
    const defaultSettings: Settings = {
      defaultTokenId: 0,
      tokens: {}
    };
    writeFileSync(SETTINGS_PATH, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch (error) {
    console.error('Error loading settings:', error);
    return { defaultTokenId: 0, tokens: {} };
  }
}

// 設定を保存
export function saveSettings(settings: Settings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// トークンキャッシュを読み込み
export function loadTokensCache(): TokensCache | null {
  if (!existsSync(TOKENS_CACHE_PATH)) {
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(TOKENS_CACHE_PATH, 'utf-8'));
  } catch (error) {
    console.error('Error loading tokens cache:', error);
    return null;
  }
}

// トークンキャッシュを保存（Token #Xを除外）
export function saveTokensCache(tokens: ThirdwebTokenInfo[]): void {
  const cache: TokensCache = {
    lastUpdate: new Date().toISOString(),
    tokens: tokens
      .filter(token => !token.name.match(/^Token #\d+$/))
      .map(token => ({
        tokenId: token.tokenId,
        name: token.name,
        description: token.description,
        image: token.image,
        totalSupply: token.totalSupply?.toString() || '0',
        price: token.price,
        currencySymbol: token.currencySymbol,
        maxPerWallet: token.maxPerWallet,
        merkleRoot: token.merkleRoot,
        claimConditionActive: token.claimConditionActive || false
      }))
  };
  
  writeFileSync(TOKENS_CACHE_PATH, JSON.stringify(cache, null, 2));
}

// 統合されたトークンデータを取得
export function getManagedTokens(): ManagedToken[] {
  const settings = loadSettings();
  const cache = loadTokensCache();
  
  if (!cache || cache.tokens.length === 0) {
    return [];
  }
  
  return cache.tokens.map(cachedToken => {
    const localSettings = settings.tokens[cachedToken.tokenId] || {
      displayEnabled: true,
      displayOrder: cachedToken.tokenId,
      salesPeriodEnabled: false,
      isUnlimited: true,
      totalMinted: 0
    };
    
    const thirdwebInfo: ThirdwebTokenInfo = {
      tokenId: cachedToken.tokenId,
      name: cachedToken.name,
      description: cachedToken.description,
      image: cachedToken.image,
      totalSupply: BigInt(cachedToken.totalSupply),
      price: cachedToken.price,
      currencySymbol: cachedToken.currencySymbol,
      maxPerWallet: cachedToken.maxPerWallet,
      merkleRoot: cachedToken.merkleRoot,
      claimConditionActive: cachedToken.claimConditionActive
    };
    
    const local: LocalTokenSettings = {
      tokenId: cachedToken.tokenId,
      ...localSettings,
      lastSyncTime: new Date(cache.lastUpdate)
    };
    
    return {
      thirdweb: thirdwebInfo,
      local
    };
  });
}

// トークン設定を更新
export function updateTokenSettings(tokenId: number, updates: Partial<LocalTokenSettings>): void {
  const settings = loadSettings();
  
  settings.tokens[tokenId] = {
    ...settings.tokens[tokenId] || {},
    displayEnabled: updates.displayEnabled ?? true,
    displayOrder: updates.displayOrder ?? tokenId,
    salesPeriodEnabled: updates.salesPeriodEnabled ?? false,
    isUnlimited: updates.isUnlimited ?? true,
    totalMinted: updates.totalMinted ?? 0
  };
  
  // デフォルトトークンの更新
  if (updates.isDefaultDisplay) {
    settings.defaultTokenId = tokenId;
  } else if (settings.defaultTokenId === tokenId) {
    settings.defaultTokenId = 0;
  }
  
  saveSettings(settings);
}

// Thirdwebから同期したデータを保存
export function syncAndSaveTokens(thirdwebTokens: ThirdwebTokenInfo[]): void {
  // キャッシュを更新
  saveTokensCache(thirdwebTokens);
  
  // 設定も更新（新しいトークンのデフォルト設定を追加）
  const settings = loadSettings();
  thirdwebTokens
    .filter(token => !token.name.match(/^Token #\d+$/))
    .forEach(token => {
      if (!settings.tokens[token.tokenId]) {
        settings.tokens[token.tokenId] = {
          displayEnabled: true,
          displayOrder: token.tokenId,
          salesPeriodEnabled: false,
          isUnlimited: true,
          totalMinted: 0
        };
      }
    });
  
  settings.lastSync = new Date().toISOString();
  saveSettings(settings);
}

// 既存ファイルからの移行
export async function migrateFromOldFormat(): Promise<void> {
  try {
    // 既存のファイルを読み込み
    const adminConfigPath = join(process.cwd(), 'admin-config.json');
    const localSettingsPath = join(process.cwd(), 'local-settings.json');
    const defaultTokenPath = join(process.cwd(), 'default-token.json');
    
    if (existsSync(adminConfigPath)) {
      const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
      
      // トークンキャッシュを作成
      const validTokens = adminConfig.tokens
        .filter((t: any) => t.thirdweb && !t.thirdweb.name.match(/^Token #\d+$/))
        .map((t: any) => t.thirdweb);
      
      saveTokensCache(validTokens);
    }
    
    // 設定を移行
    const settings: Settings = {
      defaultTokenId: 0,
      tokens: {}
    };
    
    if (existsSync(localSettingsPath)) {
      const localSettings = JSON.parse(readFileSync(localSettingsPath, 'utf-8'));
      settings.tokens = localSettings.tokens || {};
      settings.defaultTokenId = localSettings.defaultTokenId || 0;
    }
    
    if (existsSync(defaultTokenPath)) {
      const defaultToken = JSON.parse(readFileSync(defaultTokenPath, 'utf-8'));
      settings.defaultTokenId = defaultToken.tokenId || 0;
    }
    
    saveSettings(settings);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}