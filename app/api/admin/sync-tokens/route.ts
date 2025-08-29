import { NextResponse } from 'next/server';
import { fetchAllTokensFromThirdweb } from '@/lib/thirdwebSync';
import { loadLocalSettings, mergeTokenData, saveLocalSettings } from '@/lib/localTokenSettings';
import { getSettings, setSettings, getTokensCache, setTokensCache } from '@/lib/kv-storage';

// Thirdwebと同期して全トークン情報を取得
export async function GET() {
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
    
    // ローカル設定を読み込み（KV優先、フォールバック：ローカルファイル）
    let localSettings: Map<number, any>;
    try {
      const kvSettings = await getSettings();
      if (kvSettings && kvSettings.tokens) {
        // KVの設定をMapに変換（キーをnumberに変換）
        localSettings = new Map(
          Object.entries(kvSettings.tokens).map(([key, value]) => [Number(key), value])
        );
      } else {
        localSettings = loadLocalSettings();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      localSettings = new Map();
    }
    
    // データを統合
    const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
    
    // KVに保存
    try {
      const settingsData = {
        tokens: Object.fromEntries(
          Array.from(localSettings).map(([id, settings]) => [id, settings])
        ),
        lastUpdated: new Date().toISOString()
      };
      await setSettings(settingsData);
    } catch (error) {
      console.error('Failed to save to KV:', error);
      // ローカル開発環境でのみファイル保存を試みる
      if (process.env.NODE_ENV === 'development') {
        try {
          saveLocalSettings(managedTokens);
        } catch (e) {
          console.error('Failed to save locally:', e);
        }
      }
    }
    
    // フィルタリング: 汎用名でないトークンのみ
    const filteredTokens = managedTokens.filter(token => {
      return !token.thirdweb.name.match(/^Token #\d+$/);
    });
    
    // デバッグ: フィルタリング後のトークン情報
    console.log('Filtered tokens count:', filteredTokens.length);
    
    // BigIntを文字列に変換してからJSONレスポンスを返す
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
        const kvTokens = await getTokensCache();
        if (kvTokens && kvTokens.tokens) {
          return NextResponse.json({
            success: false,
            error: 'No tokens fetched from Thirdweb. Keeping existing configuration.',
            tokens: kvTokens.tokens || [],
            tokensSynced: 0
          });
        }
      }
      
      // 設定を読み込み
      let localSettings: Map<number, any>;
      const kvSettings = await getSettings();
      if (kvSettings && kvSettings.tokens) {
        // Object.entriesはstring型のキーを返すので、numberに変換
        localSettings = new Map(
          Object.entries(kvSettings.tokens).map(([key, value]) => [Number(key), value])
        );
      } else {
        localSettings = loadLocalSettings();
      }
      
      const managedTokens = mergeTokenData(thirdwebTokens, localSettings);
      
      // KVに保存
      const settingsData = {
        tokens: Object.fromEntries(
          managedTokens.map(token => [
            token.thirdweb.tokenId,
            token.local
          ])
        ),
        lastUpdated: new Date().toISOString(),
        lastSync: new Date().toISOString()
      };
      await setSettings(settingsData);
      
      // トークンキャッシュも更新
      const tokensCache = {
        tokens: thirdwebTokens,
        lastSync: new Date().toISOString(),
        contractAddress
      };
      await setTokensCache(tokensCache);
      
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

    // 個別トークン設定の更新
    let settingsData = await getSettings() || {
      tokens: {},
      lastUpdated: new Date().toISOString()
    };
    
    // 指定されたトークンのみ更新
    settingsData.tokens[tokenId] = {
      ...settingsData.tokens[tokenId] || {},
      ...settings,
      tokenId // tokenIdは保持
    };
    settingsData.lastUpdated = new Date().toISOString();
    
    // KVに保存
    await setSettings(settingsData);
    
    // デフォルトトークン設定の更新
    if (settings.isDefaultDisplay) {
      // 他のトークンのデフォルト設定を解除
      Object.keys(settingsData.tokens).forEach(id => {
        if (id !== tokenId.toString()) {
          settingsData.tokens[id].isDefaultDisplay = false;
        }
      });
      settingsData.defaultTokenId = tokenId;
      await setSettings(settingsData);
    } else if (settingsData.defaultTokenId === tokenId) {
      // 現在のトークンがデフォルトだった場合のみクリア
      settingsData.defaultTokenId = 0;
      await setSettings(settingsData);
    }
    
    return NextResponse.json({
      success: true,
      tokenId,
      settings: settingsData.tokens[tokenId],
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}