import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_TOKEN_PATH = join(process.cwd(), 'default-token.json');

export interface DefaultTokenConfig {
  defaultTokenId: number;
  description?: string;
}

/**
 * デフォルトトークンIDを取得（高速）
 */
export function getDefaultTokenId(): number {
  try {
    // 1. default-token.jsonから取得（最速）
    if (existsSync(DEFAULT_TOKEN_PATH)) {
      const content = readFileSync(DEFAULT_TOKEN_PATH, 'utf-8');
      const config: DefaultTokenConfig = JSON.parse(content);
      if (config.defaultTokenId !== undefined) {
        return config.defaultTokenId;
      }
    }
    
    // 2. 環境変数から取得
    if (process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ID) {
      return parseInt(process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ID);
    }
    
    // 3. デフォルト値
    return 2;
  } catch (error) {
    console.error('Error getting default token ID:', error);
    return 2;
  }
}