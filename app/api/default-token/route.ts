import { NextResponse } from 'next/server';
import { getMergedTokenConfigs } from '@/lib/localSettings';
import { isInSalesPeriod } from '@/lib/formatPrice';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(req: Request) {
  try {
    // default-token.jsonからdefaultTokenIdを取得（優先）
    const defaultTokenPath = join(process.cwd(), 'default-token.json');
    let defaultTokenId = 0;
    
    if (existsSync(defaultTokenPath)) {
      const defaultTokenData = JSON.parse(readFileSync(defaultTokenPath, 'utf-8'));
      defaultTokenId = defaultTokenData.tokenId ?? 0;
    } else {
      // default-token.jsonがない場合のみlocal-settings.jsonから取得
      const localSettingsPath = join(process.cwd(), 'local-settings.json');
      if (existsSync(localSettingsPath)) {
        const localSettings = JSON.parse(readFileSync(localSettingsPath, 'utf-8'));
        defaultTokenId = localSettings.defaultTokenId ?? 0;
      }
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
      
      if (inSalesPeriod && defaultToken.claimConditionActive) {
        return NextResponse.json({
          token: {
            tokenId: defaultToken.tokenId,
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
    
    // default-token.jsonを更新
    const defaultTokenPath = join(process.cwd(), 'default-token.json');
    writeFileSync(defaultTokenPath, JSON.stringify({ tokenId }, null, 2));
    
    return NextResponse.json({ success: true, tokenId });
  } catch (error) {
    console.error('Error updating default token:', error);
    return NextResponse.json(
      { error: 'Failed to update default token' },
      { status: 500 }
    );
  }
}