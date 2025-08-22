"use client";

import { useState, useEffect } from "react";
import { readContract } from "thirdweb";
import { getContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import Image from "next/image";

interface NFTImageSafeProps {
  tokenId: number;
  className?: string;
  showDetails?: boolean;
}

// より安全なNFT画像表示コンポーネント
export function NFTImageSafe({ tokenId, className = "", showDetails = false }: NFTImageSafeProps) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [name, setName] = useState<string>(`Token #${tokenId}`);
  const [description, setDescription] = useState<string>("");
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

        // tokenURIを直接取得
        try {
          const uri = await readContract({
            contract,
            method: "function tokenURI(uint256 tokenId) view returns (string)",
            params: [BigInt(tokenId)],
          });
          
          if (uri && typeof uri === 'string') {
            // URIからメタデータを取得
            let metadataUrl = uri;
            
            // IPFSをHTTPに変換
            if (uri.startsWith('ipfs://')) {
              metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            // JSONメタデータを取得
            if (metadataUrl.startsWith('http')) {
              try {
                const response = await fetch(metadataUrl);
                const metadata = await response.json();
                
                // 名前と説明を設定
                if (metadata.name) setName(metadata.name);
                if (metadata.description) setDescription(metadata.description);
                
                // 画像URLを処理
                if (metadata.image) {
                  let img = metadata.image;
                  if (img.startsWith('ipfs://')) {
                    img = img.replace('ipfs://', 'https://ipfs.io/ipfs/');
                  }
                  if (img.startsWith('http')) {
                    setImageUrl(img);
                  }
                }
              } catch (fetchError) {
                console.warn(`Failed to fetch metadata for token #${tokenId}:`, fetchError);
              }
            }
          }
        } catch (uriError) {
          console.warn(`Failed to get tokenURI for token #${tokenId}:`, uriError);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error in NFTImageSafe:", err);
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

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-700 font-medium text-center p-4">
          <span className="text-4xl">🖼️</span>
          <p className="text-sm mt-2">{name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        <Image
          src={imageUrl}
          alt={name}
          width={500}
          height={500}
          className="w-full h-auto rounded-lg"
          unoptimized // IPFSの画像の場合は最適化をスキップ
        />
        {showDetails && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
            <h3 className="text-white font-bold text-lg">
              {name}
            </h3>
            {description && (
              <p className="text-white/80 text-sm mt-1 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}