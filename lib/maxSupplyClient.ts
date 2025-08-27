/**
 * Client-side max supply utilities
 */

export interface MaxSupplyStatus {
  canMint: boolean;
  reason?: string;
  remainingSupply?: number;
}

/**
 * Check if minting is allowed for a token (client-side)
 */
export async function canMintClient(
  tokenId: number, 
  quantity: number = 1
): Promise<MaxSupplyStatus> {
  try {
    const response = await fetch(`/api/admin/max-supply?tokenId=${tokenId}`);
    if (!response.ok) {
      return { canMint: true }; // 設定がない場合は無制限
    }
    
    const data = await response.json();
    const config = data.config;
    
    if (!config || !config.maxSupply) {
      return { canMint: true }; // 無制限
    }
    
    if (config.soldOut) {
      return {
        canMint: false,
        reason: config.soldOutMessage || '売り切れました',
        remainingSupply: 0
      };
    }
    
    if (config.remainingSupply !== undefined) {
      if (quantity > config.remainingSupply) {
        return {
          canMint: false,
          reason: `残り${config.remainingSupply}個のみ販売可能です`,
          remainingSupply: config.remainingSupply
        };
      }
    }
    
    return {
      canMint: true,
      remainingSupply: config.remainingSupply
    };
  } catch (error) {
    console.error('Error checking max supply:', error);
    return { canMint: true }; // エラーの場合は制限なしとして扱う
  }
}

/**
 * Get supply status text for display (client-side)
 */
export async function getSupplyStatusTextClient(
  tokenId: number,
  locale: 'ja' | 'en' = 'ja'
): Promise<string> {
  try {
    const response = await fetch(`/api/admin/max-supply?tokenId=${tokenId}`);
    if (!response.ok) {
      return ''; // 設定がない場合は表示なし
    }
    
    const data = await response.json();
    const config = data.config;
    
    if (!config || !config.maxSupply) {
      return ''; // 無制限の場合は表示なし
    }
    
    if (config.soldOut) {
      return locale === 'ja' ? '🚫 売り切れ' : '🚫 Sold Out';
    }
    
    if (config.remainingSupply !== undefined) {
      if (config.remainingSupply <= 10) {
        return locale === 'ja' 
          ? `⚠️ 残りわずか (${config.remainingSupply}個)` 
          : `⚠️ Limited Stock (${config.remainingSupply} left)`;
      }
      
      return locale === 'ja'
        ? `残り ${config.remainingSupply} / ${config.publicMaxSupply} 個`
        : `${config.remainingSupply} / ${config.publicMaxSupply} remaining`;
    }
    
    return '';
  } catch (error) {
    console.error('Error getting supply status:', error);
    return '';
  }
}

/**
 * Update minted count after successful mint (client-side)
 */
export async function updateMintedCountClient(
  tokenId: number, 
  quantity: number = 1
): Promise<boolean> {
  try {
    const response = await fetch('/api/admin/update-minted-count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenId, quantity }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error updating minted count:', error);
    return false;
  }
}