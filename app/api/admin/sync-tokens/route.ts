import { NextResponse } from 'next/server';
import { fetchAllTokensFromThirdweb } from '@/lib/thirdwebSync';
import { loadLocalSettings, mergeTokenData, saveLocalSettings } from '@/lib/localTokenSettings';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Thirdwebと同期して全トークン情報を取得
export async function GET(req: Request) {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address not configured' },
        { status: 500 }
      );
    }

    // Thirdwebから全トークン情報を取得
    const thirdwebTokens = await fetchAllTokensFromThirdweb(contractAddress);
    
    // ローカル設定を読み込み
    const localSettings = loadLocalSettings();
    
    // データを統合
    const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
    
    // 保存
    saveLocalSettings(managedTokens);
    
    // フィルタリング: クレーム条件が有効で汎用名でないトークンのみ
    const filteredTokens = managedTokens.filter(token => {
      return token.thirdweb.claimConditionActive && 
             !token.thirdweb.name.match(/^Token #\d+$/);
    });
    
    // デバッグ: フィルタリング後のトークン情報
    console.log('Filtered tokens count:', filteredTokens.length);
    filteredTokens.forEach(token => {
      console.log(`Token ${token.thirdweb.tokenId}:`, {
        name: token.thirdweb.name,
        hasImage: !!token.thirdweb.image,
        imageUrl: token.thirdweb.image?.substring(0, 50) + '...',
      });
    });
    
    // BigIntを文字列に変換してからJSONレスポンスを返す
    const serializedTokens = filteredTokens.map(token => ({
      ...token,
      thirdweb: {
        ...token.thirdweb,
        totalSupply: token.thirdweb.totalSupply?.toString() || '0',
      }
    }));
    
    // 同期後のdefaultTokenId検証
    // validateDefaultTokenAfterSync();
    
    return NextResponse.json({
      success: true,
      contractAddress,
      lastSync: new Date(),
      tokens: serializedTokens,
    });
  } catch (error) {
    console.error('Error syncing tokens:', error);
    return NextResponse.json(
      { error: 'Failed to sync tokens' },
      { status: 500 }
    );
  }
}

// ローカル設定を更新（高速版：Thirdwebの再取得なし）
export async function POST(req: Request) {
  try {
    const { tokenId, settings } = await req.json();
    
    if (tokenId === undefined || !settings) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // local-settings.jsonを直接更新（Thirdweb再取得なし）
    const localSettingsPath = join(process.cwd(), 'local-settings.json');
    let localSettingsData: any = {
      defaultTokenId: 2,
      tokens: {},
      lastUpdated: new Date().toISOString()
    };
    
    // 既存の設定を読み込み
    if (existsSync(localSettingsPath)) {
      const content = readFileSync(localSettingsPath, 'utf-8');
      localSettingsData = JSON.parse(content);
    }
    
    // 指定されたトークンのみ更新
    localSettingsData.tokens[tokenId] = {
      ...localSettingsData.tokens[tokenId] || {},
      ...settings,
      tokenId // tokenIdは保持
    };
    localSettingsData.lastUpdated = new Date().toISOString();
    
    // 保存
    writeFileSync(localSettingsPath, JSON.stringify(localSettingsData, null, 2));
    
    return NextResponse.json({
      success: true,
      tokenId,
      settings: localSettingsData.tokens[tokenId],
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}