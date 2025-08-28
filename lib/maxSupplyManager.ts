/**
 * NFT最大発行数管理機能
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');

export interface MaxSupplyConfig {
  tokenId: number;
  maxSupply?: number;         // 最大発行数（未設定 = 無制限）
  reservedSupply?: number;    // 運営予約分
  publicMaxSupply?: number;   // 一般販売可能数
  currentMinted: number;      // 現在のミント済み数
  remainingSupply?: number;   // 残り販売可能数
  soldOut: boolean;          // 売り切れフラグ
  soldOutMessage?: string;   // 売り切れ時のメッセージ
}

/**
 * トークンの最大発行数設定を取得
 */
export function getMaxSupplyConfig(tokenId: number): MaxSupplyConfig | null {
  try {
    if (!existsSync(LOCAL_SETTINGS_PATH)) {
      return null;
    }

    const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(content);
    const tokenConfig = settings.tokens?.[tokenId.toString()];

    if (!tokenConfig) {
      return null;
    }

    // 無制限の場合は制限なしとして扱う
    if (tokenConfig.isUnlimited === true) {
      return null; // nullは無制限を意味する
    }

    const maxSupply = tokenConfig.maxSupply;
    const reservedSupply = tokenConfig.reservedSupply || 0;
    const currentMinted = tokenConfig.totalMinted || 0;
    const publicMaxSupply = maxSupply ? maxSupply - reservedSupply : undefined;
    const remainingSupply = publicMaxSupply ? publicMaxSupply - currentMinted : undefined;
    const soldOut = remainingSupply !== undefined && remainingSupply <= 0;

    return {
      tokenId,
      maxSupply,
      reservedSupply,
      publicMaxSupply,
      currentMinted,
      remainingSupply,
      soldOut,
      soldOutMessage: tokenConfig.soldOutMessage
    };
  } catch (error) {
    console.error('Error getting max supply config:', error);
    return null;
  }
}

/**
 * トークンの最大発行数を設定
 */
export function setMaxSupply(
  tokenId: number, 
  maxSupply: number | undefined,
  reservedSupply: number = 0
): boolean {
  try {
    if (!existsSync(LOCAL_SETTINGS_PATH)) {
      return false;
    }

    const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(content);

    if (!settings.tokens) {
      settings.tokens = {};
    }

    if (!settings.tokens[tokenId.toString()]) {
      settings.tokens[tokenId.toString()] = {};
    }

    const tokenConfig = settings.tokens[tokenId.toString()];
    
    if (maxSupply === undefined) {
      // 無制限に設定
      delete tokenConfig.maxSupply;
      delete tokenConfig.reservedSupply;
      tokenConfig.isUnlimited = true;
    } else {
      // 発行上限を設定
      tokenConfig.maxSupply = maxSupply;
      tokenConfig.reservedSupply = reservedSupply;
      tokenConfig.isUnlimited = false;
    }

    settings.lastUpdated = new Date().toISOString();
    writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 2));

    return true;
  } catch (error) {
    console.error('Error setting max supply:', error);
    return false;
  }
}

/**
 * ミント可能かどうかをチェック
 */
export function canMint(tokenId: number, quantity: number = 1): {
  canMint: boolean;
  reason?: string;
  remainingSupply?: number;
} {
  const config = getMaxSupplyConfig(tokenId);
  
  if (!config) {
    return { canMint: true }; // 設定がない場合は無制限
  }

  if (config.soldOut) {
    return {
      canMint: false,
      reason: config.soldOutMessage || '売り切れました',
      remainingSupply: 0
    };
  }

  if (config.remainingSupply !== undefined) {
    if (quantity > config.remainingSupply) {
      return {
        canMint: false,
        reason: `残り${config.remainingSupply}個のみ販売可能です`,
        remainingSupply: config.remainingSupply
      };
    }
  }

  return {
    canMint: true,
    remainingSupply: config.remainingSupply
  };
}

/**
 * ミント成功後に在庫を更新
 */
export function updateMintedCount(tokenId: number, quantity: number = 1): boolean {
  try {
    if (!existsSync(LOCAL_SETTINGS_PATH)) {
      return false;
    }

    const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(content);

    if (!settings.tokens?.[tokenId.toString()]) {
      return false;
    }

    const tokenConfig = settings.tokens[tokenId.toString()];
    tokenConfig.totalMinted = (tokenConfig.totalMinted || 0) + quantity;
    
    // 売り切れチェック
    if (tokenConfig.maxSupply) {
      const publicMax = tokenConfig.maxSupply - (tokenConfig.reservedSupply || 0);
      if (tokenConfig.totalMinted >= publicMax) {
        tokenConfig.soldOut = true;
      }
    }

    settings.lastUpdated = new Date().toISOString();
    writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 2));

    return true;
  } catch (error) {
    console.error('Error updating minted count:', error);
    return false;
  }
}

/**
 * 在庫状況の表示用テキストを生成
 */
export function getSupplyStatusText(
  tokenId: number,
  locale: 'ja' | 'en' = 'ja'
): string {
  const config = getMaxSupplyConfig(tokenId);
  
  if (!config || !config.maxSupply) {
    return ''; // 無制限の場合は表示なし
  }

  if (config.soldOut) {
    return locale === 'ja' ? '🚫 売り切れ' : '🚫 Sold Out';
  }

  if (config.remainingSupply !== undefined) {
    if (config.remainingSupply <= 10) {
      return locale === 'ja' 
        ? `⚠️ 残りわずか (${config.remainingSupply}個)` 
        : `⚠️ Limited Stock (${config.remainingSupply} left)`;
    }
    
    return locale === 'ja'
      ? `残り ${config.remainingSupply} / ${config.publicMaxSupply} 個`
      : `${config.remainingSupply} / ${config.publicMaxSupply} remaining`;
  }

  return '';
}