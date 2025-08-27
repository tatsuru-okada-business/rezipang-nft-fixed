import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AdminConfiguration } from '@/lib/types/adminConfig';
import { withCache } from '@/lib/cache';

const CONFIG_FILE_PATH = join(process.cwd(), 'admin-config.json');

// 管理設定から表示可能なトークン情報を取得
export async function GET(req: Request) {
  try {
    if (!existsSync(CONFIG_FILE_PATH)) {
      return NextResponse.json({
        tokens: [],
        message: 'No admin configuration found'
      });
    }

    const content = readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const config: AdminConfiguration = JSON.parse(content);
    
    // displayEnabledがtrueかつclaimConditionActiveがtrueで、汎用名でないトークンのみ返す
    const visibleTokens = config.tokens
      .filter(token => 
        token.local.displayEnabled && 
        token.thirdweb.claimConditionActive &&
        !token.thirdweb.name.match(/^Token #\d+$/) // "Token #数字"の形式を除外
      )
      .sort((a, b) => a.local.displayOrder - b.local.displayOrder)
      .map(token => ({
        tokenId: token.thirdweb.tokenId,
        name: token.thirdweb.name,
        description: token.thirdweb.description,
        image: token.thirdweb.image,
        price: token.thirdweb.currentPrice,
        currency: token.thirdweb.currency,
        totalSupply: token.thirdweb.totalSupply,
        customDescription: token.local.customDescription,
        displayOrder: token.local.displayOrder,
        salesPeriodEnabled: token.local.salesPeriodEnabled,
        salesStartDate: token.local.salesStartDate,
        salesEndDate: token.local.salesEndDate,
        isUnlimited: token.local.isUnlimited,
      }));
    
    return NextResponse.json({
      tokens: visibleTokens,
      lastSync: config.lastSync,
    });
  } catch (error) {
    console.error('Error loading token settings:', error);
    return NextResponse.json(
      { error: 'Failed to load token settings' },
      { status: 500 }
    );
  }
}