import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getTokensCache, getSettings } from '@/lib/kv-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // KVから読み込み（フォールバック：ローカルファイル）
    let tokensCache = await getTokensCache();
    let settings = await getSettings();
    
    // KVにデータがない場合はローカルファイルから読み込み
    if (!tokensCache) {
      const tokensCachePath = join(process.cwd(), 'tokens-cache.json');
      if (!existsSync(tokensCachePath)) {
        return NextResponse.json({
          tokens: [],
          lastSync: null
        });
      }
      tokensCache = JSON.parse(readFileSync(tokensCachePath, 'utf-8'));
    }
    
    if (!settings) {
      const settingsPath = join(process.cwd(), 'settings.json');
      if (existsSync(settingsPath)) {
        settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      } else {
        settings = {};
      }
    }
    
    // tokens-cacheとsettingsをマージして返す
    const mergedTokens = tokensCache.tokens.map((token: any) => {
      const tokenSettings = settings.tokens?.[token.tokenId] || {};
      return {
        thirdweb: token,
        local: {
          tokenId: token.tokenId,
          displayEnabled: tokenSettings.displayEnabled ?? true,
          displayOrder: tokenSettings.displayOrder ?? token.tokenId,
          salesPeriodEnabled: tokenSettings.salesPeriodEnabled ?? false,
          isUnlimited: tokenSettings.isUnlimited ?? true,
          totalMinted: tokenSettings.totalMinted ?? 0,
          lastSyncTime: tokensCache.lastSync,
          ...tokenSettings
        }
      };
    });
    
    // Token #Xを除外したトークンのみ返す
    const filteredTokens = mergedTokens.filter((token: any) => {
      return token?.thirdweb?.name && !token.thirdweb.name.match(/^Token #\d+$/);
    });
    
    return NextResponse.json({
      tokens: filteredTokens,
      lastSync: tokensCache.lastSync,
      contractAddress: tokensCache.contractAddress
    });
    
  } catch (error) {
    console.error('Error fetching admin tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}