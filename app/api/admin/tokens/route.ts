import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // tokens-cache.jsonとsettings.jsonから読み込み
    const tokensCachePath = join(process.cwd(), 'tokens-cache.json');
    const settingsPath = join(process.cwd(), 'settings.json');
    
    if (!existsSync(tokensCachePath)) {
      return NextResponse.json({
        tokens: [],
        lastSync: null
      });
    }
    
    const tokensCache = JSON.parse(readFileSync(tokensCachePath, 'utf-8'));
    let settings: any = {};
    
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
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