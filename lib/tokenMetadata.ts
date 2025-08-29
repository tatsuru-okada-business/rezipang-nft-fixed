import { getContract, readContract } from "thirdweb";
import { client, chain, contractAddress } from "./thirdweb";

export interface TokenMetadata {
  id: number;
  name: string;
  description: string;
  image: string;
  price?: string;
  currency?: string;
  currencySymbol?: string;
  currencyDecimals?: number;
  currencyIsNative?: boolean;
  totalSupply?: string;
  maxSupply?: number;
  salesPeriodEnabled?: boolean;
  salesStartDate?: string;
  salesEndDate?: string;
  isUnlimited?: boolean;
  tokenId?: number;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

// キャッシュ（メモリ内）
const metadataCache = new Map<number, TokenMetadata>();
const CACHE_TTL = 5 * 60 * 1000; // 5分
const cacheTimestamps = new Map<number, number>();

// Thirdwebから直接トークンメタデータを取得
export async function fetchTokenMetadataFromContract(tokenId: number): Promise<TokenMetadata | null> {
  // キャッシュチェック
  const cached = metadataCache.get(tokenId);
  const timestamp = cacheTimestamps.get(tokenId);
  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  try {
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // メタデータを取得
    let metadata: { name?: string; description?: string; image?: string; attributes?: Array<{ trait_type: string; value: string | number }> } = {};
    try {
      // tokenURIを取得
      const uri = await readContract({
        contract,
        method: "function tokenURI(uint256 tokenId) view returns (string)",
        params: [BigInt(tokenId)],
      });
      
      if (uri) {
        // IPFS URLをHTTPに変換
        const httpUrl = uri.toString().replace('ipfs://', 'https://ipfs.io/ipfs/');
        const response = await fetch(httpUrl);
        metadata = await response.json();
      }
    } catch (e) {
      // ERC721の場合
      try {
        const uri = await readContract({
          contract,
          method: "function uri(uint256 tokenId) view returns (string)",
          params: [BigInt(tokenId)],
        });
        
        if (uri) {
          const httpUrl = uri.toString().replace('ipfs://', 'https://ipfs.io/ipfs/');
          const response = await fetch(httpUrl);
          metadata = await response.json();
        }
      } catch (e2) {
        console.log(`Could not fetch metadata for token ${tokenId}`);
      }
    }

    // 供給量を取得
    let totalSupply = "0";
    try {
      const supply = await readContract({
        contract,
        method: "function totalSupply(uint256 id) view returns (uint256)",
        params: [BigInt(tokenId)],
      });
      totalSupply = supply?.toString() || "0";
    } catch (e) {
      console.log(`Could not fetch supply for token ${tokenId}`);
    }

    // 価格を取得（複数のパターンを試す）
    let price = "0";
    try {
      // パターン1: getPrice(tokenId)
      const priceResult = await readContract({
        contract,
        method: "function getPrice(uint256 tokenId) view returns (uint256)",
        params: [BigInt(tokenId)],
      });
      price = priceResult?.toString() || "0";
    } catch (e) {
      try {
        // パターン2: price(tokenId)
        const priceResult = await readContract({
          contract,
          method: "function price(uint256 tokenId) view returns (uint256)",
          params: [BigInt(tokenId)],
        });
        price = priceResult?.toString() || "0";
      } catch (e2) {
        try {
          // パターン3: mintPrice()
          const priceResult = await readContract({
            contract,
            method: "function mintPrice() view returns (uint256)",
            params: [],
          });
          price = priceResult?.toString() || "0";
        } catch (e3) {
          console.log(`Could not fetch price for token ${tokenId}`);
        }
      }
    }

    const tokenMetadata: TokenMetadata = {
      id: tokenId,
      name: metadata.name || `Token #${tokenId}`,
      description: metadata.description || "",
      image: metadata.image || "",
      price,
      totalSupply,
      attributes: metadata.attributes,
    };

    // キャッシュに保存
    metadataCache.set(tokenId, tokenMetadata);
    cacheTimestamps.set(tokenId, Date.now());

    return tokenMetadata;
  } catch (error) {
    console.error(`Error fetching metadata for token ${tokenId}:`, error);
    return null;
  }
}

// 複数のトークンメタデータを一括取得
export async function fetchMultipleTokenMetadata(tokenIds: number[]): Promise<TokenMetadata[]> {
  const promises = tokenIds.map(id => fetchTokenMetadataFromContract(id));
  const results = await Promise.all(promises);
  return results.filter((meta): meta is TokenMetadata => meta !== null);
}

// 利用可能なトークンを自動検出（0から順番に試す）
export async function detectAvailableTokens(maxCheck: number = 10): Promise<TokenMetadata[]> {
  const availableTokens: TokenMetadata[] = [];
  
  for (let tokenId = 0; tokenId < maxCheck; tokenId++) {
    try {
      const contract = getContract({
        client,
        chain,
        address: contractAddress,
      });

      // まず供給量をチェック（存在確認）
      try {
        const supply = await readContract({
          contract,
          method: "function totalSupply(uint256 id) view returns (uint256)",
          params: [BigInt(tokenId)],
        });
        
        // 供給量が0以上なら存在すると判断
        if (supply !== undefined) {
          const metadata = await fetchTokenMetadataFromContract(tokenId);
          if (metadata) {
            availableTokens.push(metadata);
          }
        }
      } catch (e) {
        // このトークンIDは存在しない
        continue;
      }
    } catch (error) {
      console.error(`Error checking token ${tokenId}:`, error);
    }
  }

  return availableTokens;
}

// プロジェクト設定とマージ（カスタム名称を優先）
export function mergeWithProjectConfig(
  contractMetadata: TokenMetadata,
  customName?: string
): TokenMetadata {
  return {
    ...contractMetadata,
    name: customName || contractMetadata.name,
  };
}