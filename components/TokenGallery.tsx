"use client";

import { useState, useEffect } from "react";
import { NFTImage } from "./NFTImage";
// より安全なバージョンを使用する場合はこちら
// import { NFTImageSafe as NFTImage } from "./NFTImageSafe";
import type { TokenMetadata } from "@/lib/tokenMetadata";
import { formatPrice, isInSalesPeriod } from "@/lib/formatPrice";

interface TokenGalleryProps {
  onTokenSelect: (tokenId: number) => void;
  selectedTokenId: number;
  locale?: string;
}

// ギャラリーデータをコンポーネント外でキャッシュ
let cachedTokens: TokenMetadata[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

export function TokenGallery({ onTokenSelect, selectedTokenId, locale = "en" }: TokenGalleryProps) {
  const [tokens, setTokens] = useState<TokenMetadata[]>(cachedTokens || []);
  const [loading, setLoading] = useState(!cachedTokens);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTokens() {
      // キャッシュが有効な場合は使用
      const now = Date.now();
      if (cachedTokens && (now - cacheTimestamp < CACHE_DURATION)) {
        setTokens(cachedTokens);
        setLoading(false);
        return;
      }

      try {
        // まず管理設定から表示可能なトークンを取得
        const settingsResponse = await fetch('/api/token-settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.tokens && settingsData.tokens.length > 0) {
            // 管理設定のトークンを使用
            cachedTokens = settingsData.tokens;
            cacheTimestamp = now;
            setTokens(settingsData.tokens);
            setLoading(false);
            return;
          }
        }
        
        // 管理設定がない場合は従来のAPIを使用
        const response = await fetch('/api/tokens?source=auto');
        if (!response.ok) {
          throw new Error('Failed to fetch tokens');
        }
        
        const data = await response.json();
        // 発行枚数が0のトークンと汎用名のトークンを除外
        const tokensWithSupply = (data.tokens || []).filter((token: TokenMetadata) => {
          const supply = parseInt(token.totalSupply || '0');
          const hasGenericName = token.name?.match(/^Token #\d+$/);
          return supply > 0 && !hasGenericName;
        });
        cachedTokens = tokensWithSupply;
        cacheTimestamp = now;
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
        {tokens.map((token, index) => {
          const tokenId = token.tokenId || token.id || index;
          // 販売期間が設定されていない場合は常に販売中として扱う
          const inSalesPeriod = !token.salesPeriodEnabled || isInSalesPeriod(token);
          const isClickable = inSalesPeriod && selectedTokenId !== tokenId;
          
          return (
            <button
              key={`token-${tokenId}`}
              onClick={() => inSalesPeriod && onTokenSelect(tokenId)}
              type="button"
              disabled={!inSalesPeriod}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                selectedTokenId === tokenId
                  ? "border-purple-600 shadow-lg scale-105"
                  : inSalesPeriod
                    ? "border-gray-200 hover:border-purple-400 hover:shadow-md cursor-pointer"
                    : "border-gray-200 cursor-not-allowed opacity-75"
              }`}
            >
            <div className="aspect-square relative">
              <NFTImage 
                tokenId={tokenId} 
                className="w-full h-full object-cover"
                showDetails={false}
              />
              {!inSalesPeriod && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center px-2">
                    <p className="font-bold text-sm">
                      {locale === "ja" ? "販売終了" : "Sale Ended"}
                    </p>
                    <p className="text-xs mt-1">
                      {locale === "ja" ? "現在購入できません" : "Currently unavailable"}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-white">
              <h4 className="font-semibold text-gray-900 text-sm truncate">
                {token.name || `Token #${tokenId}`}
              </h4>
              
              {token.totalSupply && (
                <p className="text-xs text-gray-600 mt-1">
                  {locale === "ja" 
                    ? `${token.totalSupply}個 発行済み` 
                    : `${token.totalSupply} minted`}
                </p>
              )}
              
              {inSalesPeriod ? (
                token.price === undefined || token.price === null ? (
                  <p className="text-sm text-gray-500 mt-1">
                    {locale === "ja" ? "価格読込中..." : "Loading price..."}
                  </p>
                ) : token.currencySymbol ? (
                  <p className="text-sm font-bold text-purple-600 mt-1">
                    {formatPrice(token.price, token.currency || '')} {token.currencySymbol}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-purple-600 mt-1">
                    {formatPrice(token.price, token.currency || '')}
                  </p>
                )
              ) : (
                <p className="text-sm font-bold text-gray-400 mt-1">
                  {locale === "ja" ? "販売終了" : "Sale Ended"}
                </p>
              )}
            </div>

            {selectedTokenId === tokenId && (
              <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
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