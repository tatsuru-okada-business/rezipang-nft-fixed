import { kv } from '@vercel/kv';

// KVストレージのキー定義
export const KV_KEYS = {
  TOKENS_CACHE: 'tokens-cache',
  SETTINGS: 'settings',
  ADMIN_CONFIG: 'admin-config',
  LOCAL_SETTINGS: 'local-settings'
} as const;

// トークンキャッシュの取得
export async function getTokensCache(): Promise<any | null> {
  try {
    const data = await kv.get(KV_KEYS.TOKENS_CACHE);
    return data || null;
  } catch (error) {
    console.error('Failed to get tokens cache from KV:', error);
    return null;
  }
}

// トークンキャッシュの保存
export async function setTokensCache(data: any) {
  try {
    await kv.set(KV_KEYS.TOKENS_CACHE, data);
    return true;
  } catch (error) {
    console.error('Failed to set tokens cache to KV:', error);
    return false;
  }
}

// 設定の取得
export async function getSettings() {
  try {
    const data = await kv.get(KV_KEYS.SETTINGS);
    return data || null;
  } catch (error) {
    console.error('Failed to get settings from KV:', error);
    return null;
  }
}

// 設定の保存
export async function setSettings(data: any) {
  try {
    await kv.set(KV_KEYS.SETTINGS, data);
    return true;
  } catch (error) {
    console.error('Failed to set settings to KV:', error);
    return false;
  }
}

// 管理設定の取得
export async function getAdminConfig() {
  try {
    const data = await kv.get(KV_KEYS.ADMIN_CONFIG);
    return data || null;
  } catch (error) {
    console.error('Failed to get admin config from KV:', error);
    return null;
  }
}

// 管理設定の保存
export async function setAdminConfig(data: any) {
  try {
    await kv.set(KV_KEYS.ADMIN_CONFIG, data);
    return true;
  } catch (error) {
    console.error('Failed to set admin config to KV:', error);
    return false;
  }
}

// 初期データの移行（ファイルからKVへ）
export async function migrateToKV() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // tokens-cache.jsonを移行
    const tokensCachePath = path.join(process.cwd(), 'tokens-cache.json');
    if (fs.existsSync(tokensCachePath)) {
      const data = JSON.parse(fs.readFileSync(tokensCachePath, 'utf-8'));
      await setTokensCache(data);
      console.log('Migrated tokens-cache.json to KV');
    }
    
    // settings.jsonを移行
    const settingsPath = path.join(process.cwd(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      await setSettings(data);
      console.log('Migrated settings.json to KV');
    }
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}