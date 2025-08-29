import { getContract } from 'thirdweb';
import { getNFT, getClaimConditions } from 'thirdweb/extensions/erc1155';
import { client, chain } from './thirdweb';
import type { ThirdwebTokenInfo } from './types/adminConfig';

// タイムアウト設定（ミリ秒）
const FETCH_TIMEOUT = 30000; // 30秒
const BATCH_SIZE = 10; // 一度に取得するトークン数

// タイムアウト付きfetch関数
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );
  
  return Promise.race([promise, timeout]);
}

// 単一トークンの情報を取得
async function fetchTokenInfo(
  contract: any,
  tokenId: number
): Promise<ThirdwebTokenInfo | null> {
  try {
    const [nft, claimConditions] = await Promise.all([
      fetchWithTimeout(getNFT({ contract, tokenId: BigInt(tokenId) })),
      fetchWithTimeout(
        getClaimConditions({ contract, tokenId: BigInt(tokenId) })
          .then(conditions => conditions?.[0] || null)
          .catch(() => null) // クレーム条件がない場合はnullを返す
      )
    ]);
    
    const claimCondition = claimConditions;

    // NFTデータの検証
    if (!nft) {
      console.warn(`Token ${tokenId}: NFT data not found`);
      return null;
    }

    // デフォルト値の設定
    const tokenInfo: ThirdwebTokenInfo = {
      tokenId,
      name: nft.metadata?.name || `Token #${tokenId}`,
      description: nft.metadata?.description,
      image: nft.metadata?.image,
      totalSupply: nft.totalSupply || BigInt(0),
      claimConditionActive: false,
      maxSupply: undefined,
      price: undefined,
      currencyAddress: undefined,
      currencySymbol: undefined,
      currencyDecimals: undefined,
      maxPerWallet: undefined,
      merkleRoot: undefined,
      salesStartDate: undefined,
      salesEndDate: undefined,
    };

    // クレーム条件が存在する場合
    if (claimCondition) {
      tokenInfo.claimConditionActive = true;
      tokenInfo.maxSupply = claimCondition.maxClaimableSupply ? Number(claimCondition.maxClaimableSupply) : undefined;
      // 価格はWei単位で保存（文字列として保存して精度を保つ）
      tokenInfo.price = claimCondition.pricePerToken ? claimCondition.pricePerToken.toString() : undefined;
      tokenInfo.currencyAddress = claimCondition.currencyAddress;
      tokenInfo.maxPerWallet = claimCondition.maxClaimablePerWallet ? 
        Number(claimCondition.maxClaimablePerWallet) : undefined;
      tokenInfo.merkleRoot = claimCondition.merkleRootHash;
      
      // 販売期間の設定
      if (claimCondition.startTimestamp) {
        tokenInfo.salesStartDate = new Date(Number(claimCondition.startTimestamp) * 1000);
      }
      if (claimCondition.endTimestamp && Number(claimCondition.endTimestamp) < 2147483647) {
        tokenInfo.salesEndDate = new Date(Number(claimCondition.endTimestamp) * 1000);
      }

      // 通貨情報の取得（エラーが発生しても続行）
      if (claimCondition.currencyAddress && claimCondition.currencyAddress !== '0x0000000000000000000000000000000000000000') {
        tokenInfo.currencyAddress = claimCondition.currencyAddress;
        // 通貨情報は別途取得またはハードコード
        tokenInfo.currencySymbol = 'UNKNOWN';
        tokenInfo.currencyDecimals = 18;
      } else {
        // ネイティブ通貨の場合
        tokenInfo.currencySymbol = chain.nativeCurrency?.symbol || 'MATIC';
        tokenInfo.currencyDecimals = chain.nativeCurrency?.decimals || 18;
      }
    }

    return tokenInfo;
  } catch (error) {
    console.error(`Error fetching token ${tokenId}:`, error);
    return null;
  }
}

// Thirdwebから全トークン情報を取得（バッチ処理＆エラーハンドリング付き）
export async function fetchAllTokensFromThirdweb(
  contractAddress: string,
  maxTokens: number = 100
): Promise<ThirdwebTokenInfo[]> {
  const tokens: ThirdwebTokenInfo[] = [];
  
  try {
    console.log(`Starting Thirdweb sync for contract: ${contractAddress}`);
    
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // 総供給量を取得してトークンの範囲を特定
    let totalSupplyCount = 0;
    try {
      // ERC1155では各トークンIDごとに供給量があるため、
      // トークンの最大IDを推定する（最初の100個をチェック）
      totalSupplyCount = maxTokens;
      console.log(`Checking up to ${totalSupplyCount} tokens`);
    } catch (error) {
      console.warn('Failed to get total supply, using default range', error);
      totalSupplyCount = maxTokens;
    }

    // 取得するトークン数を制限
    const tokensToFetch = Math.min(totalSupplyCount, maxTokens);
    
    // バッチ処理でトークン情報を取得
    for (let i = 0; i < tokensToFetch; i += BATCH_SIZE) {
      const batch = [];
      const batchEnd = Math.min(i + BATCH_SIZE, tokensToFetch);
      
      console.log(`Fetching tokens ${i} to ${batchEnd - 1}...`);
      
      for (let tokenId = i; tokenId < batchEnd; tokenId++) {
        batch.push(fetchTokenInfo(contract, tokenId));
      }
      
      // バッチを並列処理
      const results = await Promise.allSettled(batch);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          tokens.push(result.value);
        } else if (result.status === 'rejected') {
          console.error(`Failed to fetch token ${i + index}:`, result.reason);
        }
      });
      
      // レート制限対策のための待機
      if (batchEnd < tokensToFetch) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully fetched ${tokens.length} tokens`);
    return tokens;
  } catch (error) {
    console.error('Fatal error during Thirdweb sync:', error);
    throw new Error(`Failed to sync with Thirdweb: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 単一トークンの同期
export async function syncSingleToken(
  contractAddress: string,
  tokenId: number
): Promise<ThirdwebTokenInfo | null> {
  try {
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });
    
    return await fetchTokenInfo(contract, tokenId);
  } catch (error) {
    console.error(`Failed to sync token ${tokenId}:`, error);
    return null;
  }
}