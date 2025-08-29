import { NextResponse } from 'next/server';
import { migrateToKV, getTokensCache, setTokensCache } from '@/lib/kv-storage';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // まず既存のKVデータを確認
    const existingData = await getTokensCache();
    if (existingData) {
      return NextResponse.json({
        success: true,
        message: 'KV already has data',
        data: existingData
      });
    }
    
    // ローカルファイルからデータを読み込んでKVに保存
    const tokensCachePath = join(process.cwd(), 'tokens-cache.json');
    if (existsSync(tokensCachePath)) {
      const data = JSON.parse(readFileSync(tokensCachePath, 'utf-8'));
      const success = await setTokensCache(data);
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: 'Successfully migrated tokens-cache.json to KV',
          tokensCount: data.tokens?.length || 0
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'No data to migrate'
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}