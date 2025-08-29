import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// 管理者アドレスの確認
function isAdmin(address: string | null): boolean {
  if (!address) return false;
  const adminAddresses = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.split(',').map(a => a.trim().toLowerCase()) || [];
  return adminAddresses.includes(address.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    // 管理者権限の確認
    const adminAddress = request.headers.get('X-Admin-Address');
    if (!isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tokenId = formData.get('tokenId') as string;
    
    if (!file || !tokenId) {
      return NextResponse.json(
        { error: "File and tokenId are required" },
        { status: 400 }
      );
    }

    // CSVファイルのチェック
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: "Only CSV files are allowed" },
        { status: 400 }
      );
    }

    // ファイル内容を読み取り
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const content = buffer.toString('utf-8');

    // CSVの検証（基本的なフォーマットチェック）
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have header and at least one data row" },
        { status: 400 }
      );
    }

    // ヘッダーの検証
    const header = lines[0].toLowerCase();
    if (!header.includes('address')) {
      return NextResponse.json(
        { error: "CSV must have 'address' column" },
        { status: 400 }
      );
    }

    // トークンごとのディレクトリを作成
    const tokenDir = join(process.cwd(), 'allowlists', `token-${tokenId}`);
    if (!existsSync(tokenDir)) {
      mkdirSync(tokenDir, { recursive: true });
    }

    // CSVファイルを保存
    const filePath = join(tokenDir, 'allowlist.csv');
    writeFileSync(filePath, content, 'utf-8');

    // アローリストの統計情報を取得
    const dataLines = lines.slice(1).filter(line => line.trim());
    const addresses = dataLines.map(line => {
      const parts = line.split(',');
      return parts[0]?.trim();
    }).filter(addr => addr && addr.startsWith('0x'));

    return NextResponse.json({
      success: true,
      tokenId,
      message: `Allowlist uploaded for token ${tokenId}`,
      stats: {
        totalAddresses: addresses.length,
        uniqueAddresses: new Set(addresses).size
      }
    });
  } catch (error) {
    console.error("Error uploading allowlist:", error);
    return NextResponse.json(
      { error: "Failed to upload allowlist" },
      { status: 500 }
    );
  }
}

// CSVダウンロード用のGETエンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    
    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    const filePath = join(process.cwd(), 'allowlists', `token-${tokenId}`, 'allowlist.csv');
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Allowlist not found for this token" },
        { status: 404 }
      );
    }

    const { readFileSync } = await import('fs');
    const content = readFileSync(filePath, 'utf-8');
    
    return new Response(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="allowlist-token-${tokenId}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error downloading allowlist:", error);
    return NextResponse.json(
      { error: "Failed to download allowlist" },
      { status: 500 }
    );
  }
}