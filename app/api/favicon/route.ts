import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  // 常にキャッシュを無効化して最新のfaviconを返す
  const cacheControl = 'no-cache, no-store, must-revalidate';
  // generated-favicon.svgが存在するかチェック
  const generatedPath = join(process.cwd(), 'public', 'generated-favicon.svg');
  
  if (existsSync(generatedPath)) {
    const svg = readFileSync(generatedPath, 'utf-8');
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': cacheControl,
      },
    });
  }
  
  // デフォルトのfaviconを返す
  const defaultPath = join(process.cwd(), 'public', 'default-favicon.svg');
  if (existsSync(defaultPath)) {
    const svg = readFileSync(defaultPath, 'utf-8');
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': cacheControl,
      },
    });
  }
  
  // どちらも存在しない場合は、デフォルトのSVGを生成
  const defaultSvg = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <text x="16" y="22" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="black">N</text>
    </svg>
  `;
  
  return new NextResponse(defaultSvg.trim(), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}