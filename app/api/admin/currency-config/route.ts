import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// 管理者アドレスの確認
function isAdmin(address: string | null): boolean {
  if (!address) return false;
  const adminAddresses = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.split(',').map(a => a.trim().toLowerCase()) || [];
  return adminAddresses.includes(address.toLowerCase());
}

// GET: 通貨設定を取得
export async function GET() {
  try {
    const configPath = join(process.cwd(), 'currency-config.json');
    
    if (!existsSync(configPath)) {
      // デフォルト設定を返す
      return NextResponse.json({
        currencies: [
          {
            symbol: "POL",
            name: "Polygon",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            isNative: true,
            chainId: 137,
            description: "Polygon Native Token"
          }
        ],
        defaultCurrency: "POL"
      });
    }
    
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error reading currency config:", error);
    return NextResponse.json(
      { error: "Failed to read currency configuration" },
      { status: 500 }
    );
  }
}

// POST: 通貨を追加または更新
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
    const { currency } = body;

    if (!currency || !currency.symbol || !currency.address || currency.decimals === undefined) {
      return NextResponse.json(
        { error: "Invalid currency data" },
        { status: 400 }
      );
    }

    const configPath = join(process.cwd(), 'currency-config.json');
    let config: any = { currencies: [], defaultCurrency: "POL" };
    
    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    }

    // 既存の通貨を更新または新規追加
    const existingIndex = config.currencies.findIndex((c: any) => 
      c.symbol === currency.symbol || c.address.toLowerCase() === currency.address.toLowerCase()
    );

    if (existingIndex >= 0) {
      // 更新
      config.currencies[existingIndex] = {
        ...config.currencies[existingIndex],
        ...currency
      };
    } else {
      // 新規追加
      config.currencies.push(currency);
    }

    // 保存
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: existingIndex >= 0 ? "Currency updated" : "Currency added",
      currency
    });
  } catch (error) {
    console.error("Error updating currency config:", error);
    return NextResponse.json(
      { error: "Failed to update currency configuration" },
      { status: 500 }
    );
  }
}

// DELETE: 通貨を削除
export async function DELETE(request: NextRequest) {
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
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    const configPath = join(process.cwd(), 'currency-config.json');
    
    if (!existsSync(configPath)) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // ネイティブトークンは削除不可
    const currency = config.currencies.find((c: any) => c.symbol === symbol);
    if (currency?.isNative) {
      return NextResponse.json(
        { error: "Cannot delete native currency" },
        { status: 400 }
      );
    }

    // 削除
    config.currencies = config.currencies.filter((c: any) => c.symbol !== symbol);
    
    // 保存
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: "Currency deleted"
    });
  } catch (error) {
    console.error("Error deleting currency:", error);
    return NextResponse.json(
      { error: "Failed to delete currency" },
      { status: 500 }
    );
  }
}