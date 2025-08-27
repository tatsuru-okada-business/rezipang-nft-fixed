import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { SaleConfig, ClaimCondition, UserClaimInfo } from './types/saleConfig';

const CONFIG_FILE_PATH = join(process.cwd(), 'sale-config.json');

export function getSaleConfigs(): SaleConfig[] {
  if (!existsSync(CONFIG_FILE_PATH)) {
    return getDefaultSaleConfigs();
  }

  try {
    const content = readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const configs = JSON.parse(content);
    
    return configs.map((config: any) => ({
      ...config,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt),
      conditions: config.conditions.map((condition: any) => ({
        ...condition,
        startTime: new Date(condition.startTime),
        endTime: condition.endTime ? new Date(condition.endTime) : undefined,
      })),
    }));
  } catch (error) {
    console.error('Error reading sale config:', error);
    return getDefaultSaleConfigs();
  }
}

export function saveSaleConfigs(configs: SaleConfig[]): void {
  try {
    writeFileSync(CONFIG_FILE_PATH, JSON.stringify(configs, null, 2));
    
    // local-settings.jsonのlastUpdatedも更新してクライアント側に変更を通知
    const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');
    if (existsSync(LOCAL_SETTINGS_PATH)) {
      try {
        const localSettings = JSON.parse(readFileSync(LOCAL_SETTINGS_PATH, 'utf-8'));
        localSettings.lastUpdated = new Date().toISOString();
        writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(localSettings, null, 2));
      } catch (error) {
        console.error('Error updating local settings timestamp:', error);
      }
    }
  } catch (error) {
    console.error('Error saving sale config:', error);
    throw error;
  }
}

export function getDefaultSaleConfigs(): SaleConfig[] {
  // These values are now managed through admin panel
  // This function is kept for backward compatibility but returns empty array
  return [];
}

export function getUserClaimInfo(
  address: string,
  tokenId: number,
  allowlist: Map<string, number>, // CSV allowlist (not used for now)
  userMintedCount: number = 0,
  hasThirdwebAllowlist: boolean = false // Thirdweb contract has merkle root
): UserClaimInfo {
  const configs = getSaleConfigs();
  const config = configs.find(c => c.tokenId === tokenId && c.isActive);

  if (!config) {
    return {
      address,
      isAllowlisted: false,
      maxMintAmount: 0,
      currentPrice: '0',
      currency: 'MATIC',
      availableSupply: 0,
      userMinted: userMintedCount,
      canMint: false,
      saleActive: false,
      reason: 'Sale not found or inactive',
    };
  }

  const now = new Date();
  const activeCondition = config.conditions.find(condition => {
    const isStarted = condition.startTime <= now;
    const isNotEnded = !condition.endTime || condition.endTime > now;
    return isStarted && isNotEnded;
  });

  if (!activeCondition) {
    const futureCondition = config.conditions.find(c => c.startTime > now);
    return {
      address,
      isAllowlisted: false,
      maxMintAmount: 0,
      currentPrice: '0',
      currency: 'MATIC',
      availableSupply: config.totalSupply - config.currentSupply,
      userMinted: userMintedCount,
      canMint: false,
      saleActive: false,
      saleStartTime: futureCondition?.startTime,
      reason: futureCondition ? 'Sale has not started yet' : 'Sale has ended',
    };
  }

  const normalizedAddress = address.toLowerCase();
  
  // For Thirdweb contract allowlist (merkle root based)
  // If hasThirdwebAllowlist is true, we need to verify through the contract
  // For now, we'll treat it as a public sale if no Thirdweb allowlist
  const isAllowlisted = !hasThirdwebAllowlist; // If no merkle root, everyone can mint
  
  // Max mint amount from the condition
  const maxMintAmount = activeCondition.maxPerWallet || 10;

  const availableSupply = activeCondition.maxSupply 
    ? Math.min(activeCondition.maxSupply, config.totalSupply - config.currentSupply)
    : config.totalSupply - config.currentSupply;

  const remainingForUser = Math.max(0, maxMintAmount - userMintedCount);
  const canMintAmount = Math.min(remainingForUser, availableSupply);

  return {
    address,
    isAllowlisted: isAllowlisted,
    maxMintAmount: canMintAmount,
    currentPrice: activeCondition.price,
    currency: activeCondition.currency,
    availableSupply,
    userMinted: userMintedCount,
    canMint: canMintAmount > 0 && isAllowlisted,
    saleActive: true,
    saleStartTime: activeCondition.startTime,
    saleEndTime: activeCondition.endTime,
    reason: canMintAmount === 0 
      ? (userMintedCount >= maxMintAmount ? 'Maximum mint amount reached' : 'No supply available')
      : undefined,
  };
}

export function updateSupply(tokenId: number, amount: number): void {
  const configs = getSaleConfigs();
  const configIndex = configs.findIndex(c => c.tokenId === tokenId);
  
  if (configIndex >= 0) {
    configs[configIndex].currentSupply += amount;
    configs[configIndex].updatedAt = new Date();
    saveSaleConfigs(configs);
  }
}