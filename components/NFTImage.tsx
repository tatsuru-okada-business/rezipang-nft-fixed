"use client";

import { useState, useEffect } from "react";
import { getNFT } from "thirdweb/extensions/erc1155";
import { getContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import Image from "next/image";

interface NFTImageProps {
  tokenId: number;
  className?: string;
  showDetails?: boolean;
}

export function NFTImage({ tokenId, className = "", showDetails = false }: NFTImageProps) {
  const [nftData, setNftData] = useState<{ metadata?: { name?: string; description?: string; image?: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNFTData() {
      if (!contractAddress) {
        setError("No contract address");
        setLoading(false);
        return;
      }

      try {
        const contract = getContract({
          client,
          chain,
          address: contractAddress,
        });

        let nft = null;
        
        try {
          // ERC1155のNFTメタデータを取得
          nft = await getNFT({
            contract,
            tokenId: BigInt(tokenId),
          });
        } catch (getNFTError) {
          console.warn(`Failed to get NFT metadata for token #${tokenId}:`, getNFTError);
          
          // getNFTが失敗した場合、基本的なメタデータを作成
          nft = {
            metadata: {
              name: `Token #${tokenId}`,
              description: '',
              image: ''
            }
          };
        }

        // URIスキームのバリデーション
        if (nft?.metadata?.image) {
          const imageUri = nft.metadata.image;
          // 空文字列または無効なURIの場合の処理
          if (imageUri && !imageUri.startsWith('ipfs://') && !imageUri.startsWith('http://') && !imageUri.startsWith('https://')) {
            console.warn(`Invalid URI scheme for token #${tokenId}:`, imageUri);
            nft.metadata.image = '';
          }
        }

        setNftData(nft);
        setLoading(false);
      } catch (err) {
        console.error("Error in NFTImage component:", err);
        setError("Failed to load NFT");
        setLoading(false);
      }
    }

    fetchNFTData();
  }, [tokenId]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
        <div className="aspect-square" />
      </div>
    );
  }

  if (error || !nftData) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-700 font-medium text-center p-4">
          <span className="text-4xl">🖼️</span>
          <p className="text-sm mt-2">Token #{tokenId}</p>
        </div>
      </div>
    );
  }

  // IPFSのURLを変換（必要に応じて）
  let imageUrl = '';
  if (nftData.metadata?.image) {
    const img = nftData.metadata.image;
    // 空文字列でない場合のみ処理
    if (img && typeof img === 'string' && img.length > 0) {
      if (img.startsWith('ipfs://')) {
        imageUrl = img.replace('ipfs://', 'https://ipfs.io/ipfs/');
      } else if (img.startsWith('http://') || img.startsWith('https://')) {
        imageUrl = img;
      } else {
        // その他の形式（相対パスなど）は無視
        console.warn(`Unsupported image URI format for token #${tokenId}:`, img);
      }
    }
  }

  return (
    <div className={className}>
      {imageUrl ? (
        <div className="relative">
          <Image
            src={imageUrl}
            alt={nftData.metadata?.name || `Token #${tokenId}`}
            width={500}
            height={500}
            className="w-full h-auto rounded-lg"
            unoptimized // IPFSの画像の場合は最適化をスキップ
          />
          {showDetails && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
              <h3 className="text-white font-bold text-lg">
                {nftData.metadata?.name || `Token #${tokenId}`}
              </h3>
              {nftData.metadata?.description && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">
                  {nftData.metadata.description}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg flex items-center justify-center aspect-square">
          <div className="text-gray-700 font-medium text-center">
            <span className="text-4xl">🖼️</span>
            <p className="text-sm mt-2">No Image</p>
          </div>
        </div>
      )}
    </div>
  );
}