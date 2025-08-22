import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface AllowlistEntry {
  address: string;
  maxMintAmount: number;
}

let cachedAllowlist: AllowlistEntry[] | null = null;

export function getAllowlistEntries(): AllowlistEntry[] {
  // キャッシュがあればそれを返す
  if (cachedAllowlist) {
    return cachedAllowlist;
  }

  let allowlist: AllowlistEntry[] = [];

  // まずCSVファイルを確認（maxMintAmount対応）
  try {
    const csvPath = path.join(process.cwd(), 'allowlist.csv');
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const records: Array<{ address?: string; maxMintAmount?: string }> = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      allowlist = records
        .filter((record) => {
          const address = (record.address || '').toLowerCase();
          return address.startsWith('0x') && address.length === 42;
        })
        .map((record) => ({
          address: (record.address || '').toLowerCase(),
          maxMintAmount: parseInt(record.maxMintAmount || '1') || 1
        }));
      
      console.log(`Loaded ${allowlist.length} addresses with max mint amounts from CSV file`);
    }
  } catch (error) {
    console.error('Error reading CSV file:', error);
  }

  // CSVが空または存在しない場合は環境変数から読み込み（後方互換性）
  if (allowlist.length === 0) {
    const allowlistEnv = process.env.ALLOWLIST_ADDRESSES || process.env.NEXT_PUBLIC_ALLOWLIST_ADDRESSES || "";
    if (allowlistEnv) {
      const addresses = allowlistEnv
        .split(",")
        .map(address => address.trim().toLowerCase())
        .filter(address => address.startsWith('0x') && address.length === 42);
      
      allowlist = addresses.map(address => ({
        address,
        maxMintAmount: 1 // 環境変数の場合はデフォルト1枚
      }));
      
      console.log(`Loaded ${allowlist.length} addresses from environment variable`);
    }
  }

  // キャッシュに保存
  cachedAllowlist = allowlist;
  
  return allowlist;
}

export function getAllowlistAddresses(): string[] {
  return getAllowlistEntries().map(entry => entry.address);
}

export function isAddressAllowlisted(address: string): boolean {
  const entries = getAllowlistEntries();
  return entries.some(entry => entry.address === address.toLowerCase());
}

export function getAllowlistEntry(address: string): AllowlistEntry | null {
  const entries = getAllowlistEntries();
  return entries.find(entry => entry.address === address.toLowerCase()) || null;
}

// キャッシュをクリアする関数（開発時のホットリロード用）
export function clearAllowlistCache() {
  cachedAllowlist = null;
}