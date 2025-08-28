/**
 * 自動初期化モジュール
 * 本番環境で初回アクセス時に自動的にThirdwebと同期
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface InitializationStatus {
  initialized: boolean;
  lastSync?: string;
  contractAddress?: string;
}

/**
 * 初期化が必要かチェック
 */
export function needsInitialization(): boolean {
  // 環境変数チェック
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    return false; // コントラクトアドレスがない場合は初期化不要
  }

  // admin-config.jsonの存在チェック
  const adminConfigPath = join(process.cwd(), 'admin-config.json');
  if (!existsSync(adminConfigPath)) {
    return true; // ファイルがない場合は初期化必要
  }

  try {
    const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
    
    // コントラクトアドレスが変更されている場合
    if (adminConfig.contractAddress !== contractAddress) {
      return true;
    }
    
    // 初期化フラグがない場合
    if (!adminConfig.initialized) {
      return true;
    }
    
    return false;
  } catch (error) {
    return true; // ファイル読み込みエラーの場合は初期化必要
  }
}

/**
 * 自動初期化を実行
 */
export async function performAutoInitialization(): Promise<boolean> {
  if (!needsInitialization()) {
    return false;
  }

  console.log('🔄 Auto-initialization started...');

  try {
    // /api/admin/sync-tokens を呼び出して同期
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/sync-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    const result = await response.json();
    
    // 初期化フラグを設定
    const adminConfigPath = join(process.cwd(), 'admin-config.json');
    let adminConfig = {};
    
    if (existsSync(adminConfigPath)) {
      adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
    }
    
    adminConfig.initialized = true;
    adminConfig.lastAutoSync = new Date().toISOString();
    
    writeFileSync(adminConfigPath, JSON.stringify(adminConfig, null, 2));
    
    console.log('✅ Auto-initialization completed');
    return true;
  } catch (error) {
    console.error('❌ Auto-initialization failed:', error);
    return false;
  }
}

/**
 * 設定ファイルをリセット（開発用）
 */
export function resetConfigFiles(): void {
  const files = [
    'admin-config.json',
    'local-settings.json', 
    'default-token.json'
  ];
  
  for (const file of files) {
    const filePath = join(process.cwd(), file);
    if (existsSync(filePath)) {
      // バックアップを作成
      const backupPath = filePath + '.backup';
      writeFileSync(backupPath, readFileSync(filePath));
      console.log(`📦 Backed up ${file} to ${file}.backup`);
    }
  }
  
  console.log('✅ Config files backed up');
}