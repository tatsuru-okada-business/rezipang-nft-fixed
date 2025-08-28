"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, toWei } from "thirdweb";
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
  price: string;
  currency: string;
  currencySymbol: string;
  currencyAddress?: string;
  maxSupply?: number;
  currentSupply?: number;
}

export function SimpleMint({ locale = "en" }: SimpleMintProps) {
  const account = useActiveAccount();
  const [quantity, setQuantity] = useState(1);
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
          const tokens: TokenConfig[] = configData.tokens.map((t: any) => ({
            tokenId: t.thirdweb.tokenId,
            name: t.thirdweb.name,
            description: t.thirdweb.description || '',
            price: t.thirdweb.price || '0',
            currency: t.thirdweb.currency || '0x0000000000000000000000000000000000000000',
            currencySymbol: t.thirdweb.currencySymbol || 'POL',
            currencyAddress: t.thirdweb.currency,
            maxSupply: t.local?.maxSupply,
            currentSupply: t.local?.currentSupply || 0
          }));
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
              }
            }
          }
          
          // デフォルトがない場合は最初のトークンを選択
          if (!tokenId && tokens.length > 0) {
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
        
        // tokenInfoが返された場合は更新
        if (data.tokenInfo && tokenConfig) {
          setTokenConfig({
            ...tokenConfig,
            price: data.tokenInfo.price || tokenConfig.price,
            currency: data.tokenInfo.currency || tokenConfig.currency,
            currencySymbol: data.tokenInfo.currencySymbol || tokenConfig.currencySymbol
          });
        }
        
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
  }, [account?.address, tokenId, tokenConfig]);

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
      // ERC20トークンの場合は承認処理
      const isERC20 = tokenConfig.currencyAddress && 
        tokenConfig.currencyAddress !== '0x0000000000000000000000000000000000000000' &&
        tokenConfig.currencyAddress !== '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      
      if (isERC20) {
        const paymentToken = getContract({
          client,
          chain,
          address: tokenConfig.currencyAddress,
        });
        
        // 価格計算（通貨に応じた小数点処理）
        const decimals = tokenConfig.currencySymbol === 'USDC' ? 6 : 18;
        const totalPayment = BigInt(Math.floor(Number(tokenConfig.price) * quantity * Math.pow(10, decimals)));
        
        // 承認トランザクション
        const approveTx = approve({
          contract: paymentToken,
          spender: contractAddress,
          amount: totalPayment.toString(),
        });
        
        await new Promise<void>((resolve, reject) => {
          sendTransaction(approveTx, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error),
          });
        });
      }
      
      // ミントトランザクション
      const value = isERC20 ? BigInt(0) : toWei((Number(tokenConfig.price) * quantity).toString());
      
      // シンプルなclaim関数を使用
      const mintTx = prepareContractCall({
        contract,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, bytes32[] _allowlistProof, bytes _data)",
        params: [
          account.address,
          BigInt(tokenId),
          BigInt(quantity),
          tokenConfig.currencyAddress || "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          BigInt(Math.floor(Number(tokenConfig.price) * 1e18)), // Wei単位
          [], // Merkle Proofは使用しない
          "0x"
        ],
        value,
      });
      
      await new Promise<void>((resolve, reject) => {
        sendTransaction(mintTx, {
          onSuccess: () => {
            setMintSuccess(true);
            setQuantity(1);
            setTimeout(() => setMintSuccess(false), 5000);
            resolve();
          },
          onError: (error) => reject(error),
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
    const newToken = availableTokens.find(t => t.tokenId === newTokenId);
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

  const totalCost = Number(tokenConfig.price) * quantity;

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* トークンギャラリー */}
      {isFeatureEnabled('showTokenGallery') && availableTokens.length > 1 && (
        <div className="mb-6">
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="w-full text-center py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showGallery 
              ? (locale === "ja" ? "ギャラリーを閉じる" : "Close Gallery")
              : (locale === "ja" ? "他のNFTを見る" : "View Other NFTs")
            }
          </button>
          {showGallery && (
            <TokenGallery
              onSelectToken={handleTokenSelect}
              currentTokenId={tokenId}
              locale={locale}
            />
          )}
        </div>
      )}

      {/* NFT情報 */}
      <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
        <div className="mb-4">
          <NFTImage tokenId={tokenId} size="large" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{tokenConfig.name}</h2>
        {tokenConfig.description && (
          <p className="text-gray-600 mb-4">{tokenConfig.description}</p>
        )}
        
        {/* 価格情報 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              {locale === "ja" ? "価格" : "Price"}
            </span>
            <span className="text-xl font-bold">
              {tokenConfig.price} {tokenConfig.currencySymbol}
            </span>
          </div>
          {tokenConfig.maxSupply && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-600">
                {locale === "ja" ? "残り" : "Remaining"}
              </span>
              <span className="text-lg">
                {tokenConfig.maxSupply - (tokenConfig.currentSupply || 0)} / {tokenConfig.maxSupply}
              </span>
            </div>
          )}
        </div>

        {/* アローリスト状態 */}
        {isAllowlisted !== null && (
          <div className="mb-4">
            {isAllowlisted ? (
              <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg">
                {locale === "ja" 
                  ? `✅ アローリストに登録されています（最大${maxMintAmount}枚）`
                  : `✅ You are allowlisted (Max ${maxMintAmount} NFTs)`
                }
              </div>
            ) : (
              <div className="bg-red-50 text-red-800 px-4 py-2 rounded-lg">
                {locale === "ja" 
                  ? "❌ アローリストに登録されていません"
                  : "❌ You are not allowlisted"
                }
              </div>
            )}
          </div>
        )}

        {/* 数量選択 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">
            {locale === "ja" ? "数量" : "Quantity"}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => quantity > 1 && setQuantity(quantity - 1)}
              disabled={quantity <= 1 || !isAllowlisted}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              -
            </button>
            <span className="w-12 text-center font-bold">{quantity}</span>
            <button
              onClick={() => quantity < maxMintAmount && setQuantity(quantity + 1)}
              disabled={quantity >= maxMintAmount || !isAllowlisted}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        {/* 合計価格 */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-gray-600">
            {locale === "ja" ? "合計" : "Total"}
          </span>
          <span className="text-2xl font-bold">
            {totalCost.toFixed(2)} {tokenConfig.currencySymbol}
          </span>
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
          onClick={handleMint}
          disabled={minting || !isAllowlisted || quantity === 0}
          className={`w-full py-4 px-6 rounded-lg font-bold text-white transition-all ${
            minting || !isAllowlisted || quantity === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {minting 
            ? (locale === "ja" ? "処理中..." : "Processing...")
            : (locale === "ja" ? `${quantity}枚ミントする` : `Mint ${quantity} NFT${quantity > 1 ? 's' : ''}`)
          }
        </button>
      </div>
    </div>
  );
}