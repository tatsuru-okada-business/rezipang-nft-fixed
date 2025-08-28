/**
 * 統一されたトークン管理システム
 * Single Source of Truth: local-settings.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { MergedTokenConfig } from './types/localSettings';
import { getMergedTokenConfigs, loadLocalSettings, saveLocalSettings } from './localSettings';

const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');
const DEFAULT_TOKEN_CACHE_PATH = join(process.cwd(), 'default-token.json');
const ADMIN_CONFIG_PATH = join(process.cwd(), 'admin-config.json');

/**
 * デフォルトトークンIDを取得（検証付き）
 */
export function getValidDefaultTokenId(): number {
  const settings = loadLocalSettings();
  const mergedTokens = getMergedTokenConfigs();
  
  // 設定されているdefaultTokenIdが有効か確認
  if (settings?.defaultTokenId !== undefined) {
    const tokenExists = mergedTokens.some(t => t.tokenId === settings.defaultTokenId);
    if (tokenExists) {
      return settings.defaultTokenId;
    }
    console.warn(`Default token ID ${settings.defaultTokenId} does not exist. Finding alternative...`);
  }
  
  // default-token.jsonから読み込む
  try {
    const defaultData = JSON.parse(readFileSync(DEFAULT_TOKEN_CACHE_PATH, 'utf-8'));
    if (defaultData.tokenId !== undefined) {
      const tokenExists = mergedTokens.some(t => t.tokenId === defaultData.tokenId);
      if (tokenExists) {
        console.log(`Using token ${defaultData.tokenId} from default-token.json`);
        return defaultData.tokenId;
      }
    }
  } catch (error) {
    // File doesn't exist or is invalid
  }
  
  // 表示可能な最初のトークンを使用
  const firstEnabledToken = mergedTokens.find(t => t.displayEnabled);
  if (firstEnabledToken) {
    console.log(`Using first enabled token ${firstEnabledToken.tokenId}`);
    return firstEnabledToken.tokenId;
  }
  
  // フォールバック: 最初のトークン
  if (mergedTokens.length > 0) {
    console.log(`Using first available token ${mergedTokens[0].tokenId}`);
    return mergedTokens[0].tokenId;
  }
  
  // デフォルト値
  console.warn('No tokens available, using default value 0');
  return 0;
}

/**
 * デフォルトトークンを設定（全ファイル同期）
 */
export function setUnifiedDefaultToken(tokenId: number): void {
  const mergedTokens = getMergedTokenConfigs();
  
  // トークンの存在確認
  const tokenExists = mergedTokens.some(t => t.tokenId === tokenId);
  if (!tokenExists) {
    throw new Error(`Token ID ${tokenId} does not exist`);
  }
  
  // 1. local-settings.jsonを更新
  const settings = loadLocalSettings() || {
    defaultTokenId: tokenId,
    tokens: {},
    lastUpdated: new Date().toISOString(),
  };
  
  // defaultTokenIdを更新
  settings.defaultTokenId = tokenId;
  
  // tokenエントリがなければ作成
  if (!settings.tokens[tokenId.toString()]) {
    settings.tokens[tokenId.toString()] = {
      displayEnabled: true,
      displayOrder: tokenId,
    };
  }
  
  settings.lastUpdated = new Date().toISOString();
  saveLocalSettings(settings);
  
  // 2. default-token.jsonを更新（キャッシュ）
  try {
    const defaultTokenData = {
      tokenId: tokenId,
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(DEFAULT_TOKEN_CACHE_PATH, JSON.stringify(defaultTokenData, null, 2));
  } catch (error) {
    console.warn('Failed to update default-token.json cache:', error);
  }
  
  // 3. admin-config.jsonは更新不要（isDefaultDisplayを使用しない）
  
  console.log(`Successfully set default token to ${tokenId} across all systems`);
}

/**
 * defaultTokenIdの整合性を検証・修正
 */
export function validateAndFixDefaultToken(): number {
  const validTokenId = getValidDefaultTokenId();
  const settings = loadLocalSettings();
  
  // 現在の設定と異なる場合は修正
  if (settings?.defaultTokenId !== validTokenId) {
    console.log(`Fixing default token ID from ${settings?.defaultTokenId} to ${validTokenId}`);
    setUnifiedDefaultToken(validTokenId);
  }
  
  return validTokenId;
}

/**
 * Thirdweb同期後のdefaultTokenId検証
 */
export function validateDefaultTokenAfterSync(): void {
  const settings = loadLocalSettings();
  if (!settings) return;
  
  const mergedTokens = getMergedTokenConfigs();
  const currentDefaultId = settings.defaultTokenId;
  
  // 現在のdefaultTokenIdが有効か確認
  const stillExists = mergedTokens.some(t => t.tokenId === currentDefaultId);
  
  if (!stillExists) {
    console.warn(`Default token ${currentDefaultId} no longer exists after sync`);
    const newDefaultId = getValidDefaultTokenId();
    setUnifiedDefaultToken(newDefaultId);
  } else {
    // キャッシュファイルの同期確認
    try {
      if (existsSync(DEFAULT_TOKEN_CACHE_PATH)) {
        const cache = JSON.parse(readFileSync(DEFAULT_TOKEN_CACHE_PATH, 'utf-8'));
        if (cache.tokenId !== currentDefaultId) {
          console.log('Syncing default-token.json cache');
          writeFileSync(DEFAULT_TOKEN_CACHE_PATH, JSON.stringify({
            tokenId: currentDefaultId,
            lastUpdated: new Date().toISOString(),
          }, null, 2));
        }
      }
    } catch (error) {
      console.warn('Failed to sync cache:', error);
    }
  }
}

/**
 * 初期化時の検証
 */
export function initializeTokenManager(): void {
  console.log('Initializing token manager...');
  
  // local-settings.jsonが存在しない場合は作成
  if (!existsSync(LOCAL_SETTINGS_PATH)) {
    const initialSettings = {
      defaultTokenId: 0,
      tokens: {},
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(initialSettings, null, 2));
    console.log('Created initial local-settings.json');
  }
  
  // defaultTokenIdの妥当性チェック
  validateAndFixDefaultToken();
  console.log('Token manager initialized successfully');
}