"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, toWei } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";

interface TokenSelectorProps {
  locale?: string;
}

export function TokenSelector({ locale = "en" }: TokenSelectorProps) {
  const account = useActiveAccount();
  const [selectedTokenId, setSelectedTokenId] = useState<number>(4); // Token #4をデフォルト
  const [quantity, setQuantity] = useState(1);
  const [tokenPrice, setTokenPrice] = useState<string>("0");
  const [tokenSupply, setTokenSupply] = useState<{ total: string; max: string }>({ total: "0", max: "0" });
  const [tokenUri, setTokenUri] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  
  const { mutate: sendTransaction } = useSendTransaction();

  // 環境変数から有効なトークンIDを取得（カンマ区切り）
  const getAvailableTokenIds = (): number[] => {
    const tokenIds = process.env.NEXT_PUBLIC_AVAILABLE_TOKEN_IDS || "4";
    return tokenIds.split(",").map(id => parseInt(id.trim()));
  };

  const availableTokenIds = getAvailableTokenIds();

  // アローリストチェック
  useEffect(() => {
    async function checkAllowlist() {
      if (!account?.address) {
        setIsAllowlisted(null);
        return;
      }

      try {
        const response = await fetch("/api/verify-allowlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address: account.address }),
        });

        const data = await response.json();
        setIsAllowlisted(data.isAllowlisted);
      } catch (error) {
        console.error("Error checking allowlist:", error);
        setIsAllowlisted(false);
      }
    }

    checkAllowlist();
  }, [account?.address]);

  // トークン情報の取得
  useEffect(() => {
    async function fetchTokenInfo() {
      if (!contractAddress) {
        setLoading(false);
        return;
      }

      try {
        const contract = getContract({
          client,
          chain,
          address: contractAddress,
        });

        // ERC1155の場合のトークン情報取得
        try {
          // URI取得
          const uri = await readContract({
            contract,
            method: "function uri(uint256 tokenId) view returns (string)",
            params: [BigInt(selectedTokenId)],
          });
          setTokenUri(uri as string);
        } catch (e) {
          console.log("Could not fetch URI");
        }

        // 供給量取得（ERC1155）
        try {
          const supply = await readContract({
            contract,
            method: "function totalSupply(uint256 id) view returns (uint256)",
            params: [BigInt(selectedTokenId)],
          });
          setTokenSupply(prev => ({ ...prev, total: supply?.toString() || "0" }));
        } catch (e) {
          console.log("Could not fetch token supply");
        }

        // 価格取得（トークンIDごと）
        const priceFunctions = [
          { 
            name: "getPrice", 
            method: "function getPrice(uint256 tokenId) view returns (uint256)",
            params: [BigInt(selectedTokenId)]
          },
          { 
            name: "pricePerToken", 
            method: "function pricePerToken(uint256 tokenId) view returns (uint256)",
            params: [BigInt(selectedTokenId)]
          },
          { 
            name: "tokenPrice", 
            method: "function tokenPrice(uint256 tokenId) view returns (uint256)",
            params: [BigInt(selectedTokenId)]
          },
          // トークンIDに関係ない価格関数も試す
          { 
            name: "price", 
            method: "function price() view returns (uint256)",
            params: []
          },
        ];

        for (const func of priceFunctions) {
          try {
            const price = await readContract({
              contract,
              method: func.method as any,
              params: func.params as unknown[],
            });
            if (price) {
              const priceWithDecimals = (Number(price.toString()) / 10 ** 18).toFixed(4);
              setTokenPrice(priceWithDecimals);
              console.log(`Price found with ${func.name}: ${priceWithDecimals}`);
              break;
            }
          } catch (e) {
            // この関数は存在しない
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching token info:", error);
        setLoading(false);
      }
    }

    fetchTokenInfo();
  }, [selectedTokenId]);

  const handleMint = async () => {
    if (!account || !contractAddress) return;

    setMinting(true);
    setMintError(null);
    setMintSuccess(false);

    try {
      const contract = getContract({
        client,
        chain,
        address: contractAddress,
      });

      // 価格計算
      const totalValue = tokenPrice !== "0" 
        ? toWei((Number(tokenPrice) * quantity).toString())
        : BigInt(0);

      // ERC1155用のミント関数を試す
      const mintFunctions = [
        {
          name: "claim",
          method: "function claim(address receiver, uint256 tokenId, uint256 quantity)",
          params: [account.address, BigInt(selectedTokenId), BigInt(quantity)]
        },
        {
          name: "mint",
          method: "function mint(address to, uint256 id, uint256 amount)",
          params: [account.address, BigInt(selectedTokenId), BigInt(quantity)]
        },
        {
          name: "purchase",
          method: "function purchase(uint256 tokenId, uint256 amount)",
          params: [BigInt(selectedTokenId), BigInt(quantity)]
        },
      ];

      let success = false;
      for (const func of mintFunctions) {
        if (success) break;
        
        try {
          const transaction = prepareContractCall({
            contract,
            method: func.method as any,
            params: func.params as unknown[],
            value: totalValue,
          });

          sendTransaction(transaction, {
            onSuccess: () => {
              setMintSuccess(true);
              setMinting(false);
              success = true;
            },
            onError: (error) => {
              console.error(`${func.name} error:`, error);
              setMintError(error.message || "Failed to mint NFT");
            },
          });
        } catch (error) {
          console.error(`${func.name} preparation error:`, error);
        }
      }

      if (!success) {
        setMinting(false);
      }
    } catch (error) {
      console.error("Mint error:", error);
      setMintError(error instanceof Error ? error.message : "Failed to mint");
      setMinting(false);
    }
  };

  const totalCost = Number(tokenPrice) * quantity;
  const currencySymbol = chain.id === 137 ? "MATIC" : 
                        chain.id === 1 ? "ETH" : 
                        chain.id === 11155111 ? "SepoliaETH" : "ETH";

  if (!account) {
    return (
      <div className="text-center text-gray-600 py-8">
        {locale === "ja" ? "ウォレットを接続してください" : "Please connect your wallet"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* トークン選択 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">
            {locale === "ja" ? "トークンを選択" : "Select Token"}
          </label>
          <select
            value={selectedTokenId}
            onChange={(e) => setSelectedTokenId(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {availableTokenIds.map(id => (
              <option key={id} value={id}>
                Token #{id}
              </option>
            ))}
          </select>
        </div>

        {/* トークン情報 */}
        <div className="bg-gray-50 rounded p-3 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Token ID:</span>
            <span className="font-semibold">#{selectedTokenId}</span>
          </div>
          {tokenSupply.total !== "0" && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">
                {locale === "ja" ? "発行済み:" : "Minted:"}
              </span>
              <span className="font-semibold">{tokenSupply.total}</span>
            </div>
          )}
        </div>
      </div>

      {/* 価格と数量 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700 font-medium">
            {locale === "ja" ? "価格 (Token #" + selectedTokenId + ")" : "Price (Token #" + selectedTokenId + ")"}
          </span>
          <span className="text-xl font-bold">
            {tokenPrice === "0" ? (
              locale === "ja" ? "無料" : "Free"
            ) : (
              `${tokenPrice} ${currencySymbol}`
            )}
          </span>
        </div>

        {/* 数量選択 */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700 font-medium">
            {locale === "ja" ? "数量" : "Quantity"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="w-12 text-center font-semibold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
              disabled={quantity >= 10}
            >
              +
            </button>
          </div>
        </div>

        {/* 合計 */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">
              {locale === "ja" ? "合計" : "Total"}
            </span>
            <span className="text-2xl font-bold text-purple-600">
              {totalCost === 0 ? (
                locale === "ja" ? "無料" : "Free"
              ) : (
                `${totalCost.toFixed(4)} ${currencySymbol}`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* アローリストステータス */}
      {isAllowlisted !== null && (
        <div className={`text-center p-3 rounded-lg ${
          isAllowlisted ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {isAllowlisted 
            ? (locale === "ja" ? "✅ アローリスト登録済み" : "✅ You are allowlisted")
            : (locale === "ja" ? "❌ アローリスト未登録" : "❌ Not allowlisted")
          }
        </div>
      )}

      {/* ミントボタン */}
      <button
        type="button"
        onClick={handleMint}
        disabled={minting || !isAllowlisted}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-[1.02] ${
          minting || !isAllowlisted
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg"
        }`}
      >
        {minting ? (
          locale === "ja" ? "ミント中..." : "Minting..."
        ) : (
          <>
            {locale === "ja" 
              ? `Token #${selectedTokenId} を${quantity}個ミント` 
              : `Mint ${quantity} × Token #${selectedTokenId}`
            }
            {totalCost > 0 && (
              <span className="block text-sm mt-1 opacity-90">
                {totalCost.toFixed(4)} {currencySymbol}
              </span>
            )}
          </>
        )}
      </button>

      {/* エラー表示 */}
      {mintError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Error: {mintError}
        </div>
      )}

      {/* 成功表示 */}
      {mintSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
          <div className="text-xl mb-2">🎉</div>
          <div className="font-bold">
            Token #{selectedTokenId} {locale === "ja" ? "のミントに成功しました！" : "minted successfully!"}
          </div>
          <button
            type="button"
            onClick={() => {
              setMintSuccess(false);
              setQuantity(1);
            }}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {locale === "ja" ? "もう一度ミント" : "Mint Another"}
          </button>
        </div>
      )}
    </div>
  );
}