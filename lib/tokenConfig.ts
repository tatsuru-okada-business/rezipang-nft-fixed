import fs from 'fs';
import path from 'path';

export interface TokenInfo {
  id: number;
  name: string;
  description: string;
  price: string;
  maxSupply: number;
  image: string;
}

export interface TokenConfig {
  tokens: TokenInfo[];
}

let tokenCache: TokenConfig | null = null;

// トークン設定を読み込む（サーバーサイドのみ）
export function loadTokenConfig(): TokenConfig {
  if (tokenCache) return tokenCache;

  try {
    // まずtokens.jsonを試す
    const tokensPath = path.join(process.cwd(), 'tokens.json');
    if (fs.existsSync(tokensPath)) {
      const data = fs.readFileSync(tokensPath, 'utf-8');
      tokenCache = JSON.parse(data);
      return tokenCache!;
    }

    // tokens.csvをフォールバック
    const csvPath = path.join(process.cwd(), 'tokens.csv');
    if (fs.existsSync(csvPath)) {
      const data = fs.readFileSync(csvPath, 'utf-8');
      tokenCache = parseTokenCSV(data);
      return tokenCache!;
    }
  } catch (error) {
    console.error('Error loading token config:', error);
  }

  // デフォルト設定を返す
  return {
    tokens: []
  };
}

// CSVパーサー
function parseTokenCSV(csvData: string): TokenConfig {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const tokens: TokenInfo[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const token = {} as TokenInfo;
    
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === 'id' || header === 'maxSupply') {
        token[header] = parseInt(value);
      } else {
        token[header] = value;
      }
    });
    
    tokens.push(token);
  }
  
  return { tokens };
}

// クライアントサイド用のトークン情報取得
export async function fetchTokenConfig(): Promise<TokenConfig> {
  try {
    const response = await fetch('/api/tokens');
    if (!response.ok) {
      throw new Error('Failed to fetch tokens');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching token config:', error);
    return { tokens: [] };
  }
}

// トークンIDからトークン情報を取得
export function getTokenById(tokens: TokenInfo[], tokenId: number): TokenInfo | undefined {
  return tokens.find(token => token.id === tokenId);
}

// 利用可能なトークンIDリストを取得
export function getAvailableTokenIds(tokens: TokenInfo[]): number[] {
  return tokens.map(token => token.id);
}