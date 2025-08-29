import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LocalSettings, MergedTokenConfig } from './types/localSettings';

const SETTINGS_PATH = join(process.cwd(), 'settings.json');
const TOKENS_CACHE_PATH = join(process.cwd(), 'tokens-cache.json');

// Load local settings
export function loadLocalSettings(): any {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const content = readFileSync(SETTINGS_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { tokens: {}, defaultTokenId: 0 };
}

// Save local settings
export function saveLocalSettings(settings: any): void {
  try {
    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Merge tokens-cache with settings
export function getMergedTokenConfigs(): MergedTokenConfig[] {
  try {
    // Load tokens cache
    if (!existsSync(TOKENS_CACHE_PATH)) {
      return [];
    }
    
    const tokensContent = readFileSync(TOKENS_CACHE_PATH, 'utf-8');
    const tokensCache = JSON.parse(tokensContent);
    
    // Load settings
    const settings = loadLocalSettings();
    
    // Merge configs
    return tokensCache.tokens.map((token: any) => {
      const localConfig = settings?.tokens?.[token.tokenId.toString()] || {};
      
      return {
        // Token data from cache
        tokenId: token.tokenId,
        name: localConfig.customName || token.name,
        totalSupply: token.totalSupply || '0',
        uri: token.uri || '',
        image: token.image || '',
        description: localConfig.customDescription || token.description || '',
        currentPrice: token.price || localConfig.customPrice || '0',
        price: token.price || localConfig.customPrice || '0',
        currency: token.currency || '',
        merkleRoot: token.merkleRoot,
        claimConditionActive: token.claimConditionActive,
        
        // Local settings
        displayEnabled: localConfig.displayEnabled ?? true,
        displayOrder: localConfig.displayOrder ?? token.tokenId,
        salesPeriodEnabled: localConfig.salesPeriodEnabled ?? false,
        salesStartDate: localConfig.salesStartDate,
        salesEndDate: localConfig.salesEndDate,
        isUnlimited: localConfig.isUnlimited ?? true,
        totalMinted: localConfig.totalMinted ?? 0,
        maxSupply: localConfig.maxSupply,
        reservedSupply: localConfig.reservedSupply ?? 0,
        soldOutMessage: localConfig.soldOutMessage || "売り切れました",
        maxPerWallet: localConfig.maxPerWallet ?? 10,
      };
    });
  } catch (error) {
    console.error('Error merging token configs:', error);
    return [];
  }
}

// Get default token
export function getDefaultToken(): MergedTokenConfig | null {
  const tokens = getMergedTokenConfigs();
  
  // Get from settings.json
  const settings = loadLocalSettings();
  if (settings?.defaultTokenId !== undefined) {
    const token = tokens.find(t => t.tokenId === settings.defaultTokenId);
    if (token) return token;
  }
  
  // Fallback to first active token
  return tokens.find(t => t.claimConditionActive && t.displayEnabled) || null;
}

// Update local settings for a specific token
export function updateTokenLocalSettings(
  tokenId: number,
  updates: Partial<LocalSettings['tokens'][string]>
): void {
  // default-token.jsonからデフォルトトークンIDを取得
  let defaultTokenId = 0;
  try {
    const defaultData = JSON.parse(readFileSync(join(process.cwd(), 'default-token.json'), 'utf-8'));
    defaultTokenId = defaultData.tokenId ?? 0;
  } catch (e) {
    // エラーの場合は既存の設定を使用
  }
  
  const settings = loadLocalSettings() || {
    defaultTokenId: defaultTokenId,
    tokens: {},
    lastUpdated: new Date().toISOString(),
  };
  
  settings.tokens[tokenId.toString()] = {
    ...settings.tokens[tokenId.toString()],
    ...updates,
  };
  
  settings.lastUpdated = new Date().toISOString();
  saveLocalSettings(settings);
}

// Set default token
export function setDefaultToken(tokenId: number): void {
  // Update default-token.json
  const defaultTokenPath = join(process.cwd(), 'default-token.json');
  writeFileSync(defaultTokenPath, JSON.stringify({ tokenId }, null, 2));
  
  // Also update local settings if needed
  const settings = loadLocalSettings() || {
    defaultTokenId: tokenId,
    tokens: {},
    lastUpdated: new Date().toISOString(),
  };
  
  // Set new default
  settings.defaultTokenId = tokenId;
  if (!settings.tokens[tokenId.toString()]) {
    settings.tokens[tokenId.toString()] = {
      displayEnabled: true,
      displayOrder: tokenId,
    };
  }
  
  settings.lastUpdated = new Date().toISOString();
  saveLocalSettings(settings);
}