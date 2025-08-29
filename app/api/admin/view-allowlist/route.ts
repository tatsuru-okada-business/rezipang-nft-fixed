import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { getAllowlist, setAllowlist } from "@/lib/kv-storage";

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

    // KVからアローリストを取得
    let content = await getAllowlist();
    let isFromKV = false;
    
    if (content) {
      isFromKV = true;
    } else {
      // KVにない場合はファイルから読み込み
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
            message: "No allowlist found"
          });
        }
      }
      
      content = readFileSync(filePath, 'utf-8');
    }
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
      isFromKV,
      headers,
      data,
      stats,
      source: isFromKV ? 'KV storage' : 'local file'
    });
  } catch (error) {
    console.error("Error viewing allowlist:", error);
    return NextResponse.json(
      { error: "Failed to view allowlist" },
      { status: 500 }
    );
  }
}

// アローリストをアップロード（KVに保存）
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

    const body = await request.json();
    const { csvContent } = body;
    
    if (!csvContent) {
      return NextResponse.json(
        { error: "CSV content is required" },
        { status: 400 }
      );
    }

    // CSVの妥当性を確認
    const { headers, data } = parseCSV(csvContent);
    
    if (!headers.includes('address')) {
      return NextResponse.json(
        { error: "CSV must contain 'address' column" },
        { status: 400 }
      );
    }

    // KVに保存
    const success = await setAllowlist(csvContent);
    
    if (!success) {
      // KV保存が失敗した場合、開発環境ならローカルファイルに保存
      if (process.env.NODE_ENV === 'development') {
        const filePath = join(process.cwd(), 'allowlist.csv');
        writeFileSync(filePath, csvContent, 'utf-8');
      } else {
        return NextResponse.json(
          { error: "Failed to save allowlist to KV storage" },
          { status: 500 }
        );
      }
    }

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
      success: true,
      message: "Allowlist uploaded successfully",
      stats,
      savedTo: success ? 'KV storage' : 'local file'
    });
  } catch (error) {
    console.error("Error uploading allowlist:", error);
    return NextResponse.json(
      { error: "Failed to upload allowlist" },
      { status: 500 }
    );
  }
}