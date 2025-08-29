import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LocalTokenSettings, ManagedToken, AdminConfiguration } from './types/adminConfig';
import type { ThirdwebTokenInfo } from './types/adminConfig';
import { fetchAllTokensFromThirdweb, syncSingleToken } from './thirdwebSync';

const ADMIN_CONFIG_PATH = join(process.cwd(), 'admin-config.json');
const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');

// デフォルトのローカル設定を作成
function createDefaultLocalSettings(tokenId: number): LocalTokenSettings {
  return {
    tokenId,
    displayEnabled: true,
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
      defaultTokenId: 0, // デフォルト値は0番
      tokens: {},
      lastUpdated: new Date().toISOString(),
    };
    
    // 既存のlocal-settings.jsonがあれば読み込み
    if (existsSync(LOCAL_SETTINGS_PATH)) {
      try {
        const existing = JSON.parse(readFileSync(LOCAL_SETTINGS_PATH, 'utf-8'));
        localSettings.defaultTokenId = existing.defaultTokenId !== undefined ? existing.defaultTokenId : 0;
      } catch (error) {
        console.error('Error reading existing local settings:', error);
      }
    }
    
    // トークン設定を追加
    tokens.forEach(token => {
      localSettings.tokens[token.local.tokenId] = {
        displayEnabled: token.local.displayEnabled,
        displayOrder: token.local.displayOrder,
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
    
    // maxPerWallet調整ロジック
    let adjustedMaxPerWallet = localSetting.maxPerWallet;
    const hasAllowlist = thirdwebToken.merkleRoot && 
                        thirdwebToken.merkleRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    if (hasAllowlist) {
      // アローリスト設定時はThirdwebの値を使用（ローカル設定を無視）
      console.log(`Token ${thirdwebToken.tokenId}: アローリスト設定のため、maxPerWalletをThirdweb値（${thirdwebToken.maxPerWallet}）に設定`);
      adjustedMaxPerWallet = undefined; // undefinedにしてThirdweb値を使用
    } else if (adjustedMaxPerWallet !== undefined && 
               thirdwebToken.maxPerWallet && 
               adjustedMaxPerWallet > thirdwebToken.maxPerWallet) {
      // ローカル設定がThirdweb制限を超えている場合は調整
      console.log(`Token ${thirdwebToken.tokenId}: maxPerWallet調整 ${adjustedMaxPerWallet} → ${thirdwebToken.maxPerWallet}`);
      adjustedMaxPerWallet = thirdwebToken.maxPerWallet;
    }
    
    return {
      thirdweb: thirdwebToken,
      local: {
        ...localSetting,
        maxPerWallet: adjustedMaxPerWallet,
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

// Thirdwebと完全同期する関数
export async function syncWithThirdweb(
  contractAddress?: string,
  options?: {
    maxTokens?: number;
    forceUpdate?: boolean;
  }
): Promise<{
  success: boolean;
  tokens?: ManagedToken[];
  error?: string;
  tokensSynced?: number;
  tokensUpdated?: number;
}> {
  try {
    const address = contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    
    if (!address) {
      return {
        success: false,
        error: 'Contract address not configured'
      };
    }

    console.log(`Starting sync with Thirdweb for contract: ${address}`);
    
    // Thirdwebから全トークン情報を取得（エラーハンドリング付き）
    let thirdwebTokens: ThirdwebTokenInfo[];
    try {
      thirdwebTokens = await fetchAllTokensFromThirdweb(
        address,
        options?.maxTokens || 100
      );
    } catch (error) {
      console.error('Failed to fetch tokens from Thirdweb:', error);
      return {
        success: false,
        error: `Thirdweb sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    if (!thirdwebTokens || thirdwebTokens.length === 0) {
      return {
        success: false,
        error: 'No tokens found in contract'
      };
    }

    // 既存のローカル設定を読み込み
    const localSettings = loadLocalSettings();
    
    // データを統合
    const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
    
    // 保存
    saveLocalSettings(managedTokens);
    
    // 統計情報
    const tokensUpdated = thirdwebTokens.filter(token => 
      localSettings.has(token.tokenId)
    ).length;
    
    console.log(`Sync completed: ${thirdwebTokens.length} tokens synced, ${tokensUpdated} updated`);
    
    return {
      success: true,
      tokens: managedTokens,
      tokensSynced: thirdwebTokens.length,
      tokensUpdated
    };
  } catch (error) {
    console.error('Unexpected error during sync:', error);
    return {
      success: false,
      error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 特定のトークンのみ同期
export async function syncSingleTokenWithThirdweb(
  tokenId: number,
  contractAddress?: string
): Promise<{
  success: boolean;
  token?: ManagedToken;
  error?: string;
}> {
  try {
    const address = contractAddress || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    
    if (!address) {
      return {
        success: false,
        error: 'Contract address not configured'
      };
    }

    // Thirdwebから単一トークン情報を取得
    const thirdwebToken = await syncSingleToken(address, tokenId);
    
    if (!thirdwebToken) {
      return {
        success: false,
        error: `Token ${tokenId} not found`
      };
    }

    // 既存のローカル設定を読み込み
    const localSettings = loadLocalSettings();
    const localSetting = localSettings.get(tokenId) || createDefaultLocalSettings(tokenId);
    
    // トークンデータを統合
    const managedToken: ManagedToken = {
      thirdweb: thirdwebToken,
      local: {
        ...localSetting,
        lastSyncTime: new Date(),
      },
    };

    // 全トークンリストを更新
    const allTokens = Array.from(localSettings.entries()).map(([id, local]) => {
      if (id === tokenId) {
        return managedToken;
      }
      // 他のトークンは既存のデータを保持（Thirdweb情報なしの場合はダミーデータ）
      return {
        thirdweb: {
          tokenId: id,
          name: `Token #${id}`,
          totalSupply: 0n,
          claimConditionActive: false,
        },
        local,
      } as ManagedToken;
    });

    // 新規トークンの場合は追加
    if (!localSettings.has(tokenId)) {
      allTokens.push(managedToken);
    }

    saveLocalSettings(allTokens);
    
    return {
      success: true,
      token: managedToken
    };
  } catch (error) {
    console.error(`Failed to sync token ${tokenId}:`, error);
    return {
      success: false,
      error: `Failed to sync token: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}