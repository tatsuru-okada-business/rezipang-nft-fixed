import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LocalSettings, MergedTokenConfig } from './types/localSettings';
import type { AdminConfiguration } from './types/adminConfig';

const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');
const ADMIN_CONFIG_PATH = join(process.cwd(), 'admin-config.json');

// Load local settings
export function loadLocalSettings(): LocalSettings | null {
  try {
    if (existsSync(LOCAL_SETTINGS_PATH)) {
      const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading local settings:', error);
  }
  return null;
}

// Save local settings
export function saveLocalSettings(settings: LocalSettings): void {
  try {
    writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving local settings:', error);
  }
}

// Merge admin config with local settings
export function getMergedTokenConfigs(): MergedTokenConfig[] {
  try {
    // Load admin config
    if (!existsSync(ADMIN_CONFIG_PATH)) {
      return [];
    }
    
    const adminContent = readFileSync(ADMIN_CONFIG_PATH, 'utf-8');
    const adminConfig: AdminConfiguration = JSON.parse(adminContent);
    
    // Load local settings
    const localSettings = loadLocalSettings();
    
    // Merge configs
    return adminConfig.tokens.map(token => {
      const localConfig = localSettings?.tokens[token.thirdweb.tokenId.toString()] || {};
      
      return {
        // Thirdweb data
        tokenId: token.thirdweb.tokenId,
        name: localConfig.customName || token.thirdweb.name,
        totalSupply: token.thirdweb.totalSupply || '0',
        uri: token.thirdweb.uri || '',
        image: token.thirdweb.image || '',
        description: localConfig.customDescription || token.thirdweb.description || '',
        currentPrice: token.thirdweb.currentPrice || localConfig.customPrice || '0',
        currency: token.thirdweb.currency || 'POL',
        merkleRoot: token.thirdweb.merkleRoot,
        claimConditionActive: token.thirdweb.claimConditionActive,
        
        // Local settings
        displayEnabled: localConfig.displayEnabled ?? true,
        displayOrder: localConfig.displayOrder ?? token.thirdweb.tokenId,
        isDefaultDisplay: localConfig.isDefaultDisplay ?? false,
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
  
  // First, try to find token marked as default
  const defaultToken = tokens.find(t => t.isDefaultDisplay);
  if (defaultToken) return defaultToken;
  
  // Fallback to defaultTokenId from settings
  const localSettings = loadLocalSettings();
  if (localSettings?.defaultTokenId !== undefined) {
    const token = tokens.find(t => t.tokenId === localSettings.defaultTokenId);
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
  const settings = loadLocalSettings() || {
    defaultTokenId: 0,
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
  const settings = loadLocalSettings() || {
    defaultTokenId: tokenId,
    tokens: {},
    lastUpdated: new Date().toISOString(),
  };
  
  // Remove default flag from all tokens
  Object.keys(settings.tokens).forEach(id => {
    if (settings.tokens[id].isDefaultDisplay) {
      settings.tokens[id].isDefaultDisplay = false;
    }
  });
  
  // Set new default
  settings.defaultTokenId = tokenId;
  if (!settings.tokens[tokenId.toString()]) {
    settings.tokens[tokenId.toString()] = {
      displayEnabled: true,
      displayOrder: tokenId,
    };
  }
  settings.tokens[tokenId.toString()].isDefaultDisplay = true;
  
  settings.lastUpdated = new Date().toISOString();
  saveLocalSettings(settings);
}