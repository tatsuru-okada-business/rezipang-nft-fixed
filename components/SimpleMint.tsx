"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, toWei } from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import { getNFTName, getPaymentInfo, isFeatureEnabled } from "@/lib/projectConfig";
import { NFTImage } from "./NFTImage";
import { TokenGallery } from "./TokenGallery";

interface SimpleMintProps {
  locale?: string;
}

export function SimpleMint({ locale = "en" }: SimpleMintProps) {
  const account = useActiveAccount();
  const [quantity, setQuantity] = useState(1);
  const [mintPrice, setMintPrice] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [maxMintAmount, setMaxMintAmount] = useState<number>(1);
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [showGallery, setShowGallery] = useState(false);
  
  const { mutate: sendTransaction } = useSendTransaction();

  // Token ID - allow user selection or use default
  const defaultTokenId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ID || "2");
  const [tokenId, setTokenId] = useState(defaultTokenId);

  // Payment token configuration from project config
  const paymentInfo = getPaymentInfo();
  const paymentTokenAddress = paymentInfo?.address || process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS;
  const paymentTokenSymbol = paymentInfo?.symbol || process.env.NEXT_PUBLIC_PAYMENT_TOKEN_SYMBOL || "MATIC";
  const configuredMintPrice = paymentInfo?.price || process.env.NEXT_PUBLIC_MINT_PRICE || "0";

  // アローリストチェック（最大MINT数も取得）
  useEffect(() => {
    async function checkAllowlist() {
      if (!account?.address) {
        setIsAllowlisted(null);
        setMaxMintAmount(1);
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
        setMaxMintAmount(data.maxMintAmount || 1);
        
        // 数量を最大MINT数以下に制限
        if (quantity > data.maxMintAmount) {
          setQuantity(data.maxMintAmount);
        }
      } catch (error) {
        console.error("Error checking allowlist:", error);
        setIsAllowlisted(false);
        setMaxMintAmount(1);
      }
    }

    checkAllowlist();
  }, [account?.address, quantity]);

  // 価格と供給量の取得
  useEffect(() => {
    async function fetchContractInfo() {
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

        // 供給量を取得
        try {
          // ERC1155の場合
          const supply = await readContract({
            contract,
            method: "function totalSupply(uint256 id) view returns (uint256)",
            params: [BigInt(tokenId)],
          });
          setTotalSupply(supply?.toString() || "0");
        } catch (e) {
          // ERC721の場合
          try {
            const supply = await readContract({
              contract,
              method: "function totalSupply() view returns (uint256)",
              params: [],
            });
            setTotalSupply(supply?.toString() || "0");
          } catch (e2) {
            console.log("Could not fetch supply");
          }
        }

        // 設定された価格を使用
        setMintPrice(configuredMintPrice);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching contract info:", error);
        setLoading(false);
      }
    }

    fetchContractInfo();
  }, [tokenId, configuredMintPrice]);

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

      // ZENY支払いの場合の処理
      if (paymentTokenAddress && mintPrice !== "0") {
        const paymentToken = getContract({
          client,
          chain,
          address: paymentTokenAddress,
        });

        // 合計支払い額を計算
        const totalPayment = toWei((Number(mintPrice) * quantity).toString());

        // まずZENYトークンのapprove
        try {
          const approveTx = approve({
            contract: paymentToken,
            spender: contractAddress,
            amount: totalPayment.toString(),
          });

          sendTransaction(approveTx, {
            onSuccess: () => {
              console.log("ZENY approval successful, proceeding to mint...");
              // Approveが成功したらミント実行
              executeMint();
            },
            onError: (error) => {
              console.error("ZENY approval failed:", error);
              setMintError(locale === "ja" 
                ? `ZENY承認失敗: ${error.message}` 
                : `ZENY approval failed: ${error.message}`);
              setMinting(false);
            },
          });
        } catch (error) {
          console.error("Error preparing ZENY approval:", error);
          setMintError(locale === "ja" 
            ? "ZENY承認の準備に失敗しました" 
            : "Failed to prepare ZENY approval");
          setMinting(false);
        }
      } else {
        // MATICまたは無料の場合は直接ミント
        executeMint();
      }
    } catch (error) {
      console.error("Mint error:", error);
      setMintError(error instanceof Error ? error.message : "Failed to mint");
      setMinting(false);
    }
  };

  const executeMint = async () => {
    if (!account || !contractAddress) return;

    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // MATICの場合の支払い金額（ZENYの場合は0）
    const totalValue = paymentTokenAddress ? BigInt(0) : toWei((Number(mintPrice) * quantity).toString());

    // ミント関数のパターンを試す
    const mintAttempts = [
      // ERC1155パターン
      {
        name: "mint (ERC1155)",
        method: "function mint(address to, uint256 id, uint256 amount)",
        params: [account.address, BigInt(tokenId), BigInt(quantity)]
      },
      {
        name: "mintTo (ERC1155)",
        method: "function mintTo(address to, uint256 tokenId, uint256 amount)",
        params: [account.address, BigInt(tokenId), BigInt(quantity)]
      },
      // ERC721パターン
      {
        name: "mint (ERC721)",
        method: "function mint(address to, uint256 amount)",
        params: [account.address, BigInt(quantity)]
      },
      {
        name: "mint (simple)",
        method: "function mint(uint256 amount)",
        params: [BigInt(quantity)]
      },
      // Public mint
      {
        name: "publicMint",
        method: "function publicMint(uint256 quantity)",
        params: [BigInt(quantity)]
      },
    ];

    let success = false;
    
    for (const attempt of mintAttempts) {
      if (success) break;
      
      try {
        console.log(`Trying ${attempt.name}...`);
        
        const transaction = prepareContractCall({
          contract,
          method: attempt.method as any,
          params: attempt.params as unknown[],
          value: totalValue,
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            console.log(`Success with ${attempt.name}!`);
            setMintSuccess(true);
            setMinting(false);
            success = true;
          },
          onError: (error) => {
            console.error(`${attempt.name} failed:`, error);
            setMintError(`Failed: ${error.message}`);
            setMinting(false);
          },
        });

        // トランザクションが送信されたら待つ
        if (!success) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (error) {
        console.error(`${attempt.name} preparation failed:`, error);
      }
    }

    if (!success && !minting) {
      setMintError("Could not find valid mint function. Please check contract.");
      setMinting(false);
    }
  };

  const totalCost = Number(mintPrice) * quantity;
  const currencySymbol = paymentTokenAddress ? paymentTokenSymbol : (chain.id === 137 ? "MATIC" : "ETH");

  if (!account) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-700 font-medium mb-4">
          {locale === "ja" ? "ミントするにはウォレットを接続してください" : "Connect wallet to mint"}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <div className="text-gray-700 font-medium mt-4">
          {locale === "ja" ? "読み込み中..." : "Loading..."}
        </div>
      </div>
    );
  }

  // Handle token selection
  const handleTokenSelect = (newTokenId: number) => {
    setTokenId(newTokenId);
    setShowGallery(false);
    // Reset states when changing token
    setMintPrice(configuredMintPrice);
    setTotalSupply("0");
    setLoading(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Token Gallery Toggle - 設定で制御 */}
      {isFeatureEnabled('showTokenGallery') && (
        <>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowGallery(!showGallery)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-purple-500 text-purple-700 font-semibold rounded-lg hover:bg-purple-50 transition-all shadow-md hover:shadow-lg"
            >
              <span className="text-2xl">🎨</span>
              <span>
                {showGallery 
                  ? (locale === "ja" ? "ギャラリーを閉じる" : "Close Gallery")
                  : (locale === "ja" ? "全トークンを表示" : "View All Tokens")
                }
              </span>
            </button>
          </div>

          {/* Token Gallery */}
          {showGallery && (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <TokenGallery 
                onTokenSelect={handleTokenSelect}
                selectedTokenId={tokenId}
                locale={locale}
              />
            </div>
          )}
        </>
      )}

      {/* NFT情報カード */}
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-200">
          {/* NFT Image Display */}
          <div className="mb-4">
            <NFTImage 
              tokenId={tokenId} 
              className="w-full max-w-sm mx-auto"
              showDetails={true}
            />
          </div>

          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {getNFTName(tokenId)}
            </h3>
            {totalSupply !== "0" && (
              <p className="text-sm text-gray-700 font-medium">
                {locale === "ja" ? `${totalSupply}個 発行済み` : `${totalSupply} minted`}
              </p>
            )}
          </div>

        {/* 価格表示 */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-800 font-semibold">
              {locale === "ja" ? "価格" : "Price"}
            </span>
            <span className="text-2xl font-bold text-purple-600">
              {mintPrice === "0" ? (
                locale === "ja" ? "無料" : "Free"
              ) : (
                `${mintPrice} ${currencySymbol}`
              )}
            </span>
          </div>
        </div>

        {/* 数量選択 */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-800 font-semibold">
              {locale === "ja" ? "数量" : "Quantity"}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors flex items-center justify-center text-purple-700 font-bold"
                disabled={quantity <= 1}
              >
                -
              </button>
              <span className="w-12 text-center text-xl font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(Math.min(maxMintAmount, quantity + 1))}
                className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 transition-colors flex items-center justify-center text-purple-700 font-bold"
                disabled={quantity >= maxMintAmount}
              >
                +
              </button>
            </div>
          </div>
          {maxMintAmount > 1 && (
            <p className="text-xs text-gray-600 text-center mt-2">
              {locale === "ja" 
                ? `最大${maxMintAmount}枚までミント可能` 
                : `Max ${maxMintAmount} NFTs per wallet`}
            </p>
          )}
        </div>

          {/* 合計 */}
          {totalCost > 0 && (
            <div className="text-center text-sm text-gray-700 font-medium mb-4">
              {locale === "ja" ? "合計: " : "Total: "}
              <span className="font-bold text-lg text-gray-900">
                {totalCost.toFixed(1)} {currencySymbol}
              </span>
            </div>
          )}
        </div>

        {/* アローリストステータス */}
        {isAllowlisted !== null && !isAllowlisted && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-center text-red-800 font-semibold">
            {locale === "ja" 
              ? "⚠️ あなたのウォレットはアローリストに登録されていません" 
              : "⚠️ Your wallet is not on the allowlist"
            }
          </div>
        )}

        {/* ミントボタン */}
        <button
          type="button"
          onClick={handleMint}
          disabled={minting || (isAllowlisted === false)}
          className={`w-full py-4 rounded-xl font-extrabold text-lg transition-all transform ${
            minting || (isAllowlisted === false)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-purple-700"
          }`}
        >
          {minting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              {locale === "ja" ? "ミント中..." : "Minting..."}
            </span>
          ) : (
            <>
              {locale === "ja" ? "NFTをミント" : "Mint NFT"}
              {quantity > 1 && ` (${quantity})`}
            </>
          )}
        </button>

        {/* エラー表示 */}
        {mintError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-800 text-sm font-medium">
            <div className="font-semibold mb-1">
              {locale === "ja" ? "エラー" : "Error"}
            </div>
            {mintError}
          </div>
        )}

        {/* 成功表示 */}
        {mintSuccess && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-green-800 font-bold text-lg mb-3">
              {locale === "ja" 
                ? "ミント成功！" 
                : "Mint Successful!"
              }
            </div>
            <button
              type="button"
              onClick={() => {
                setMintSuccess(false);
                setQuantity(1);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {locale === "ja" ? "もう一度ミント" : "Mint Again"}
            </button>
          </div>
        )}

        {/* ヘルプテキスト */}
        <div className="text-center text-xs text-gray-700 font-medium">
          {paymentTokenAddress 
            ? (locale === "ja" 
              ? `※ ${currencySymbol}トークンでの支払いが必要です` 
              : `※ Payment in ${currencySymbol} tokens required`)
            : (locale === "ja" 
              ? "※ ガス代が別途必要です" 
              : "※ Gas fees will be required")
          }
        </div>
      </div>
    </div>
  );
}