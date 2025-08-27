import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LOCAL_SETTINGS_PATH = join(process.cwd(), 'local-settings.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!existsSync(LOCAL_SETTINGS_PATH)) {
      return NextResponse.json({ 
        version: null,
        lastUpdated: null
      });
    }

    const content = readFileSync(LOCAL_SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(content);
    
    return NextResponse.json({ 
      version: settings.lastUpdated || new Date().toISOString(),
      lastUpdated: settings.lastUpdated
    });
  } catch (error) {
    console.error('Error getting settings version:', error);
    return NextResponse.json({ 
      version: null,
      lastUpdated: null,
      error: 'Failed to get settings version' 
    }, { status: 500 });
  }
}