import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getAllowlist, getTokensCache } from "@/lib/kv-storage";

interface AllowlistEntry {
  address: string;
  maxMintAmount: number;
}

// トークンごとのCSVアローリストを読み込む
async function loadTokenAllowlist(tokenId: number): Promise<AllowlistEntry[]> {
  try {
    // まずKVから取得を試みる
    const kvAllowlist = await getAllowlist();
    if (kvAllowlist) {
      return parseCSV(kvAllowlist);
    }
    
    // KVにない場合はファイルから読み込み
    const filePath = join(process.cwd(), 'allowlists', `token-${tokenId}`, 'allowlist.csv');
    
    if (!existsSync(filePath)) {
      // トークン固有のアローリストがない場合は、デフォルトを試す
      const defaultPath = join(process.cwd(), 'allowlist.csv');
      if (!existsSync(defaultPath)) {
        return [];
      }
      const content = readFileSync(defaultPath, 'utf-8');
      return parseCSV(content);
    }
    
    const content = readFileSync(filePath, 'utf-8');
    return parseCSV(content);
  } catch (error) {
    console.error(`Error loading allowlist for token ${tokenId}:`, error);
    return [];
  }
}

// CSV解析
function parseCSV(content: string): AllowlistEntry[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const addressIndex = header.indexOf('address');
  const maxMintIndex = header.indexOf('maxmintamount');
  
  if (addressIndex === -1) return [];
  
  const entries: AllowlistEntry[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts[addressIndex]) {
      entries.push({
        address: parts[addressIndex].toLowerCase(),
        maxMintAmount: maxMintIndex !== -1 && parts[maxMintIndex] 
          ? parseInt(parts[maxMintIndex]) || 1 
          : 1
      });
    }
  }
  
  return entries;
}

export async function POST(request: NextRequest) {
  try {
    const { address, tokenId = 0 } = await request.json();
    
    if (!address) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }
    
    const normalizedAddress = address.toLowerCase();
    
    // 新しい統合ファイルから情報を取得
    let tokenInfo: any = null;
    
    try {
      // KVまたはファイルから価格と通貨情報を取得
      let tokensCache = await getTokensCache();
      
      if (!tokensCache) {
        // フォールバック：ローカルファイル
        const tokensCachePath = join(process.cwd(), 'tokens-cache.json');
        if (existsSync(tokensCachePath)) {
          tokensCache = JSON.parse(readFileSync(tokensCachePath, 'utf-8'));
        }
      }
      
      if (tokensCache) {
        const cachedToken = tokensCache.tokens?.find((t: any) => t.tokenId === tokenId);
        if (cachedToken) {
          tokenInfo = {
            price: cachedToken.price,
            currency: cachedToken.currency || cachedToken.currencySymbol,
            currencySymbol: cachedToken.currencySymbol || 'POL'
          };
        }
      }
    } catch (error) {
      console.error('Error reading token info:', error);
    }
    
    // トークンごとのアローリストをチェック
    const allowlist = await loadTokenAllowlist(tokenId);
    const entry = allowlist.find(e => e.address === normalizedAddress);
    
    if (entry) {
      // アローリストに登録されている
      // CSVのmaxMintAmountのみを使用（シンプル化）
      const effectiveMaxMint = entry.maxMintAmount || 1; // CSVの値、未設定なら1
      
      return NextResponse.json({
        address,
        isAllowlisted: true,
        maxMintAmount: effectiveMaxMint,
        csvMaxMintAmount: entry.maxMintAmount,
        userMinted: 0, // TODO: 実際のミント数を追跡する場合は実装が必要
        source: "csv",
        tokenInfo: tokenInfo
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
        }
      });
    }
    
    // アローリストに登録されていない = ミント不可
    return NextResponse.json({
      address,
      isAllowlisted: false,
      maxMintAmount: 0, // ミント不可
      csvMaxMintAmount: 0,
      userMinted: 0,
      source: "csv",
      tokenInfo: tokenInfo
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
      }
    });
    
  } catch (error) {
    console.error("Error verifying allowlist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}