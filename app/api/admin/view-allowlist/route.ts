import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// 管理者アドレスの確認
function isAdmin(address: string | null): boolean {
  if (!address) return false;
  const adminAddresses = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.split(',').map(a => a.trim().toLowerCase()) || [];
  return adminAddresses.includes(address.toLowerCase());
}

// CSV解析
function parseCSV(content: string) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return { headers: [], data: [] };
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, data };
}

// CSVの内容を表示用に取得
export async function GET(request: NextRequest) {
  try {
    // 管理者権限の確認
    const adminAddress = request.headers.get('X-Admin-Address');
    if (!isAdmin(adminAddress)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    
    if (!tokenId) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // トークン固有のアローリストをチェック
    let filePath = join(process.cwd(), 'allowlists', `token-${tokenId}`, 'allowlist.csv');
    let isDefault = false;
    
    if (!existsSync(filePath)) {
      // デフォルトアローリストをチェック
      filePath = join(process.cwd(), 'allowlist.csv');
      isDefault = true;
      
      if (!existsSync(filePath)) {
        return NextResponse.json({
          exists: false,
          tokenId,
          message: "No allowlist found for this token"
        });
      }
    }

    const content = readFileSync(filePath, 'utf-8');
    const { headers, data } = parseCSV(content);
    
    // 統計情報を計算
    const stats = {
      totalEntries: data.length,
      uniqueAddresses: new Set(data.map((row: any) => row.address?.toLowerCase())).size,
      totalMaxMint: data.reduce((sum: number, row: any) => {
        const maxMint = parseInt(row.maxMintAmount || '1');
        return sum + (isNaN(maxMint) ? 1 : maxMint);
      }, 0)
    };
    
    return NextResponse.json({
      exists: true,
      tokenId,
      isDefault,
      headers,
      data,
      stats,
      filePath: isDefault ? 'default allowlist' : `token-${tokenId} allowlist`
    });
  } catch (error) {
    console.error("Error viewing allowlist:", error);
    return NextResponse.json(
      { error: "Failed to view allowlist" },
      { status: 500 }
    );
  }
}