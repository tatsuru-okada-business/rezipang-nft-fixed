import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// クライアントサイドでcanvasを生成するためのスクリプトを返す
export async function POST(request: NextRequest) {
  try {
    const { projectName, theme, textOutline } = await request.json();

    // faviconをBase64で生成（SVGベース）
    const initial = (projectName || 'N')[0].toUpperCase();
    const bgColor = theme?.backgroundColor || '#7C3AED';
    const textColor = theme?.textColor || '#FFFFFF';
    const outlineColor = textOutline?.color || '#000000';

    // SVG faviconを作成
    const svg = `
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="${bgColor}"/>
        <text x="16" y="16" 
              font-family="Arial, sans-serif" 
              font-size="20" 
              font-weight="bold"
              text-anchor="middle" 
              dominant-baseline="middle"
              ${textOutline?.enabled ? `stroke="${outlineColor}" stroke-width="1"` : ''}
              fill="${textColor}">
          ${initial}
        </text>
      </svg>
    `;

    // SVGをBase64エンコード
    const base64 = Buffer.from(svg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;

    // publicフォルダに保存
    const publicPath = join(process.cwd(), 'public');
    if (!existsSync(publicPath)) {
      mkdirSync(publicPath, { recursive: true });
    }

    // generated-favicon.svgとして保存
    writeFileSync(join(publicPath, 'generated-favicon.svg'), svg);

    return NextResponse.json({ 
      success: true, 
      favicon: dataUrl,
      path: '/generated-favicon.svg'
    });
  } catch (error) {
    console.error('Favicon generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate favicon' },
      { status: 500 }
    );
  }
}