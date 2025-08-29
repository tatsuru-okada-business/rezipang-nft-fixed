import { NextResponse } from 'next/server';
import { getMergedTokenConfigs } from '@/lib/localSettings';
import { isInSalesPeriod } from '@/lib/formatPrice';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(req: Request) {
  try {
    // settings.jsonからdefaultTokenIdを取得
    const settingsPath = join(process.cwd(), 'settings.json');
    let defaultTokenId = 0;
    
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      defaultTokenId = settings.defaultTokenId ?? 0;
    }
    
    const mergedTokens = getMergedTokenConfigs();
    const defaultToken = mergedTokens.find(t => t.tokenId === defaultTokenId);
    
    if (defaultToken) {
      // Check if token is in sales period
      const inSalesPeriod = !defaultToken.salesPeriodEnabled || isInSalesPeriod({
        salesPeriodEnabled: defaultToken.salesPeriodEnabled,
        salesStartDate: defaultToken.salesStartDate,
        salesEndDate: defaultToken.salesEndDate,
        isUnlimited: defaultToken.isUnlimited
      });
      
      // claimConditionActiveのチェックを削除またはdisplayEnabledをチェック
      if (inSalesPeriod && defaultToken.displayEnabled) {
        return NextResponse.json({
          token: {
            tokenId: defaultToken.tokenId,
            name: defaultToken.name,
            description: defaultToken.description,
            image: defaultToken.image,
            price: defaultToken.price || defaultToken.currentPrice,
            currency: defaultToken.currency,
            totalSupply: defaultToken.totalSupply,
            salesPeriodEnabled: defaultToken.salesPeriodEnabled,
            salesStartDate: defaultToken.salesStartDate,
            salesEndDate: defaultToken.salesEndDate,
            isUnlimited: defaultToken.isUnlimited,
          }
        });
      }
    }
    
    return NextResponse.json({
      token: null,
      message: 'No default token available'
    });
  } catch (error) {
    console.error('Error loading default token:', error);
    return NextResponse.json(
      { error: 'Failed to load default token' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tokenId } = body;
    
    if (tokenId === undefined || tokenId === null) {
      return NextResponse.json(
        { error: 'tokenId is required' },
        { status: 400 }
      );
    }
    
    // settings.jsonを更新
    const settingsPath = join(process.cwd(), 'settings.json');
    let settings = { tokens: {}, defaultTokenId: 0 };
    
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    }
    
    settings.defaultTokenId = tokenId;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    
    return NextResponse.json({ success: true, tokenId });
  } catch (error) {
    console.error('Error updating default token:', error);
    return NextResponse.json(
      { error: 'Failed to update default token' },
      { status: 500 }
    );
  }
}