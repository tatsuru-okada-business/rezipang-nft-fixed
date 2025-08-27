"use client";

import { useState, useEffect, memo } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract, readContract, toWei } from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import { claimTo } from "thirdweb/extensions/erc1155";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import { getNFTName, getPaymentInfo, isFeatureEnabled } from "@/lib/projectConfig";
import { NFTImage } from "./NFTImage";
import { TokenGallery } from "./TokenGallery";
import { canMintClient, getSupplyStatusTextClient, updateMintedCountClient } from "@/lib/maxSupplyClient";

interface SimpleMintProps {
  locale?: string;
}

function SimpleMintComponent({ locale = "en" }: SimpleMintProps) {
  const account = useActiveAccount();
  const [quantity, setQuantity] = useState(0);
  const [mintPrice, setMintPrice] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [maxMintAmount, setMaxMintAmount] = useState<number>(1);
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [showGallery, setShowGallery] = useState(false);
  const [supplyStatusText, setSupplyStatusText] = useState<string>("");
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenDescription, setTokenDescription] = useState<string>("");
  const [maxSupply, setMaxSupply] = useState<number | null>(null);
  const [currentSupply, setCurrentSupply] = useState<number>(0);
  const [merkleProof, setMerkleProof] = useState<string[]>([]);
  const [tokenPrice, setTokenPrice] = useState<string>("");
  const [tokenCurrency, setTokenCurrency] = useState<string>("");
  const [salesPeriod, setSalesPeriod] = useState<{enabled: boolean; start?: string; end?: string; isUnlimited?: boolean}>({enabled: false});
  const [countdown, setCountdown] = useState<string>("");
  const [periodColor, setPeriodColor] = useState<string>("green");
  const [saleStatus, setSaleStatus] = useState<'active' | 'before' | 'after' | 'unlimited'>('unlimited');
  
  // 進捗表示用の状態
  const [txProgress, setTxProgress] = useState<{
    isProcessing: boolean;
    currentStep: number;
    totalSteps: number;
    stepName: string;
    stepDescription: string;
  }>({
    isProcessing: false,
    currentStep: 0,
    totalSteps: 1,
    stepName: '',
    stepDescription: ''
  });
  
  const { mutate: sendTransaction } = useSendTransaction();

  // Token ID - allow user selection or use default
  const defaultTokenId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ID || "0");
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
          body: JSON.stringify({ 
            address: account.address,
            tokenId: tokenId 
          }),
        });

        const data = await response.json();
        setIsAllowlisted(data.isAllowlisted);
        setMaxMintAmount(data.maxMintAmount || 1);
        
        // Merkle Proofが返されたら保存
        if (data.merkleProof) {
          setMerkleProof(data.merkleProof);
          console.log("Received Merkle Proof:", data.merkleProof);
        }
        
        // 数量を最大MINT数以下に制限
        if (quantity > data.maxMintAmount) {
          setQuantity(data.maxMintAmount);
        }
      } catch (error) {
        setIsAllowlisted(false);
        setMaxMintAmount(1);
      }
    }

    checkAllowlist();
  }, [account?.address, quantity]);

  // トークン情報の取得
  useEffect(() => {
    async function fetchTokenInfo() {
      try {
        // バージョンチェックして必要に応じてキャッシュをクリア
        const versionResponse = await fetch('/api/settings-version', {
          cache: 'no-store',
        });
        
        if (versionResponse.ok) {
          const versionData = await versionResponse.json();
          const savedVersion = localStorage.getItem('settings-version');
          
          if (savedVersion !== versionData.version) {
            // バージョンが変更されていたらローカルストレージをクリア
            localStorage.setItem('settings-version', versionData.version || '');
            // キャッシュを強制リフレッシュ
            const timestamp = new Date().getTime();
            var response = await fetch(`/api/tokens?tokenId=${tokenId}&t=${timestamp}`, {
              cache: 'no-store',
            });
          } else {
            var response = await fetch(`/api/tokens?tokenId=${tokenId}`);
          }
        } else {
          var response = await fetch(`/api/tokens?tokenId=${tokenId}`);
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.tokens && data.tokens.length > 0) {
            const token = data.tokens[0];
            // admin-configから取得した名前を使用（ハードコーディング禁止）
            setTokenName(token.name || "");
            setTokenDescription(token.description || "");
            setTokenPrice(token.price || "0");
            setTokenCurrency(token.currency || "POL");
            setSalesPeriod({
              enabled: token.salesPeriodEnabled || false,
              start: token.salesStartDate,
              end: token.salesEndDate,
              isUnlimited: token.isUnlimited || false
            });
            
            // 価格を更新
            setMintPrice(token.price || "0");
          }
        }
      } catch (error) {
        console.error("Error fetching token info:", error);
        // エラー時も空文字にする（ハードコーディング禁止）
        setTokenName("");
      }
    }
    fetchTokenInfo();
  }, [tokenId]);

  // 在庫状況の取得
  useEffect(() => {
    async function fetchSupplyStatus() {
      const statusText = await getSupplyStatusTextClient(tokenId, locale === "ja" ? "ja" : "en");
      setSupplyStatusText(statusText);
      
      // 販売枚数情報も取得
      try {
        const response = await fetch(`/api/admin/max-supply?tokenId=${tokenId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.config) {
            setMaxSupply(data.config.publicMaxSupply || data.config.maxSupply || null);
            setCurrentSupply(data.config.totalMinted || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching supply info:', error);
      }
    }
    fetchSupplyStatus();
  }, [tokenId, locale, mintSuccess]); // mintSuccessを依存配列に追加して、ミント後に更新

  // カウントダウンと色の更新
  useEffect(() => {
    // 販売期間が無効の場合は表示しない
    if (!salesPeriod.enabled) {
      setCountdown("");
      setPeriodColor("green");
      return;
    }
    
    // 無期限販売の場合
    if (salesPeriod.isUnlimited) {
      setCountdown(locale === "ja" ? "無期限販売" : "Unlimited sale");
      setPeriodColor("green");
      setSaleStatus('unlimited');
      return;
    }
    
    // 開始・終了日時が両方とも未設定の場合はエラー
    if (!salesPeriod.start && !salesPeriod.end) {
      setCountdown(locale === "ja" ? "販売期間未設定" : "Sale period not set");
      setPeriodColor("red");
      setSaleStatus('before'); // ミントできない状態
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      
      // 開始時刻チェック
      if (salesPeriod.start) {
        const start = new Date(salesPeriod.start);
        if (now < start) {
          const startDiff = start.getTime() - now.getTime();
          const days = Math.floor(startDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((startDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((startDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            setCountdown(locale === "ja" ? `開始まで${days}日` : `Starts in ${days} days`);
          } else if (hours > 0) {
            setCountdown(locale === "ja" ? `開始まで${hours}時間${minutes}分` : `Starts in ${hours}h ${minutes}m`);
          } else {
            setCountdown(locale === "ja" ? `開始まで${minutes}分` : `Starts in ${minutes}m`);
          }
          setPeriodColor("yellow");
          return;
        }
      }
      
      // 終了時刻チェック
      if (!salesPeriod.end) {
        setCountdown("");
        setPeriodColor("green");
        return;
      }
      
      const end = new Date(salesPeriod.end);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown(locale === "ja" ? "販売終了" : "Sale Ended");
        setPeriodColor("gray");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      // 色の設定
      if (days >= 7) {
        setPeriodColor("green");
      } else if (days >= 3) {
        setPeriodColor("yellow");
      } else {
        setPeriodColor("red");
      }

      // カウントダウン文字列
      if (days > 0) {
        setCountdown(
          locale === "ja" 
            ? `残り ${days}日 ${hours}時間`
            : `${days} days ${hours} hours remaining`
        );
      } else if (hours > 0) {
        setCountdown(
          locale === "ja"
            ? `残り ${hours}時間 ${minutes}分`
            : `${hours} hours ${minutes} minutes remaining`
        );
      } else {
        setCountdown(
          locale === "ja"
            ? `残り ${minutes}分 ${seconds}秒`
            : `${minutes} minutes ${seconds} seconds remaining`
        );
      }
    };

    updateCountdown();
    // パフォーマンス最適化: 更新頻度を減らしてCPU使用率を削減
    const updateInterval = 30000; // 30秒ごと
    const interval = setInterval(updateCountdown, updateInterval);
    return () => clearInterval(interval);
  }, [salesPeriod, locale]);

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
          }
        }

        // APIから価格が取得できている場合はそれを使用（APIの価格を優先）
        // APIから価格が取得できていない場合のみコントラクトから取得
        if (!tokenPrice || tokenPrice === "0") {
          // クレーム条件を取得して確認
          try {
            const claimCondition = await readContract({
              contract,
              method: "function claimCondition(uint256) view returns (uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)",
              params: [BigInt(tokenId)],
            });
            

            // コントラクトから取得した価格を使用
            if (claimCondition[5]) {
              const priceFromContract = claimCondition[5].toString();
              // 通貨によって変換方法を変更
              if (tokenCurrency === 'ZENY') {
                // ZENYは小数点なし
                setMintPrice(priceFromContract);
              } else if (tokenCurrency === 'USDC') {
                // USDCは6桁の小数
                const priceInToken = Number(priceFromContract) / 1e6;
                setMintPrice(priceInToken.toString());
              } else {
                // POL/MATICは18桁の小数
                const priceInToken = Number(priceFromContract) / 1e18;
                setMintPrice(priceInToken.toString());
              }
            } else {
              setMintPrice(configuredMintPrice);
            }
          } catch (e) {
            setMintPrice(configuredMintPrice);
          }
        }

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

    fetchContractInfo();
  }, [tokenId, configuredMintPrice]); // tokenCurrencyとtokenPriceは削除（無限ループの原因）

  const handleMint = async () => {
    if (!account || !contractAddress || quantity === 0) return;

    // エラーをクリア
    setMintError(null);
    
    // 販売期間チェック
    // 無期限販売でない場合はチェックが必要
    if (!salesPeriod.isUnlimited) {
      console.log('販売期間チェック:', {
        enabled: salesPeriod.enabled,
        isUnlimited: salesPeriod.isUnlimited,
        start: salesPeriod.start,
        end: salesPeriod.end,
        now: new Date().toISOString()
      });
      
      // 販売期間が無効の場合
      if (!salesPeriod.enabled) {
        const message = locale === 'ja' 
          ? '現在販売しておりません' 
          : 'Not available for sale';
        console.log('販売無効エラー:', message);
        setMintError(message);
        return;
      }
      
      const now = new Date();
      
      // 期間が設定されていない場合（販売期間有効だが日付未設定）
      if (salesPeriod.enabled && !salesPeriod.start && !salesPeriod.end) {
        const message = locale === 'ja' 
          ? '販売期間が設定されていません' 
          : 'Sale period is not configured';
        console.log('販売期間未設定エラー:', message);
        setMintError(message);
        return;
      }
      
      // 開始時刻チェック
      if (salesPeriod.start) {
        const startTime = new Date(salesPeriod.start);
        if (now < startTime) {
          const message = locale === 'ja' 
            ? `販売開始時刻: ${startTime.toLocaleString('ja-JP')}` 
            : `Sale starts at: ${startTime.toLocaleString()}`;
          console.log('販売開始前エラー:', message);
          setMintError(message);
          return;
        }
      }
      
      // 終了時刻チェック
      if (salesPeriod.end) {
        const endTime = new Date(salesPeriod.end);
        if (now > endTime) {
          const message = locale === 'ja' ? '販売期間が終了しました' : 'Sale period has ended';
          console.log('販売終了エラー:', message);
          setMintError(message);
          return;
        }
      }
    }

    // 最大発行数チェック
    const mintCheck = await canMintClient(tokenId, quantity);
    if (!mintCheck.canMint) {
      setMintError(mintCheck.reason || '在庫が不足しています');
      return;
    }

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

        // 合計支払い額を計算（ZENYは0桁の小数）
        const totalPayment = BigInt(Math.floor(Number(mintPrice) * quantity));

        // セキュリティのため、毎回新規承認を実行
        // 既存の承認額チェックは行わず、常に2ステップで実行
        console.log(`セキュアモード: 毎回新規承認を実行 (金額: ${totalPayment})`);

        // 2ステップの進捗表示を開始
        setTxProgress({
          isProcessing: true,
          currentStep: 1,
          totalSteps: 2,
          stepName: locale === "ja" ? "トークン承認" : "Token Approval",
          stepDescription: locale === "ja" 
            ? `${tokenCurrency || "ZENY"}トークンの使用を承認しています...`
            : `Approving ${tokenCurrency || "ZENY"} token usage...`
        });

        // まずZENYトークンのapprove
        try {
          
          // approve関数でトランザクションを準備
          const approveTx = approve({
            contract: paymentToken,
            spender: contractAddress,
            amount: totalPayment.toString(),  // 必要最小限の金額のみ承認（毎回実行）
          });

          // トランザクションを送信（コールバックベース）
          sendTransaction(approveTx, {
            onSuccess: () => {
              // ステップ2に進む
              setTxProgress({
                isProcessing: true,
                currentStep: 2,
                totalSteps: 2,
                stepName: locale === "ja" ? "NFTミント" : "NFT Minting",
                stepDescription: locale === "ja" 
                  ? "NFTをミントしています..."
                  : "Minting your NFT..."
              });
              // Approveが成功したらミント実行
              executeMint();
            },
            onError: (error) => {
              setTxProgress({ ...txProgress, isProcessing: false });
              setMintError(locale === "ja" 
                ? `トークン承認失敗: ${error.message || "トランザクションが拒否されました"}` 
                : `Token approval failed: ${error.message || "Transaction rejected"}`);
              setMinting(false);
            },
          });
        } catch (error: any) {
          setTxProgress({ ...txProgress, isProcessing: false });
          setMintError(locale === "ja" 
            ? "トークン承認の準備に失敗しました" 
            : "Failed to prepare token approval");
          setMinting(false);
        }
      } else {
        // MATICまたは無料の場合は直接ミント（1ステップ）
        setTxProgress({
          isProcessing: true,
          currentStep: 1,
          totalSteps: 1,
          stepName: locale === "ja" ? "NFTミント" : "NFT Minting",
          stepDescription: locale === "ja" 
            ? "NFTをミントしています..."
            : "Minting your NFT..."
        });
        executeMint();
      }
    } catch (error) {
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


    try {
      // ReZipangコントラクトに対応した実装
      // このコントラクトはDropERC1155コントラクトで、claim関数を使用
      
      // テスト環境かどうか判定
      const isTestEnvironment = 
        process.env.NEXT_PUBLIC_USE_CSV_FOR_MERKLE === "true" ||
        contractAddress.toLowerCase() === "0xc35E48fF072B48f0525ffDd32f0a763AAd6f00b1".toLowerCase();
      
      // テスト環境でない場合のみ SDK v5 の claimTo を試す
      if (!isTestEnvironment) {
        // 1. SDK v5のclaimToを試す（これが正しいメソッド）
        try {
          
          const claimTransaction = claimTo({
            contract,
            to: account.address,
            tokenId: BigInt(tokenId),
            quantity: BigInt(quantity),
            from: account.address, // アローリスト対応のためにfromを指定
          });

          await new Promise<void>((resolve, reject) => {
            sendTransaction(claimTransaction, {
              onSuccess: (result) => {
                setTxProgress({ ...txProgress, isProcessing: false });
                setMintSuccess(true);
                setMinting(false);
                setMintError(null);
                // ミント成功後に在庫を更新
                updateMintedCountClient(tokenId, quantity);
                resolve();
              },
              onError: (error) => {
                setTxProgress({ ...txProgress, isProcessing: false });
                reject(error);
              },
            });
          });
          return;
        } catch (claimError: any) {
          console.error("claimTo failed:", claimError);
        }
      } else {
        console.log("Test environment detected - skipping claimTo, using direct claim");
      }

      // claimToが失敗した場合、直接claim関数を呼ぶ
      const mintAttempts = [
        // コントラクトが期待する通貨でclaimを試す
        {
          name: "claim (with USDC currency)",
          method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, bytes32[] _allowlistProof, bytes _data)",
          params: [
            account.address,
            BigInt(tokenId),
            BigInt(quantity),
            "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
            BigInt(0), // 0 price for USDC (free claim)
            isTestEnvironment ? [] : (merkleProof || []),
            "0x"
          ]
        },
        // MATICでのclaimを試す
        {
          name: "claim (with native MATIC)",
          method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, bytes32[] _allowlistProof, bytes _data)",
          params: [
            account.address,
            BigInt(tokenId),
            BigInt(quantity),
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native token address
            BigInt(0), // 0 price
            isTestEnvironment ? [] : (merkleProof || []),
            "0x"
          ]
        },
        // シンプルなclaim関数（フォールバック）
        {
          name: "claim (simple with empty proof)",
          method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, bytes32[] _allowlistProof, bytes _data)",
          params: [
            account.address,
            BigInt(tokenId),
            BigInt(quantity),
            paymentTokenAddress || "0x0000000000000000000000000000000000000000",
            toWei(mintPrice),
            isTestEnvironment ? [] : (merkleProof || []),
            "0x"
          ]
        },
        {
          name: "claim (simple)",
          method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity)",
          params: [account.address, BigInt(tokenId), BigInt(quantity)]
        },
        // ERC1155標準パターン
        {
          name: "mint (ERC1155 with data)",
          method: "function mint(address to, uint256 id, uint256 amount, bytes data)",
          params: [account.address, BigInt(tokenId), BigInt(quantity), "0x"]
        },
        {
          name: "mintTo (ERC1155)",
          method: "function mintTo(address to, uint256 tokenId, uint256 amount)",
          params: [account.address, BigInt(tokenId), BigInt(quantity)]
        },
        // LazyMint対応
        {
          name: "lazyMint",
          method: "function lazyMint(uint256 _amount, string _baseURIForTokens, bytes _data)",
          params: [BigInt(quantity), "", "0x"]
        },
        // ERC721パターン（フォールバック）
        {
          name: "safeMint",
          method: "function safeMint(address to, uint256 quantity)",
          params: [account.address, BigInt(quantity)]
        },
        {
          name: "publicMint",
          method: "function publicMint(uint256 quantity)",
          params: [BigInt(quantity)]
        },
      ];

      let lastError: any = null;
      let attemptedMethods: string[] = isTestEnvironment ? [] : ["claimTo (SDK v5)"];
      
      for (const attempt of mintAttempts) {
        try {
          attemptedMethods.push(attempt.name);
          
          const transaction = prepareContractCall({
            contract,
            method: attempt.method as any,
            params: attempt.params as unknown[],
            value: totalValue,
          });

          // トランザクションを送信
          await new Promise<void>((resolve, reject) => {
            sendTransaction(transaction, {
              onSuccess: (result) => {
                setMintSuccess(true);
                setMinting(false);
                setMintError(null);
                // ミント成功後に在庫を更新
                updateMintedCountClient(tokenId, quantity);
                resolve();
              },
              onError: (error) => {
                lastError = error;
                reject(error);
              },
            });
          });

          // 成功したらループを抜ける
          return;
          
        } catch (error: any) {
          lastError = error;
          
          // エラーメッセージを解析
          const errorMessage = error?.message || error?.toString() || "";
          
          // 特定のエラーメッセージの処理
          if (errorMessage.includes("insufficient")) {
            setMintError(locale === "ja" 
              ? "残高不足です。トークンまたはガス代を確認してください。" 
              : "Insufficient balance. Please check your tokens or gas.");
            setMinting(false);
            return;
          }
          
          // "execution reverted"でも次の方法を試す
          continue;
        }
      }

      // すべての方法が失敗した場合
      const errorDetails = lastError?.message || "Unknown error";
      
      setMintError(
        locale === "ja" 
          ? "ミントに失敗しました。もう一度お試しください。" 
          : "Mint failed. Please try again."
      );
    } catch (unexpectedError: any) {
      setMintError(
        locale === "ja" 
          ? `予期しないエラーが発生しました: ${unexpectedError.message}` 
          : `Unexpected error: ${unexpectedError.message}`
      );
    } finally {
      setTxProgress({ ...txProgress, isProcessing: false });
      setMinting(false);
    }
  };

  const totalCost = Number(mintPrice) * quantity;

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
    <>
      {/* トランザクション進捗表示モーダル */}
      {txProgress.isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-gray-800">
              {locale === "ja" ? "トランザクション処理中" : "Processing Transaction"}
            </h3>
            
            {/* ステップインジケーター */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">
                  {locale === "ja" ? "ステップ" : "Step"} {txProgress.currentStep}/{txProgress.totalSteps}
                </span>
                <span className="text-sm font-semibold text-purple-600">
                  {txProgress.stepName}
                </span>
              </div>
              
              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(txProgress.currentStep / txProgress.totalSteps) * 100}%` 
                  }}
                />
              </div>
            </div>
            
            {/* 説明テキスト */}
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-center">
                {txProgress.stepDescription}
              </p>
            </div>
            
            {/* アニメーションアイコン */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-purple-200 rounded-full border-t-purple-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">
                    {txProgress.currentStep === 1 ? "🔐" : "🎨"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* ステップ詳細 */}
            {txProgress.totalSteps === 2 && (
              <div className="space-y-2 mb-4">
                <div className={`flex items-center gap-3 p-2 rounded-lg ${
                  txProgress.currentStep >= 1 ? "bg-purple-50" : "bg-gray-50"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    txProgress.currentStep >= 1 ? "bg-purple-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    1
                  </div>
                  <span className={`text-sm ${
                    txProgress.currentStep >= 1 ? "text-purple-700 font-medium" : "text-gray-500"
                  }`}>
                    {locale === "ja" ? "トークンの承認" : "Approve Tokens"}
                  </span>
                  {txProgress.currentStep === 1 && (
                    <div className="ml-auto">
                      <div className="animate-pulse h-2 w-2 bg-purple-500 rounded-full" />
                    </div>
                  )}
                </div>
                
                <div className={`flex items-center gap-3 p-2 rounded-lg ${
                  txProgress.currentStep >= 2 ? "bg-purple-50" : "bg-gray-50"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    txProgress.currentStep >= 2 ? "bg-purple-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    2
                  </div>
                  <span className={`text-sm ${
                    txProgress.currentStep >= 2 ? "text-purple-700 font-medium" : "text-gray-500"
                  }`}>
                    {locale === "ja" ? "NFTのミント" : "Mint NFT"}
                  </span>
                  {txProgress.currentStep === 2 && (
                    <div className="ml-auto">
                      <div className="animate-pulse h-2 w-2 bg-purple-500 rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 注意事項 */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 text-lg">⚠️</span>
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">
                    {locale === "ja" ? "重要:" : "Important:"}
                  </p>
                  <ul className="space-y-1">
                    <li>
                      {locale === "ja" 
                        ? "• ウォレットの確認画面が表示されたら承認してください"
                        : "• Please approve when wallet confirmation appears"}
                    </li>
                    <li>
                      {locale === "ja"
                        ? "• このウィンドウを閉じないでください"
                        : "• Do not close this window"}
                    </li>
                    {txProgress.totalSteps === 2 && (
                      <li>
                        {locale === "ja"
                          ? "• 2回の承認が必要です（トークン承認 → NFTミント）"
                          : "• Two approvals needed (Token → NFT Mint)"}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
              {tokenName || "NFT"}
            </h3>
            {totalSupply !== "0" && (
              <p className="text-sm text-gray-700 font-medium">
                {locale === "ja" ? `${totalSupply}個 発行済み` : `${totalSupply} minted`}
              </p>
            )}
            {/* 在庫状況表示 */}
            {supplyStatusText && (
              <p className="text-sm font-semibold mt-2">
                {supplyStatusText}
              </p>
            )}
            {/* 販売枚数表示 */}
            {maxSupply && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {locale === "ja" ? "総販売枚数" : "Total Supply"}
                  </span>
                  <span className="font-bold text-purple-600">
                    {maxSupply.toLocaleString()} {locale === "ja" ? "枚" : "pcs"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">
                    {locale === "ja" ? "販売済み" : "Sold"}
                  </span>
                  <span className="font-medium text-gray-800">
                    {currentSupply.toLocaleString()} {locale === "ja" ? "枚" : "pcs"}
                  </span>
                </div>
                {/* プログレスバー */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((currentSupply / maxSupply) * 100, 100)}%` }}
                  />
                </div>
              </div>
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
                `${mintPrice} ${tokenCurrency || paymentTokenSymbol}`
              )}
            </span>
          </div>
        </div>

        {/* エラー表示 */}
        {mintError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-red-800 text-sm font-medium mb-4">
            <div className="font-semibold mb-1">
              {locale === "ja" ? "エラー" : "Error"}
            </div>
            <div className="whitespace-pre-wrap">{mintError}</div>
          </div>
        )}
        
        {/* 販売期間表示 */}
        {salesPeriod.enabled && ((salesPeriod.start || salesPeriod.end) || (!salesPeriod.start && !salesPeriod.end)) && (
          <div className={`rounded-xl p-4 mb-4 border ${
            periodColor === "green" 
              ? "bg-green-50 border-green-200" 
              : periodColor === "yellow"
              ? "bg-yellow-50 border-yellow-200"
              : periodColor === "red"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="text-sm text-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${
                  periodColor === "green" 
                    ? "text-green-800" 
                    : periodColor === "yellow"
                    ? "text-yellow-800"
                    : periodColor === "red"
                    ? "text-red-800"
                    : "text-gray-800"
                }`}>
                  {locale === "ja" ? "販売期間" : "Sales Period"} (UTC)
                </span>
                {countdown && (
                  <span className={`font-bold text-sm ${
                    periodColor === "green" 
                      ? "text-green-700" 
                      : periodColor === "yellow"
                      ? "text-yellow-700"
                      : periodColor === "red"
                      ? "text-red-700 animate-pulse"
                      : "text-gray-700"
                  }`}>
                    {countdown}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {salesPeriod.start && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {locale === "ja" ? "開始:" : "Start:"}
                    </span>
                    <span className="font-medium">
                      {new Date(salesPeriod.start).toLocaleString(locale === "ja" ? 'ja-JP' : 'en-US')}
                    </span>
                  </div>
                )}
                {salesPeriod.end && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {locale === "ja" ? "終了:" : "End:"}
                    </span>
                    <span className="font-medium">
                      {new Date(salesPeriod.end).toLocaleString(locale === "ja" ? 'ja-JP' : 'en-US')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 数量選択 */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-800 font-semibold">
              {locale === "ja" ? "数量" : "Quantity"}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (quantity > 0) {
                    setQuantity(quantity - 1);
                  }
                }}
                className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold ${
                  quantity <= 0 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700 cursor-pointer'
                }`}
              >
                -
              </button>
              <span className="w-12 text-center text-xl font-bold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => {
                  if (isAllowlisted && quantity < maxMintAmount) {
                    setQuantity(quantity + 1);
                  }
                }}
                className={`w-10 h-10 rounded-full transition-colors flex items-center justify-center font-bold ${
                  !isAllowlisted || quantity >= maxMintAmount 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700 cursor-pointer'
                }`}
                disabled={!isAllowlisted || quantity >= maxMintAmount}
              >
                +
              </button>
            </div>
          </div>
          {isAllowlisted && maxMintAmount >= 1 && (
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
                {totalCost.toFixed(1)} {tokenCurrency || paymentTokenSymbol}
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
          disabled={minting || (isAllowlisted === false) || quantity < 1 || saleStatus === 'before' || saleStatus === 'after'}
          className={`w-full py-4 rounded-xl font-extrabold text-lg transition-all transform ${
            minting || (isAllowlisted === false) || quantity < 1 || saleStatus === 'before' || saleStatus === 'after'
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl border-2 border-purple-700"
          }`}
        >
          {minting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
              {locale === "ja" ? "ミント中..." : "Minting..."}
            </span>
          ) : isAllowlisted === false ? (
            <span>{locale === "ja" ? "アローリスト未登録" : "Not on allowlist"}</span>
          ) : saleStatus === 'before' ? (
            <span>
              {salesPeriod.enabled && !salesPeriod.start && !salesPeriod.end ? 
                (locale === "ja" ? "販売期間未設定" : "Period Not Set") : 
                (locale === "ja" ? "販売開始前" : "Not Started")
              }
            </span>
          ) : saleStatus === 'after' ? (
            <span>{locale === "ja" ? "販売終了" : "Sale Ended"}</span>
          ) : (
            <>
              {locale === "ja" ? "NFTをミント" : "Mint NFT"}
              {quantity > 1 && ` (${quantity})`}
            </>
          )}
        </button>


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
              ? `※ ${tokenCurrency || paymentTokenSymbol}トークンでの支払いが必要です` 
              : `※ Payment in ${tokenCurrency || paymentTokenSymbol} tokens required`)
            : (locale === "ja" 
              ? "※ ガス代が別途必要です" 
              : "※ Gas fees will be required")
          }
        </div>
      </div>
      </div>
    </>
  );
}

// パフォーマンス最適化: メモ化して不要な再レンダリングを防止
export const SimpleMint = memo(SimpleMintComponent);