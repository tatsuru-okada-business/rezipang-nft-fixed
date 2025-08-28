import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface AllowlistEntry {
  address: string;
  maxMintAmount: number;
}

// トークンごとのCSVアローリストを読み込む
function loadTokenAllowlist(tokenId: number): AllowlistEntry[] {
  try {
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
    
    // admin-configから価格と通貨情報を取得
    let tokenInfo: any = null;
    try {
      const adminConfigPath = join(process.cwd(), 'admin-config.json');
      if (existsSync(adminConfigPath)) {
        const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
        tokenInfo = adminConfig.tokens?.find((t: any) => t.thirdweb.tokenId === tokenId);
      }
    } catch (error) {
      console.error('Error reading admin-config:', error);
    }
    
    // ローカル設定から最大ミント数を取得
    let localMaxPerWallet: number | undefined;
    try {
      const localSettingsPath = join(process.cwd(), 'local-settings.json');
      if (existsSync(localSettingsPath)) {
        const localSettings = JSON.parse(readFileSync(localSettingsPath, 'utf-8'));
        if (localSettings.tokens && localSettings.tokens[tokenId]) {
          localMaxPerWallet = localSettings.tokens[tokenId].maxPerWallet;
        }
      }
    } catch (error) {
      console.log('Could not read local settings:', error);
    }
    
    // トークンごとのアローリストをチェック
    const allowlist = loadTokenAllowlist(tokenId);
    const entry = allowlist.find(e => e.address === normalizedAddress);
    
    if (entry) {
      // アローリストに登録されている
      const effectiveMaxMint = localMaxPerWallet !== undefined 
        ? localMaxPerWallet 
        : entry.maxMintAmount;
      
      return NextResponse.json({
        address,
        isAllowlisted: true,
        maxMintAmount: effectiveMaxMint,
        maxPerWallet: effectiveMaxMint,
        localMaxPerWallet: localMaxPerWallet,
        userMinted: 0, // TODO: 実際のミント数を追跡する場合は実装が必要
        source: "csv",
        tokenInfo: tokenInfo ? {
          price: tokenInfo.thirdweb.price,
          currency: tokenInfo.thirdweb.currency,
          currencySymbol: tokenInfo.thirdweb.currencySymbol || 'POL'
        } : null
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10'
        }
      });
    }
    
    // アローリストに登録されていない
    return NextResponse.json({
      address,
      isAllowlisted: false,
      maxMintAmount: 0,
      maxPerWallet: 0,
      localMaxPerWallet: localMaxPerWallet,
      userMinted: 0,
      source: "csv",
      tokenInfo: tokenInfo ? {
        price: tokenInfo.thirdweb.price,
        currency: tokenInfo.thirdweb.currency,
        currencySymbol: tokenInfo.thirdweb.currencySymbol || 'POL'
      } : null
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