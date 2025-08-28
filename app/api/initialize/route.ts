import { NextResponse } from 'next/server';
import { needsInitialization } from '@/lib/autoInitialize';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * 初期化状態をチェックするAPI
 */
export async function GET() {
  const needs = needsInitialization();
  
  // 現在の設定状態を取得
  const status = {
    needsInitialization: needs,
    hasAdminConfig: existsSync(join(process.cwd(), 'admin-config.json')),
    hasLocalSettings: existsSync(join(process.cwd(), 'local-settings.json')),
    hasProjectSettings: existsSync(join(process.cwd(), 'project-settings.json')),
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  };
  
  return NextResponse.json(status);
}

/**
 * 自動初期化を実行するAPI
 */
export async function POST() {
  try {
    // 同期APIを内部的に呼び出す
    const syncUrl = new URL('/api/admin/sync-tokens', 
      process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
    );
    
    const syncResponse = await fetch(syncUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!syncResponse.ok) {
      throw new Error('Sync failed');
    }
    
    const syncResult = await syncResponse.json();
    
    // 初期化フラグを設定
    const adminConfigPath = join(process.cwd(), 'admin-config.json');
    if (existsSync(adminConfigPath)) {
      const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
      adminConfig.initialized = true;
      adminConfig.autoInitialized = true;
      adminConfig.initializationDate = new Date().toISOString();
      writeFileSync(adminConfigPath, JSON.stringify(adminConfig, null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: 'Auto-initialization completed',
      tokensSync: syncResult.tokensSynced,
    });
  } catch (error) {
    console.error('Auto-initialization error:', error);
    return NextResponse.json(
      { error: 'Auto-initialization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}