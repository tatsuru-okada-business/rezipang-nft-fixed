"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, toWei } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

const translations = {
  en,
  ja,
} as const;

interface MintControlsProps {
  locale?: string;
}

export function MintControls({ locale = "en" }: MintControlsProps) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const account = useActiveAccount();
  const [quantity, setQuantity] = useState(1);
  const [mintPrice, setMintPrice] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  
  const { mutate: sendTransaction } = useSendTransaction();

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

  // 価格情報の取得
  useEffect(() => {
    async function fetchPrice() {
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

        // 価格を取得する一般的な関数を試す
        const priceFunctions = [
          "function price() view returns (uint256)",
          "function mintPrice() view returns (uint256)",
          "function cost() view returns (uint256)",
          "function publicPrice() view returns (uint256)",
        ];

        for (const func of priceFunctions) {
          try {
            const price = await readContract({
              contract,
              method: func as any,
              params: [],
            });
            if (price) {
              // Wei to Ether変換
              const priceInEther = (BigInt(price.toString()) / BigInt(10 ** 18)).toString();
              const priceWithDecimals = (Number(price.toString()) / 10 ** 18).toFixed(4);
              setMintPrice(priceWithDecimals);
              break;
            }
          } catch (e) {
            // この関数は存在しない
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching price:", error);
        setLoading(false);
      }
    }

    fetchPrice();
  }, []);

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
      const totalValue = mintPrice !== "0" 
        ? toWei((Number(mintPrice) * quantity).toString())
        : BigInt(0);

      // ミント関数を試す
      const transaction = prepareContractCall({
        contract,
        method: "function mint(address to, uint256 amount)",
        params: [account.address, BigInt(quantity)],
        value: totalValue, // 支払い金額
      });

      sendTransaction(transaction, {
        onSuccess: () => {
          setMintSuccess(true);
          setMinting(false);
        },
        onError: (error) => {
          console.error("Mint error:", error);
          setMintError(error.message || "Failed to mint NFT");
          setMinting(false);
        },
      });
    } catch (error) {
      console.error("Mint preparation error:", error);
      setMintError(error instanceof Error ? error.message : "Failed to prepare mint transaction");
      setMinting(false);
    }
  };

  const totalCost = Number(mintPrice) * quantity;
  const currencySymbol = "ZENY"; // 強制的にZENY表示

  if (!account) {
    return (
      <div className="text-center text-gray-600 py-8">
        {t.wallet.notConnected}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 価格表示 */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-700 font-medium">
            {locale === "ja" ? "価格" : "Price"}
          </span>
          <span className="text-xl font-bold">
            {mintPrice === "0" ? (
              locale === "ja" ? "無料" : "Free"
            ) : (
              `${mintPrice} ${currencySymbol}`
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
          {isAllowlisted ? t.wallet.allowlisted : t.wallet.notAllowlisted}
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
            {locale === "ja" ? `${quantity}個ミントする` : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`}
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
          {t.mint.error}: {mintError}
        </div>
      )}

      {/* 成功表示 */}
      {mintSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center">
          <div className="text-xl mb-2">🎉</div>
          <div className="font-bold">{t.mint.success}</div>
          <button
            type="button"
            onClick={() => {
              setMintSuccess(false);
              setQuantity(1);
            }}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {t.mint.mintAnother}
          </button>
        </div>
      )}
    </div>
  );
}