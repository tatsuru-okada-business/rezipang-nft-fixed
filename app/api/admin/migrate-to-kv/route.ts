import { NextResponse } from 'next/server';
import { migrateToKV } from '@/lib/kv-storage';

export async function GET() {
  try {
    // すべてのデータを移行（tokens-cache.json、settings.json、allowlist.csv）
    const success = await migrateToKV();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Successfully migrated all data to KV storage',
        migrated: [
          'tokens-cache.json',
          'settings.json',
          'allowlist.csv'
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Migration completed with some issues. Check server logs for details.'
      });
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}