import { NextResponse } from 'next/server';
import { loadTokenConfig } from '@/lib/tokenConfig';
import { detectAvailableTokens, fetchMultipleTokenMetadata, type TokenMetadata } from '@/lib/tokenMetadata';
import { getMergedTokenConfigs } from '@/lib/localSettings';
import { withCache } from '@/lib/cache';
import { resolveCurrencyAddress, getCurrencyDecimals, isCurrencyNative, getCurrencySymbol } from '@/lib/currencyUtils';
import { getTokensCache } from '@/lib/kv-storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'auto'; // auto, file, contract
    const tokenId = searchParams.get('tokenId'); // 特定のトークンIDを取得
    
    // ソースに応じてトークン情報を取得
    let tokens: TokenMetadata[] = [];
    
    // まずKVから読み込みを試みる
    const kvCache = await getTokensCache();
    if (kvCache) {
      console.log('Using tokens from KV storage');
      const cachedTokens = kvCache.tokens || [];
      
      // 特定のトークンIDが指定されている場合
      if (tokenId !== null) {
        const targetToken = cachedTokens.find((t: any) => t.tokenId === parseInt(tokenId));
        if (targetToken) {
          const currencyAddress = resolveCurrencyAddress(targetToken.currency || targetToken.currencySymbol);
          const currencySymbol = getCurrencySymbol(currencyAddress);
          
          tokens = [{
            id: targetToken.tokenId,
            name: targetToken.name,
            description: targetToken.description,
            image: targetToken.image,
            price: targetToken.price,
            currency: currencyAddress,
            currencySymbol: currencySymbol || targetToken.currencySymbol,
            currencyDecimals: getCurrencyDecimals(targetToken.currency || targetToken.currencySymbol),
            currencyIsNative: isCurrencyNative(targetToken.currency || targetToken.currencySymbol),
            totalSupply: targetToken.totalSupply,
            attributes: []
          }];
          return NextResponse.json({ tokens }, {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
            }
          });
        }
      }
      
      // 全トークンを返す
      tokens = cachedTokens.map((token: any) => {
        const currencyAddress = resolveCurrencyAddress(token.currency || token.currencySymbol);
        const currencySymbol = getCurrencySymbol(currencyAddress);
        
        return {
          id: token.tokenId,
          name: token.name,
          description: token.description,
          image: token.image,
          price: token.price,
          currency: currencyAddress,
          currencySymbol: currencySymbol || token.currencySymbol,
          currencyDecimals: getCurrencyDecimals(token.currency || token.currencySymbol),
          currencyIsNative: isCurrencyNative(token.currency || token.currencySymbol),
          totalSupply: token.totalSupply,
          attributes: []
        };
      });
      
      if (tokens.length > 0) {
        return NextResponse.json({ tokens }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        });
      }
    }
    
    // KVから取得できない場合は従来の方法を使用
    try {
      const mergedTokens = getMergedTokenConfigs();
      
      // 特定のトークンIDが指定されている場合
      if (tokenId !== null) {
        const targetToken = mergedTokens.find(t => t.tokenId === parseInt(tokenId));
        if (targetToken) {
          const currencyAddress = resolveCurrencyAddress(targetToken.currency);
          const currencySymbol = getCurrencySymbol(currencyAddress);
          
          tokens = [{
            id: targetToken.tokenId,
            name: targetToken.name,
            description: targetToken.description,
            image: targetToken.image,
            price: targetToken.currentPrice || targetToken.price,
            currency: currencyAddress,
            currencySymbol: currencySymbol,
            currencyDecimals: getCurrencyDecimals(targetToken.currency),
            currencyIsNative: isCurrencyNative(targetToken.currency),
            totalSupply: targetToken.totalSupply,
            salesPeriodEnabled: targetToken.salesPeriodEnabled,
            salesStartDate: targetToken.salesStartDate,
            salesEndDate: targetToken.salesEndDate,
            isUnlimited: targetToken.isUnlimited,
            maxSupply: targetToken.maxSupply,
            reservedSupply: targetToken.reservedSupply,
            soldOutMessage: targetToken.soldOutMessage,
            maxPerWallet: targetToken.maxPerWallet,
            totalMinted: targetToken.totalMinted,
            attributes: []
          }];
          return NextResponse.json({ tokens }, {
            headers: {
              'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
            }
          });
        }
      }
      
      // Filter and map tokens (表示有効なもののみ)
      tokens = mergedTokens
        .filter(token => 
          token.displayEnabled && 
          !token.name.match(/^Token #\d+$/)
        )
        .map(token => {
          const currencyAddress = resolveCurrencyAddress(token.currency);
          const currencySymbol = getCurrencySymbol(currencyAddress);
          const decimals = getCurrencyDecimals(token.currency);
          
          // 価格はWei単位のまま保持
          const priceInWei = token.currentPrice || token.price;
          
          return {
            id: token.tokenId,
            name: token.name,
            description: token.description,
            image: token.image,
            price: priceInWei,  // Wei単位で返す
            currency: currencyAddress,
            currencySymbol: currencySymbol,
            currencyDecimals: decimals,
            currencyIsNative: isCurrencyNative(token.currency),
            totalSupply: token.totalSupply,
            salesPeriodEnabled: token.salesPeriodEnabled,
            salesStartDate: token.salesStartDate,
            salesEndDate: token.salesEndDate,
            isUnlimited: token.isUnlimited,
            attributes: []
          };
        })
        .sort((a, b) => a.id - b.id);
      
      if (tokens.length > 0) {
        return NextResponse.json({ tokens }, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        });
      }
    } catch (error) {
      console.error('Error loading merged config:', error);
    }
    
    if (source === 'file') {
      // ファイルから読み込み（tokens.json or tokens.csv）
      const config = loadTokenConfig();
      tokens = config.tokens as TokenMetadata[];
    } else if (source === 'contract') {
      // スマートコントラクトから直接取得（全トークンを検出）
      const detectedTokens = await detectAvailableTokens(20);
      
      // プロジェクト設定は適用しない（Thirdwebの正式名を使用）
      tokens = detectedTokens;
    } else {
      // auto: まずコントラクトから試し、失敗したらファイルから
      try {
        // 利用可能なトークンを自動検出
        const detectedTokens = await detectAvailableTokens(10);
        
        if (detectedTokens.length > 0) {
          // プロジェクト設定は適用しない（Thirdwebの正式名を使用）
          tokens = detectedTokens;
        } else {
          // コントラクトから取得できない場合はファイルを試す
          const config = loadTokenConfig();
          tokens = config.tokens as TokenMetadata[];
        }
      } catch (error) {
        console.error('Error detecting tokens from contract:', error);
        // フォールバック: ファイルから読み込み
        const config = loadTokenConfig();
        tokens = config.tokens as TokenMetadata[];
      }
    }
    
    return NextResponse.json({ tokens }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
  } catch (error) {
    console.error('Error loading tokens:', error);
    return NextResponse.json(
      { error: 'Failed to load token configuration' },
      { status: 500 }
    );
  }
}