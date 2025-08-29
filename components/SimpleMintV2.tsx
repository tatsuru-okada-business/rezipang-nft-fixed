"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import { NFTImage } from "./NFTImage";
import { TokenGallery } from "./TokenGallery";
import { isFeatureEnabled } from "@/lib/projectConfig";

interface SimpleMintProps {
  locale?: string;
}

interface TokenConfig {
  tokenId: number;
  name: string;
  description: string;
  price: string;  // Wei単位の価格
  currency: string;
  currencySymbol: string;
  currencyAddress?: string;
  currencyDecimals?: number;
  currencyIsNative?: boolean;
  maxSupply?: number;
  currentSupply?: number;
}

export function SimpleMint({ locale = "en" }: SimpleMintProps) {
  const account = useActiveAccount();
  const [quantity, setQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [maxMintAmount, setMaxMintAmount] = useState<number>(1);
  const [showGallery, setShowGallery] = useState(false);
  
  // トークン情報
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenConfig[]>([]);
  
  const { mutate: sendTransaction } = useSendTransaction();

  // デフォルトトークンとすべてのトークン情報を読み込む
  useEffect(() => {
    async function loadTokenData() {
      try {
        // admin-configから全トークン情報を取得
        const configResponse = await fetch('/api/tokens');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          const tokens = configData.tokens.map((t: any) => {
            const tokenIdValue = t.id !== undefined ? t.id : (t.tokenId !== undefined ? t.tokenId : null);
            console.log(`Token ${tokenIdValue} full data:`, t);
            console.log(`Token ${tokenIdValue} data:`, {
              tokenId: tokenIdValue,
              price: t.price,
              currency: t.currency,
              currencySymbol: t.currencySymbol,
              currencyDecimals: t.currencyDecimals
            });
            
            // 通貨情報が完全でない場合はnullを返す
            if (!t.currency || !t.currencySymbol) {
              console.warn(`Token ${t.id || t.tokenId} has incomplete currency data`);
              return null;
            }
            
            return {
              tokenId: tokenIdValue,
              name: t.name,
              description: t.description || '',
              price: t.price || '0',
              currency: t.currency,
              currencySymbol: t.currencySymbol,
              currencyAddress: t.currency,
              currencyDecimals: t.currencyDecimals || 18,
              currencyIsNative: t.currencyIsNative !== false,
              maxSupply: t.maxSupply,
              currentSupply: t.currentSupply || 0
            };
          }).filter(t => t !== null) as TokenConfig[];
          setAvailableTokens(tokens);
          
          // デフォルトトークンを取得
          const defaultResponse = await fetch('/api/default-token');
          if (defaultResponse.ok) {
            const defaultData = await defaultResponse.json();
            if (defaultData.token) {
              const defaultToken = tokens.find(t => t.tokenId === defaultData.token.tokenId);
              if (defaultToken) {
                setTokenId(defaultToken.tokenId);
                setTokenConfig(defaultToken);
              } else if (tokens.length > 0) {
                // デフォルトトークンが見つからない場合のみ最初のトークンを選択
                setTokenId(tokens[0].tokenId);
                setTokenConfig(tokens[0]);
              }
            } else if (tokens.length > 0) {
              // デフォルトトークンが設定されていない場合のみ最初のトークンを選択
              setTokenId(tokens[0].tokenId);
              setTokenConfig(tokens[0]);
            }
          } else if (tokens.length > 0) {
            // デフォルトトークンAPIが失敗した場合のみ最初のトークンを選択
            setTokenId(tokens[0].tokenId);
            setTokenConfig(tokens[0]);
          }
        }
      } catch (error) {
        console.error('Error loading token data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadTokenData();
  }, []);

  // アローリストチェック（CSVベース）
  useEffect(() => {
    async function checkAllowlist() {
      if (!account?.address || tokenId === null) {
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
          body: JSON.stringify({ 
            address: account.address,
            tokenId: tokenId 
          }),
        });

        const data = await response.json();
        setIsAllowlisted(data.isAllowlisted);
        setMaxMintAmount(data.maxMintAmount || 1);
        
        // tokenInfoが返された場合は更新（tokenConfigの更新は削除）
        // 価格情報はトークン選択時に設定済みなので、ここでは更新しない
        
        // 数量を最大MINT数以下に制限
        if (data.maxMintAmount > 0 && quantity > data.maxMintAmount) {
          setQuantity(data.maxMintAmount);
        }
      } catch (error) {
        console.error('アローリストチェックエラー:', error);
        setIsAllowlisted(false);
        setMaxMintAmount(0);
      }
    }

    checkAllowlist();
  }, [account?.address, tokenId]); // tokenConfigを依存配列から削除

  // ミント処理
  const handleMint = async () => {
    if (!account || !contractAddress || !tokenConfig || tokenId === null) return;
    
    setMinting(true);
    setMintError(null);
    
    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });
    
    try {
      // ERC20トークンの判定（currencyAddressが有効なアドレスかつネイティブ通貨でない場合）
      const isERC20 = tokenConfig.currencyAddress && 
        tokenConfig.currencyAddress !== '0x0000000000000000000000000000000000000000' &&
        tokenConfig.currencyAddress !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' &&
        !tokenConfig.currencyIsNative;
      
      // 価格計算
      const decimals = tokenConfig.currencyDecimals || 18;
      const priceStr = String(tokenConfig.price || '0');
      
      // 価格がトークン単位かWei単位かを判定してWei単位に変換
      let pricePerTokenWei: bigint;
      if (typeof tokenConfig.price === 'number' || priceStr.length < 10) {
        // トークン単位の場合、Wei単位に変換
        pricePerTokenWei = BigInt(Math.floor(parseFloat(priceStr) * Math.pow(10, decimals)));
      } else {
        // すでにWei単位の場合
        pricePerTokenWei = BigInt(priceStr);
      }
      
      const totalPaymentWei = pricePerTokenWei * BigInt(quantity);
      
      // 表示用のトークン単位の価格
      const pricePerTokenInTokens = Number(pricePerTokenWei) / Math.pow(10, decimals);
      
      console.log('価格処理:', {
        originalPrice: tokenConfig.price,
        pricePerTokenInTokens: pricePerTokenInTokens,
        pricePerTokenWei: pricePerTokenWei.toString(),
        quantity: quantity,
        totalPaymentWei: totalPaymentWei.toString(),
        currency: tokenConfig.currencySymbol,
        decimals: decimals,
        totalPaymentInTokens: Number(totalPaymentWei) / Math.pow(10, decimals),
        isERC20: isERC20
      });
      
      if (isERC20 && tokenConfig.currencyAddress) {
        const paymentToken = getContract({
          client,
          chain,
          address: tokenConfig.currencyAddress,
        });
        
        console.log('承認処理:', {
          token: tokenConfig.currencySymbol,
          address: tokenConfig.currencyAddress,
          pricePerTokenInTokens: pricePerTokenInTokens,
          pricePerTokenWei: pricePerTokenWei.toString(),
          quantity: quantity,
          decimals: decimals,
          totalPaymentWei: totalPaymentWei.toString(),
          totalPaymentInTokens: Number(totalPaymentWei) / Math.pow(10, decimals)
        });
        
        // 承認トランザクション
        const approveTx = approve({
          contract: paymentToken,
          spender: contractAddress,
          amount: totalPaymentWei.toString(),  // 文字列に変換
        });
        
        console.log('承認トランザクション送信中...');
        
        // 承認トランザクションを送信して完了を待つ
        await new Promise<void>((resolve, reject) => {
          sendTransaction(approveTx, {
            onSuccess: (receipt) => {
              console.log('承認成功:', receipt);
              // トランザクション完了後、少し待機
              setTimeout(() => resolve(), 2000);
            },
            onError: (error) => {
              console.error('承認エラー:', error);
              reject(error);
            },
          });
        });
      }
      
      // ミントトランザクション
      // ネイティブ通貨の場合はvalueに設定、ERC20の場合は0
      const value = isERC20 ? BigInt(0) : totalPaymentWei;
      // claim関数のパラメータ設定
      const mintTx = prepareContractCall({
        contract,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, bytes32[] _allowlistProof, bytes _data)",
        params: [
          account.address,
          BigInt(tokenId),
          BigInt(quantity),
          tokenConfig.currencyAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          pricePerTokenWei,  // 正しいWei値を使用
          [], // Merkle Proofは使用しない
          "0x"
        ],
        value,
      });
      
      console.log('ミント処理:', {
        tokenId: tokenId,
        quantity: quantity,
        currency: tokenConfig.currencyAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        pricePerTokenWei: pricePerTokenWei.toString(),
        value: value.toString(),
        isERC20: isERC20
      });
      
      console.log('ミントトランザクション送信中...');
      
      await new Promise<void>((resolve, reject) => {
        sendTransaction(mintTx, {
          onSuccess: (receipt) => {
            console.log('ミント成功:', receipt);
            setMintSuccess(true);
            setQuantity(1);
            setTimeout(() => setMintSuccess(false), 5000);
            resolve();
          },
          onError: (error) => {
            console.error('ミントエラー:', error);
            reject(error);
          },
        });
      });
      
    } catch (error: any) {
      console.error('Mint error:', error);
      setMintError(
        locale === "ja" 
          ? `ミントエラー: ${error.message || 'トランザクションが失敗しました'}` 
          : `Mint failed: ${error.message || 'Transaction failed'}`
      );
    } finally {
      setMinting(false);
    }
  };

  // トークン選択ハンドラ
  const handleTokenSelect = (newTokenId: number) => {
    console.log('handleTokenSelect called with tokenId:', newTokenId);
    console.log('Available tokens:', availableTokens);
    const newToken = availableTokens.find(t => t.tokenId === newTokenId);
    console.log('Found token:', newToken);
    if (newToken) {
      setTokenId(newTokenId);
      setTokenConfig(newToken);
      setQuantity(1);
    }
  };

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

  if (!tokenConfig || tokenId === null) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-700 font-medium">
          {locale === "ja" ? "利用可能なNFTがありません" : "No NFTs available"}
        </div>
      </div>
    );
  }

  // 価格表示用の処理
  const decimals = tokenConfig.currencyDecimals || 18;
  console.log('Price calculation:', {
    rawPrice: tokenConfig.price,
    decimals: decimals,
    currencySymbol: tokenConfig.currencySymbol,
    priceType: typeof tokenConfig.price
  });
  
  // 価格がトークン単位か Wei単位かを判定
  let displayPrice: number;
  const priceStr = String(tokenConfig.price || '0');
  
  // 数値型または短い文字列（10桁未満）はトークン単位として扱う
  if (typeof tokenConfig.price === 'number' || priceStr.length < 10) {
    displayPrice = parseFloat(priceStr);
  } else {
    // 長い文字列はWei単位として扱う
    const priceInWei = BigInt(priceStr);
    displayPrice = Number(priceInWei) / Math.pow(10, decimals);
  }
  
  const totalCost = displayPrice * quantity;
  console.log('Display values:', {
    displayPrice: displayPrice,
    totalCost: totalCost
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* トークンギャラリー切り替えボタン */}
      {isFeatureEnabled('showTokenGallery') && availableTokens.length > 1 && (
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

          {/* トークンギャラリー */}
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
          {/* NFT画像 */}
          <div className="mb-4">
            <NFTImage 
              tokenId={tokenId} 
              className="w-full max-w-sm mx-auto"
              showDetails={true}
            />
          </div>
          
          <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {tokenConfig.name}
            </h3>
            {tokenConfig.description && (
              <p className="text-gray-600 text-sm">{tokenConfig.description}</p>
            )}
          </div>
          
          {/* 価格情報カード */}
          <div className="bg-white/80 backdrop-blur rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">
                {locale === "ja" ? "価格" : "Price"}
              </span>
              <span className="text-xl font-bold text-purple-700">
                {tokenConfig.price === undefined || tokenConfig.price === null
                  ? (locale === "ja" ? "価格読込中..." : "Loading price...")
                  : tokenConfig.currencySymbol 
                    ? `${displayPrice.toLocaleString()} ${tokenConfig.currencySymbol}`
                    : `${displayPrice.toLocaleString()}`
                }
              </span>
            </div>
            
            {tokenConfig.maxSupply && (
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">
                  {locale === "ja" ? "残り数量" : "Remaining"}
                </span>
                <span className="text-lg font-semibold">
                  {tokenConfig.maxSupply - (tokenConfig.currentSupply || 0)} / {tokenConfig.maxSupply}
                </span>
              </div>
            )}
            
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">
                  {locale === "ja" ? "合計金額" : "Total Cost"}
                </span>
                <span className="text-2xl font-bold text-purple-700">
                  {tokenConfig.price === undefined || tokenConfig.price === null
                    ? (locale === "ja" ? "計算中..." : "Calculating...")
                    : tokenConfig.currencySymbol 
                      ? `${totalCost.toLocaleString()} ${tokenConfig.currencySymbol}`
                      : `${totalCost.toLocaleString()}`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* アローリスト状態 */}
          <div className="mt-4">
            {isAllowlisted === null ? (
              <div className="bg-purple-50 border border-purple-200 px-4 py-3 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span className="font-semibold text-purple-700">
                    {locale === "ja" 
                      ? "発行可能枚数を確認中..."
                      : "Checking minting eligibility..."
                    }
                  </span>
                </div>
              </div>
            ) : isAllowlisted ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-center">
                <span className="font-semibold">
                  {locale === "ja" 
                    ? `✅ アローリストに登録されています（最大${maxMintAmount}枚）`
                    : `✅ You are allowlisted (Max ${maxMintAmount} NFTs)`
                  }
                </span>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-center">
                <span className="font-semibold">
                  {locale === "ja" 
                      ? "❌ アローリストに登録されていません（ミント不可）"
                      : "❌ You are not allowlisted (Cannot mint)"
                    }
                  </span>
                </div>
            )}
          </div>

          {/* 数量選択セクション */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between bg-white/60 backdrop-blur rounded-lg p-3">
              <span className="text-gray-700 font-medium">
                {locale === "ja" ? "購入数量" : "Quantity"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => quantity > 0 && setQuantity(quantity - 1)}
                  disabled={quantity <= 0 || isAllowlisted === null || !isAllowlisted}
                  className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-purple-700"
                >
                  -
                </button>
                <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                <button
                  type="button"
                  onClick={() => quantity < maxMintAmount && setQuantity(quantity + 1)}
                  disabled={quantity >= maxMintAmount || isAllowlisted === null || !isAllowlisted}
                  className="w-10 h-10 rounded-full bg-purple-100 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold text-purple-700"
                >
                  +
                </button>
              </div>
            </div>
          </div>

        {/* エラー/成功メッセージ */}
        {mintError && (
          <div className="bg-red-50 text-red-800 px-4 py-3 rounded-lg mb-4">
            {mintError}
          </div>
        )}
        {mintSuccess && (
          <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg mb-4">
            {locale === "ja" ? "✅ ミント成功！" : "✅ Mint successful!"}
          </div>
        )}

          {/* ミントボタン */}
          <button
            type="button"
            onClick={handleMint}
            disabled={minting || !isAllowlisted || quantity === 0 || !tokenConfig.currencySymbol || !tokenConfig.currency}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white transition-all transform hover:scale-105 ${
              minting || !isAllowlisted || quantity === 0 || !tokenConfig.currencySymbol || !tokenConfig.currency
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg'
            }`}
          >
            {minting 
              ? (locale === "ja" ? "処理中..." : "Processing...")
              : (locale === "ja" ? `${quantity}枚ミントする` : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`)
            }
          </button>
        </div>
      </div>
    </div>
  );
}