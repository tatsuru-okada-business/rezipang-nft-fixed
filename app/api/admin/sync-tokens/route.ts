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
    
    // ローカル設定を読み込み（エラーハンドリング付き）
    let localSettings;
    try {
      localSettings = loadLocalSettings();
    } catch (error) {
      console.error('Failed to load local settings:', error);
      // 空のMapを返す
      localSettings = new Map();
    }
    
    // データを統合
    const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
    
    // Vercel環境ではファイル書き込みができないため、
    // ローカル開発環境でのみ保存を試みる
    if (process.env.NODE_ENV === 'development') {
      try {
        saveLocalSettings(managedTokens);
      } catch (error) {
        console.error('Failed to save settings (expected in production):', error);
      }
    }
    
    // フィルタリング: 汎用名でないトークンのみ
    const filteredTokens = managedTokens.filter(token => {
      return !token.thirdweb.name.match(/^Token #\d+$/);
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
    const body = await req.json();
    const { tokenId, settings } = body;
    
    // 同期リクエストの場合（tokenIdがない場合）
    if (tokenId === undefined && !settings) {
      // Thirdwebから全トークン情報を取得
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress) {
        return NextResponse.json({ error: 'Contract address not configured' }, { status: 500 });
      }
      
      const thirdwebTokens = await fetchAllTokensFromThirdweb(contractAddress);
      
      // Thirdwebからトークンが取得できない場合はエラーを返す（設定をリセットしない）
      if (thirdwebTokens.length === 0) {
        console.warn('No tokens fetched from Thirdweb, keeping existing configuration');
        // 既存の設定を読み込んで返す
        const adminConfigPath = join(process.cwd(), 'admin-config.json');
        if (existsSync(adminConfigPath)) {
          const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
          return NextResponse.json({
            success: false,
            error: 'No tokens fetched from Thirdweb. Keeping existing configuration.',
            tokens: adminConfig.tokens || [],
            tokensSynced: 0
          });
        }
      }
      
      const localSettings = loadLocalSettings();
      const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
      saveLocalSettings(managedTokens);
      
      // admin-config.jsonに同期時刻を記録
      const adminConfigPath = join(process.cwd(), 'admin-config.json');
      const adminConfig = existsSync(adminConfigPath) 
        ? JSON.parse(readFileSync(adminConfigPath, 'utf-8'))
        : {};
      adminConfig.lastSync = new Date().toISOString();
      adminConfig.initialized = true;
      writeFileSync(adminConfigPath, JSON.stringify(adminConfig, null, 2));
      
      const filteredTokens = managedTokens.filter(token => 
        !token.thirdweb.name.match(/^Token #\d+$/)
      );
      
      const serializedTokens = filteredTokens.map(token => ({
        ...token,
        thirdweb: {
          ...token.thirdweb,
          totalSupply: token.thirdweb.totalSupply?.toString() || '0',
        }
      }));
      
      return NextResponse.json({
        success: true,
        contractAddress,
        lastSync: new Date(),
        tokens: serializedTokens,
        tokensSynced: filteredTokens.length
      });
    }
    
    if (tokenId === undefined || !settings) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // local-settings.jsonを直接更新（Thirdweb再取得なし）
    const localSettingsPath = join(process.cwd(), 'local-settings.json');
    
    // default-token.jsonからデフォルトトークンIDを取得
    let defaultTokenId = 0;
    const defaultTokenPath = join(process.cwd(), 'default-token.json');
    if (existsSync(defaultTokenPath)) {
      try {
        const defaultData = JSON.parse(readFileSync(defaultTokenPath, 'utf-8'));
        defaultTokenId = defaultData.tokenId ?? 0;
      } catch (e) {
        // エラーの場合は0を使用
      }
    }
    
    let localSettingsData: any = {
      defaultTokenId: defaultTokenId,
      tokens: {},
      lastUpdated: new Date().toISOString()
    };
    
    // 既存の設定を読み込み
    if (existsSync(localSettingsPath)) {
      const content = readFileSync(localSettingsPath, 'utf-8');
      localSettingsData = JSON.parse(content);
      // default-token.jsonの値を優先
      localSettingsData.defaultTokenId = defaultTokenId;
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
    
    // デフォルトトークン設定の更新
    if (settings.isDefaultDisplay) {
      const defaultTokenPath = join(process.cwd(), 'default-token.json');
      writeFileSync(defaultTokenPath, JSON.stringify({ tokenId }, null, 2));
    } else {
      // デフォルト設定が解除された場合、現在のdefault-token.jsonをチェック
      const defaultTokenPath = join(process.cwd(), 'default-token.json');
      try {
        const currentDefault = JSON.parse(readFileSync(defaultTokenPath, 'utf-8'));
        // 現在のトークンがデフォルトだった場合のみクリア
        if (currentDefault.tokenId === tokenId) {
          writeFileSync(defaultTokenPath, JSON.stringify({ tokenId: 0 }, null, 2));
        }
      } catch {
        // ファイルが存在しない場合は何もしない
      }
    }
    
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