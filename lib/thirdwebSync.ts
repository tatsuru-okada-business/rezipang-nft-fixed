import { getContract } from 'thirdweb';
import { client } from './thirdweb';
import { polygon } from 'thirdweb/chains';
import { getActiveClaimCondition, getNFT, nextTokenIdToMint } from 'thirdweb/extensions/erc1155';
import type { ThirdwebTokenInfo } from './types/adminConfig';
import { formatPrice } from './formatPrice';

// IPFS URIをHTTP URLに変換
function convertIpfsUriToHttp(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

// IPFS からメタデータを取得（タイムアウト付き）
async function fetchMetadataFromUri(uri: string): Promise<any> {
  try {
    const httpUrl = convertIpfsUriToHttp(uri);
    console.log(`Fetching metadata from: ${httpUrl}`);
    
    // 10秒のタイムアウトを設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(httpUrl, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for URL: ${httpUrl}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn(`Unexpected content type: ${contentType} for URL: ${httpUrl}`);
    }
    
    const metadata = await response.json();
    console.log('Successfully fetched metadata:', {
      name: metadata.name,
      description: metadata.description?.substring(0, 50),
      hasImage: !!metadata.image,
      imageUrl: metadata.image,
    });
    
    // 必須フィールドのチェック
    if (typeof metadata !== 'object' || metadata === null) {
      throw new Error('Invalid metadata format: not an object');
    }
    
    // 画像URLもIPFSの場合は変換
    if (metadata.image && typeof metadata.image === 'string') {
      if (metadata.image.startsWith('ipfs://')) {
        metadata.image = convertIpfsUriToHttp(metadata.image);
        console.log('Converted IPFS image URL to:', metadata.image);
      }
    }
    
    return metadata;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('Metadata fetch timed out after 10 seconds for URI:', uri);
    } else {
      console.error('Error fetching metadata from URI:', error);
    }
    throw error;
  }
}

// Thirdwebからトークン情報を取得
export async function fetchTokenFromThirdweb(
  contractAddress: string,
  tokenId: number
): Promise<ThirdwebTokenInfo | null> {
  try {
    const contract = getContract({
      client,
      chain: polygon,
      address: contractAddress,
    });

    // NFTメタデータを取得（エラーハンドリング強化）
    let nft: any = null;
    let totalSupply = 0n;
    let metadata: any = {};
    
    try {
      const nftData = await getNFT({
        contract,
        tokenId: BigInt(tokenId),
      });
      
      nft = nftData;
      console.log(`Token ${tokenId} getNFT result:`, nft);
      
      // URIを取得（tokenURIまたはmetadata.uriから）
      const tokenUri = nft.tokenURI || nft.metadata?.uri || nft.uri;
      
      // URIがある場合はメタデータを取得
      if (tokenUri && tokenUri.startsWith('ipfs://')) {
        console.log(`Token ${tokenId} fetching metadata from URI:`, tokenUri);
        try {
          metadata = await fetchMetadataFromUri(tokenUri);
          console.log(`Token ${tokenId} fetched metadata:`, metadata);
        } catch (metadataError) {
          console.error(`Failed to fetch metadata from URI for token ${tokenId}:`, metadataError);
          // URIからの取得に失敗した場合はデフォルト値を使用
          metadata = {
            name: `Token #${tokenId}`,
            description: '',
            image: '',
          };
        }
      } else if (tokenUri && (tokenUri.startsWith('http://') || tokenUri.startsWith('https://'))) {
        // HTTPのURIの場合も取得を試みる
        console.log(`Token ${tokenId} fetching metadata from HTTP URI:`, tokenUri);
        try {
          metadata = await fetchMetadataFromUri(tokenUri);
          console.log(`Token ${tokenId} fetched metadata:`, metadata);
        } catch (metadataError) {
          console.error(`Failed to fetch metadata from HTTP URI for token ${tokenId}:`, metadataError);
          metadata = {
            name: `Token #${tokenId}`,
            description: '',
            image: '',
          };
        }
      } else {
        // 有効なURIがない場合はデフォルト値を使用
        console.log(`Token ${tokenId} has invalid or no URI:`, tokenUri);
        metadata = {
          name: `Token #${tokenId}`,
          description: '',
          image: '',
        };
      }
      
      // supplyを取得（nft.supplyから）
      if (nft.supply !== undefined) {
        totalSupply = nft.supply;
      }
    } catch (nftError: any) {
      // NFT自体の取得に失敗した場合はデフォルト値を使用
      console.log(`Failed to fetch NFT for token ${tokenId}, using defaults:`, nftError);
      metadata = {
        name: `Token #${tokenId}`,
        description: '',
        image: '',
      };
    }

    // クレーム条件を取得
    let claimCondition = null;
    let claimConditionActive = false;
    try {
      claimCondition = await getActiveClaimCondition({
        contract,
        tokenId: BigInt(tokenId),
      });
      claimConditionActive = true;
    } catch (error) {
      console.log(`No active claim condition for token ${tokenId}`);
    }

    // メタデータから情報を抽出
    const name = metadata.name || `Token #${tokenId}`;
    const image = metadata.image || '';
    const description = metadata.description || '';
    
    // デバッグログ
    console.log(`Token ${tokenId} final data:`, {
      name,
      description,
      image,
      hasImage: !!image,
      imageLength: image.length,
      claimConditionActive,
      originalUri: nft?.uri,
    });
    
    const currency = getCurrencySymbol(claimCondition?.currency);
    let rawPrice = '0';
    
    if (claimCondition?.pricePerToken) {
      const priceInWei = Number(claimCondition.pricePerToken);
      
      // 通貨ごとに異なる小数点位置を処理
      if (currency === 'USDC') {
        // USDCは6桁の小数点
        rawPrice = (priceInWei / 1e6).toString();
      } else if (currency === 'ZENY') {
        // ZENYは整数（0桁の小数点）- Wei単位から変換
        rawPrice = (priceInWei / 1e18).toString();
      } else {
        // POLやETHなどは18桁の小数点
        rawPrice = (priceInWei / 1e18).toString();
      }
    }
    
    const formattedPrice = formatPrice(rawPrice, currency);
    
    return {
      tokenId,
      name,
      symbol: metadata.symbol,
      totalSupply,
      uri: nft?.uri || metadata.uri || '', // 元のURIを保持
      image, // IPFSから取得した画像URL
      description, // 説明も追加
      currentPrice: formattedPrice, // フォーマット済み価格を保存
      currency,
      maxPerWallet: claimCondition?.quantityLimitPerWallet ? 
        Number(claimCondition.quantityLimitPerWallet) : undefined,
      merkleRoot: claimCondition?.merkleRoot,
      claimConditionActive,
    };
  } catch (error) {
    console.error(`Error fetching token ${tokenId}:`, error);
    return null;
  }
}

// 全トークンを検出して取得
export async function fetchAllTokensFromThirdweb(
  contractAddress: string,
  maxTokens: number = 100
): Promise<ThirdwebTokenInfo[]> {
  const tokens: ThirdwebTokenInfo[] = [];
  
  try {
    const contract = getContract({
      client,
      chain: polygon,
      address: contractAddress,
    });

    // 次にミントされるトークンIDを取得（これが総トークン数）
    let totalTokens = 0;
    try {
      const nextId = await nextTokenIdToMint({ contract });
      totalTokens = Number(nextId);
    } catch (error) {
      console.log('Could not get nextTokenIdToMint, scanning manually');
      totalTokens = maxTokens;
    }

    // 各トークンの情報を並列で取得（パフォーマンス改善）
    const tokenPromises = [];
    const batchSize = 5; // 5個ずつ並列処理
    
    for (let i = 0; i < Math.min(totalTokens, maxTokens); i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, totalTokens, maxTokens); j++) {
        batch.push(fetchTokenFromThirdweb(contractAddress, j));
      }
      
      // バッチごとに並列処理
      const batchResults = await Promise.all(batch);
      batchResults.forEach(tokenInfo => {
        if (tokenInfo) {
          tokens.push(tokenInfo);
        }
      });
    }
  } catch (error) {
    console.error('Error fetching all tokens:', error);
  }

  return tokens;
}

// 通貨アドレスからシンボルを取得
function getCurrencySymbol(currencyAddress?: string): string {
  if (!currencyAddress) return 'POL';
  
  const address = currencyAddress.toLowerCase();
  
  if (address === '0x0000000000000000000000000000000000000000' || 
      address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return 'POL';
  } else if (address === '0x7b2d2732dccc1830aa63241dc13649b7861d9b54') {
    return 'ZENY';
  } else if (address === '0x2791bca1f2de4661ed88a30c99a7a9449aa84174') {
    return 'USDC';
  }
  
  return 'UNKNOWN';
}