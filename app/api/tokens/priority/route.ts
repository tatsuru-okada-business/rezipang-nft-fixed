import { NextResponse } from 'next/server';
import { getMergedTokenConfigs, getDefaultToken } from '@/lib/localSettings';
import { getDefaultTokenId } from '@/lib/defaultToken';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { withCache } from '@/lib/cache';

// 優先度付きトークン取得API
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority') || 'default'; // default, recent, all
    
    const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');
    let recentTokenIds: number[] = [];
    
    // local-settings.jsonから最近アクセスしたトークンを取得
    if (existsSync(LOCAL_SETTINGS_PATH)) {
      const localSettings = JSON.parse(readFileSync(LOCAL_SETTINGS_PATH, 'utf-8'));
      // lastSyncTimeがあるものは最近アクセスされたトークン
      recentTokenIds = Object.entries(localSettings.tokens)
        .filter(([_, token]: [string, any]) => token.lastSyncTime)
        .map(([id, _]) => parseInt(id))
        .slice(0, 5); // 最大5個
    }
    
    // デフォルトトークンIDを高速取得
    const defaultTokenId = getDefaultTokenId();
    
    const mergedTokens = getMergedTokenConfigs();
    const enabledTokens = mergedTokens.filter(token => 
      token.displayEnabled && 
      !token.name.match(/^Token #\d+$/)
    );
    
    // デフォルトトークンを最優先
    const defaultToken = enabledTokens.find(t => t.tokenId === defaultTokenId) || 
                        enabledTokens.find(t => t.isDefaultDisplay);
    
    let result = {
      defaultToken: null as any,
      recentTokens: [] as any[],
      allTokens: [] as any[]
    };
    
    // デフォルトトークン
    if (defaultToken) {
      result.defaultToken = {
        id: defaultToken.tokenId,
        name: defaultToken.name,
        description: defaultToken.description,
        image: defaultToken.image,
        price: defaultToken.currentPrice,
        currency: defaultToken.currency,
        totalSupply: defaultToken.totalSupply,
        salesPeriodEnabled: defaultToken.salesPeriodEnabled,
        salesStartDate: defaultToken.salesStartDate,
        salesEndDate: defaultToken.salesEndDate,
        isUnlimited: defaultToken.isUnlimited,
      };
    }
    
    // 優先度に応じて返すデータを決定
    if (priority === 'default') {
      // デフォルトトークンのみ（最速）
      return NextResponse.json({ 
        defaultToken: result.defaultToken,
        hasMore: enabledTokens.length > 1
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      });
    }
    
    // 最近アクセスしたトークン
    if (recentTokenIds.length > 0 && priority === 'recent') {
      result.recentTokens = enabledTokens
        .filter(t => recentTokenIds.includes(t.tokenId) && t.tokenId !== defaultToken?.tokenId)
        .map(token => ({
          id: token.tokenId,
          name: token.name,
          description: token.description,
          image: token.image,
          price: token.currentPrice,
          currency: token.currency,
          totalSupply: token.totalSupply,
          salesPeriodEnabled: token.salesPeriodEnabled,
          salesStartDate: token.salesStartDate,
          salesEndDate: token.salesEndDate,
          isUnlimited: token.isUnlimited,
        }));
    }
    
    // 全トークン
    if (priority === 'all') {
      result.allTokens = enabledTokens
        .sort((a, b) => {
          // デフォルトを最初に
          if (a.isDefaultDisplay) return -1;
          if (b.isDefaultDisplay) return 1;
          // 最近アクセスしたものを優先
          const aRecent = recentTokenIds.indexOf(a.tokenId);
          const bRecent = recentTokenIds.indexOf(b.tokenId);
          if (aRecent !== -1 && bRecent === -1) return -1;
          if (aRecent === -1 && bRecent !== -1) return 1;
          if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
          // その他はID順
          return a.tokenId - b.tokenId;
        })
        .map(token => ({
          id: token.tokenId,
          name: token.name,
          description: token.description,
          image: token.image,
          price: token.currentPrice,
          currency: token.currency,
          totalSupply: token.totalSupply,
          salesPeriodEnabled: token.salesPeriodEnabled,
          salesStartDate: token.salesStartDate,
          salesEndDate: token.salesEndDate,
          isUnlimited: token.isUnlimited,
        }));
    }
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
    
  } catch (error) {
    console.error('Error loading priority tokens:', error);
    return NextResponse.json(
      { error: 'Failed to load tokens' },
      { status: 500 }
    );
  }
}