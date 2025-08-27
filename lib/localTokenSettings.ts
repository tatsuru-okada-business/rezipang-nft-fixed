import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LocalTokenSettings, ManagedToken, AdminConfiguration } from './types/adminConfig';
import type { ThirdwebTokenInfo } from './types/adminConfig';

const ADMIN_CONFIG_PATH = join(process.cwd(), 'admin-config.json');
const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');

// デフォルトのローカル設定を作成
function createDefaultLocalSettings(tokenId: number): LocalTokenSettings {
  return {
    tokenId,
    displayEnabled: true,
    isDefaultDisplay: false,
    displayOrder: tokenId,
    salesPeriodEnabled: false,
    isUnlimited: true,
    totalMinted: 0,
    lastSyncTime: new Date(),
  };
}

// ローカル設定を読み込み
export function loadLocalSettings(): Map<number, LocalTokenSettings> {
  const settings = new Map<number, LocalTokenSettings>();
  
  if (existsSync(LOCAL_SETTINGS_PATH)) {
    try {
      const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
      const localSettingsData = JSON.parse(content);
      
      // local-settings.json形式から読み込み
      if (localSettingsData.tokens) {
        Object.entries(localSettingsData.tokens).forEach(([tokenIdStr, tokenSettings]: [string, any]) => {
          const tokenId = parseInt(tokenIdStr);
          settings.set(tokenId, {
            tokenId,
            displayEnabled: tokenSettings.displayEnabled ?? true,
            displayOrder: tokenSettings.displayOrder ?? tokenId,
            isDefaultDisplay: tokenSettings.isDefaultDisplay ?? false,
            salesPeriodEnabled: tokenSettings.salesPeriodEnabled ?? false,
            salesStartDate: tokenSettings.salesStartDate ? new Date(tokenSettings.salesStartDate) : undefined,
            salesEndDate: tokenSettings.salesEndDate ? new Date(tokenSettings.salesEndDate) : undefined,
            isUnlimited: tokenSettings.isUnlimited ?? true,
            totalMinted: tokenSettings.totalMinted ?? 0,
            lastSyncTime: new Date(localSettingsData.lastUpdated || new Date()),
          });
        });
      }
    } catch (error) {
      console.error('Error loading local settings:', error);
    }
  }
  
  return settings;
}

// BigIntをJSONシリアライズ可能にする
function replacer(key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

// ローカル設定を保存（local-settings.jsonに保存）
export function saveLocalSettings(tokens: ManagedToken[]): void {
  try {
    // admin-config.jsonに保存（Thirdweb情報）
    const adminConfig: AdminConfiguration = {
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
      lastSync: new Date(),
      tokens: tokens.map(token => ({
        thirdweb: token.thirdweb,
        local: token.local, // 互換性のため残す
      })),
    };
    writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(adminConfig, replacer, 2));
    
    // local-settings.jsonに保存（ローカル設定）
    const localSettings: any = {
      defaultTokenId: 2, // デフォルト値、必要に応じて更新
      tokens: {},
      lastUpdated: new Date().toISOString(),
    };
    
    // 既存のlocal-settings.jsonがあれば読み込み
    if (existsSync(LOCAL_SETTINGS_PATH)) {
      try {
        const existing = JSON.parse(readFileSync(LOCAL_SETTINGS_PATH, 'utf-8'));
        localSettings.defaultTokenId = existing.defaultTokenId || 2;
      } catch (error) {
        console.error('Error reading existing local settings:', error);
      }
    }
    
    // トークン設定を追加
    tokens.forEach(token => {
      localSettings.tokens[token.local.tokenId] = {
        displayEnabled: token.local.displayEnabled,
        displayOrder: token.local.displayOrder,
        isDefaultDisplay: token.local.isDefaultDisplay,
        salesPeriodEnabled: token.local.salesPeriodEnabled,
        salesStartDate: token.local.salesStartDate,
        salesEndDate: token.local.salesEndDate,
        isUnlimited: token.local.isUnlimited,
        totalMinted: token.local.totalMinted,
      };
    });
    
    writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(localSettings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

// Thirdweb情報とローカル設定を統合
export function mergeTokenData(
  thirdwebTokens: ThirdwebTokenInfo[],
  localSettings: Map<number, LocalTokenSettings>
): ManagedToken[] {
  return thirdwebTokens.map(thirdwebToken => {
    const localSetting = localSettings.get(thirdwebToken.tokenId) || 
                        createDefaultLocalSettings(thirdwebToken.tokenId);
    
    return {
      thirdweb: thirdwebToken,
      local: {
        ...localSetting,
        lastSyncTime: new Date(),
      },
    };
  });
}

// 特定のトークンのローカル設定を更新
export function updateLocalSettings(
  tokenId: number,
  updates: Partial<LocalTokenSettings>
): void {
  const allSettings = loadLocalSettings();
  const currentSettings = allSettings.get(tokenId) || createDefaultLocalSettings(tokenId);
  
  allSettings.set(tokenId, {
    ...currentSettings,
    ...updates,
    tokenId, // tokenIdは変更不可
    lastSyncTime: new Date(),
  });
  
  // 保存（仮の実装、実際にはThirdweb情報も必要）
  const tokens: ManagedToken[] = Array.from(allSettings.entries()).map(([id, local]) => ({
    thirdweb: {
      tokenId: id,
      name: `Token #${id}`,
      totalSupply: 0n,
      claimConditionActive: false,
    },
    local,
  }));
  
  saveLocalSettings(tokens);
}