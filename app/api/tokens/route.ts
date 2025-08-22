import { NextResponse } from 'next/server';
import { loadTokenConfig } from '@/lib/tokenConfig';
import { detectAvailableTokens, fetchMultipleTokenMetadata, type TokenMetadata } from '@/lib/tokenMetadata';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'auto'; // auto, file, contract
    
    // ソースに応じてトークン情報を取得
    let tokens: TokenMetadata[] = [];
    
    if (source === 'file') {
      // ファイルから読み込み（tokens.json or tokens.csv）
      const config = loadTokenConfig();
      tokens = config.tokens as TokenMetadata[];
    } else if (source === 'contract') {
      // スマートコントラクトから直接取得
      const availableTokenIds = process.env.NEXT_PUBLIC_AVAILABLE_TOKEN_IDS?.split(',').map(id => parseInt(id.trim())) || [2];
      const contractTokens = await fetchMultipleTokenMetadata(availableTokenIds);
      
      // プロジェクト設定は適用しない（Thirdwebの正式名を使用）
      tokens = contractTokens;
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
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
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