"use client";

import { useState, useEffect } from "react";
import { NFTImage } from "./NFTImage";
// より安全なバージョンを使用する場合はこちら
// import { NFTImageSafe as NFTImage } from "./NFTImageSafe";
import type { TokenMetadata } from "@/lib/tokenMetadata";

interface TokenGalleryProps {
  onTokenSelect: (tokenId: number) => void;
  selectedTokenId: number;
  locale?: string;
}

export function TokenGallery({ onTokenSelect, selectedTokenId, locale = "en" }: TokenGalleryProps) {
  const [tokens, setTokens] = useState<TokenMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 環境変数から販売対象トークンIDを取得
  const availableTokenIds = process.env.NEXT_PUBLIC_AVAILABLE_TOKEN_IDS?.split(',').map(id => parseInt(id.trim())) || [];

  useEffect(() => {
    async function fetchTokens() {
      try {
        // APIからトークン情報を取得（自動検出）
        const response = await fetch('/api/tokens?source=auto');
        if (!response.ok) {
          throw new Error('Failed to fetch tokens');
        }
        
        const data = await response.json();
        // 発行枚数が0のトークンを除外
        const tokensWithSupply = (data.tokens || []).filter((token: TokenMetadata) => {
          const supply = parseInt(token.totalSupply || '0');
          return supply > 0;
        });
        setTokens(tokensWithSupply);
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setError(error instanceof Error ? error.message : 'Failed to load tokens');
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="text-gray-700 font-medium mt-4">
          {locale === "ja" ? "トークンを読み込み中..." : "Loading tokens..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-medium">
          {locale === "ja" ? "トークンの読み込みに失敗しました" : "Failed to load tokens"}
        </p>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-700 font-medium">
          {locale === "ja" ? "利用可能なトークンがありません" : "No tokens available"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">
        {locale === "ja" ? "トークンを選択" : "Select Token"}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tokens.map((token) => {
          const isAvailable = availableTokenIds.includes(token.id);
          
          return (
            <button
              key={token.id}
              onClick={() => isAvailable && onTokenSelect(token.id)}
              disabled={!isAvailable}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                !isAvailable
                  ? "border-gray-200 opacity-50 cursor-not-allowed"
                  : selectedTokenId === token.id
                  ? "border-purple-600 shadow-lg scale-105"
                  : "border-gray-200 hover:border-purple-400 hover:shadow-md cursor-pointer"
              }`}
            >
            <div className="aspect-square">
              <NFTImage 
                tokenId={token.id} 
                className="w-full h-full object-cover"
                showDetails={false}
              />
            </div>
            
            <div className="p-3 bg-white">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {token.name || `Token #${token.id}`}
              </h4>
              
              {token.totalSupply && (
                <p className="text-xs text-gray-600 mt-1">
                  {locale === "ja" 
                    ? `${token.totalSupply}個 発行済み` 
                    : `${token.totalSupply} minted`}
                </p>
              )}
              
              {token.price && token.price !== "0" && (
                <p className="text-sm font-bold text-purple-600 mt-1">
                  {token.price} {process.env.NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL || "MATIC"}
                </p>
              )}
            </div>

            {selectedTokenId === token.id && isAvailable && (
              <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            {!isAvailable && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <p className="font-bold text-sm">
                    {locale === "ja" ? "現在販売しておりません" : "Currently not for sale"}
                  </p>
                </div>
              </div>
            )}
          </button>
          );
        })}
      </div>

      {tokens.length > 1 && (
        <p className="text-sm text-gray-600 text-center mt-4">
          {locale === "ja" 
            ? `${tokens.length}個のトークンが利用可能です` 
            : `${tokens.length} tokens available`}
        </p>
      )}
    </div>
  );
}