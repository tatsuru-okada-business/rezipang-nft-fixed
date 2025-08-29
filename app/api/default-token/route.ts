import { NextResponse } from 'next/server';
import { getMergedTokenConfigs } from '@/lib/localSettings';
import { isInSalesPeriod } from '@/lib/formatPrice';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getSettings, setSettings } from '@/lib/kv-storage';

export async function GET() {
  try {
    // KVまたはsettings.jsonからdefaultTokenIdを取得
    let defaultTokenId = 0;
    
    // KVから取得
    const kvSettings = await getSettings();
    if (kvSettings && kvSettings.defaultTokenId !== undefined) {
      defaultTokenId = kvSettings.defaultTokenId;
    } else {
      // フォールバック：ローカルファイル
      const settingsPath = join(process.cwd(), 'settings.json');
      if (existsSync(settingsPath)) {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        defaultTokenId = settings.defaultTokenId ?? 0;
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
    
    // KVに保存（フォールバック：ローカルファイル）
    let settings = await getSettings() || { tokens: {}, defaultTokenId: 0 };
    settings.defaultTokenId = tokenId;
    
    const success = await setSettings(settings);
    
    // KVへの保存が失敗した場合、ローカルファイルに保存（開発環境のみ）
    if (!success && process.env.NODE_ENV === 'development') {
      const settingsPath = join(process.cwd(), 'settings.json');
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }
    
    return NextResponse.json({ success: true, tokenId });
  } catch (error) {
    console.error('Error updating default token:', error);
    return NextResponse.json(
      { error: 'Failed to update default token' },
      { status: 500 }
    );
  }
}