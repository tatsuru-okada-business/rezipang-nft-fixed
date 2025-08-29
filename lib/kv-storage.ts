// Vercel KVまたはRedisを使用
import { createClient } from 'redis';

// Redis/KVクライアントの初期化
const getRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  
  if (!redisUrl) {
    console.log('Redis/KV not configured');
    return null;
  }
  
  try {
    const client = createClient({
      url: redisUrl
    });
    
    await client.connect();
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return null;
  }
};

// KVストレージのキー定義
export const KV_KEYS = {
  TOKENS_CACHE: 'tokens-cache',
  SETTINGS: 'settings',
  ADMIN_CONFIG: 'admin-config',
  LOCAL_SETTINGS: 'local-settings',
  ALLOWLIST: 'allowlist'
} as const;

// トークンキャッシュの取得
export async function getTokensCache(): Promise<any | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const data = await client.get(KV_KEYS.TOKENS_CACHE);
    await client.disconnect();
    
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get tokens cache from KV:', error);
    return null;
  }
}

// トークンキャッシュの保存
export async function setTokensCache(data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.set(KV_KEYS.TOKENS_CACHE, JSON.stringify(data));
    await client.disconnect();
    
    return true;
  } catch (error) {
    console.error('Failed to set tokens cache to KV:', error);
    return false;
  }
}

// 設定の取得
export async function getSettings() {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const data = await client.get(KV_KEYS.SETTINGS);
    await client.disconnect();
    
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get settings from KV:', error);
    return null;
  }
}

// 設定の保存
export async function setSettings(data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.set(KV_KEYS.SETTINGS, JSON.stringify(data));
    await client.disconnect();
    
    return true;
  } catch (error) {
    console.error('Failed to set settings to KV:', error);
    return false;
  }
}

// 管理設定の取得
export async function getAdminConfig() {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const data = await client.get(KV_KEYS.ADMIN_CONFIG);
    await client.disconnect();
    
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get admin config from KV:', error);
    return null;
  }
}

// 管理設定の保存
export async function setAdminConfig(data: any) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.set(KV_KEYS.ADMIN_CONFIG, JSON.stringify(data));
    await client.disconnect();
    
    return true;
  } catch (error) {
    console.error('Failed to set admin config to KV:', error);
    return false;
  }
}

// アローリストの取得
export async function getAllowlist(): Promise<string | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const data = await client.get(KV_KEYS.ALLOWLIST);
    await client.disconnect();
    
    return data;
  } catch (error) {
    console.error('Failed to get allowlist from KV:', error);
    return null;
  }
}

// アローリストの保存
export async function setAllowlist(data: string) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.set(KV_KEYS.ALLOWLIST, data);
    await client.disconnect();
    
    return true;
  } catch (error) {
    console.error('Failed to set allowlist to KV:', error);
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
    
    // allowlist.csvを移行
    const allowlistPath = path.join(process.cwd(), 'allowlist.csv');
    if (fs.existsSync(allowlistPath)) {
      const data = fs.readFileSync(allowlistPath, 'utf-8');
      await setAllowlist(data);
      console.log('Migrated allowlist.csv to KV');
    }
    
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}