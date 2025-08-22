"use client";

import { useState } from "react";
import { getContract, readContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";

interface PriceCheckerProps {
  locale?: string;
}

export function PriceChecker({ locale = "en" }: PriceCheckerProps) {
  const [results, setResults] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const tokenId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ID || "4");
  
  const isJapanese = locale === "ja";

  const checkPrice = async () => {
    if (!contractAddress) {
      setResults(isJapanese ? "コントラクトアドレスが設定されていません" : "No contract address configured");
      return;
    }

    setChecking(true);
    setResults(isJapanese ? "すべての価格関数をチェック中...\n\n" : "Checking all price functions...\n\n");

    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    let output = isJapanese 
      ? `=== トークン #${tokenId} の価格チェック ===\n\n`
      : `=== PRICE CHECK FOR TOKEN #${tokenId} ===\n\n`;

    // Claim Conditions価格チェック
    const claimConditionFunctions = [
      {
        name: "getActiveClaimConditionId",
        method: "function getActiveClaimConditionId() view returns (uint256)",
        params: []
      },
      {
        name: "getClaimConditionById", 
        method: "function getClaimConditionById(uint256 _conditionId) view returns (tuple)",
        params: [BigInt(0)]
      },
      {
        name: "claimCondition",
        method: "function claimCondition() view returns (uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency)",
        params: []
      },
    ];

    // 一般的な価格関数
    const priceFunctions = [
      // Token ID specific
      { name: "getPrice(tokenId)", method: "function getPrice(uint256 tokenId) view returns (uint256)", params: [BigInt(tokenId)] },
      { name: "pricePerToken(tokenId)", method: "function pricePerToken(uint256 tokenId) view returns (uint256)", params: [BigInt(tokenId)] },
      { name: "tokenPrice(tokenId)", method: "function tokenPrice(uint256 tokenId) view returns (uint256)", params: [BigInt(tokenId)] },
      // General price
      { name: "price()", method: "function price() view returns (uint256)", params: [] },
      { name: "mintPrice()", method: "function mintPrice() view returns (uint256)", params: [] },
      { name: "cost()", method: "function cost() view returns (uint256)", params: [] },
      { name: "publicPrice()", method: "function publicPrice() view returns (uint256)", params: [] },
      { name: "salePrice()", method: "function salePrice() view returns (uint256)", params: [] },
    ];

    output += isJapanese ? "1. CLAIM CONDITIONS チェック:\n" : "1. CLAIM CONDITIONS CHECK:\n";
    for (const func of claimConditionFunctions) {
      try {
        const result = await readContract({
          contract,
          method: func.method as any,
          params: func.params as unknown[],
        });
        output += isJapanese ? `✅ ${func.name}: 見つかりました\n` : `✅ ${func.name}: Found\n`;
        if (func.name === "claimCondition" && result) {
          const condition = result as { pricePerToken?: bigint };
          if (condition.pricePerToken) {
            const priceInEther = (Number(condition.pricePerToken.toString()) / 10 ** 18).toFixed(6);
            output += isJapanese 
              ? `   → 価格: ${priceInEther} ${chain.id === 137 ? 'MATIC' : 'ETH'}\n`
              : `   → Price: ${priceInEther} ${chain.id === 137 ? 'MATIC' : 'ETH'}\n`;
          }
        }
      } catch (e: unknown) {
        output += isJapanese ? `❌ ${func.name}: 見つかりません\n` : `❌ ${func.name}: Not found\n`;
      }
    }

    output += isJapanese ? "\n2. 直接価格関数:\n" : "\n2. DIRECT PRICE FUNCTIONS:\n";
    for (const func of priceFunctions) {
      try {
        const result = await readContract({
          contract,
          method: func.method as any,
          params: func.params as unknown[],
        });
        const priceWei = result?.toString() || "0";
        const priceEther = (Number(priceWei) / 10 ** 18).toFixed(6);
        output += `✅ ${func.name}: ${priceWei} wei (${priceEther} ${chain.id === 137 ? 'MATIC' : 'ETH'})\n`;
      } catch (e: unknown) {
        output += isJapanese ? `❌ ${func.name}: 見つかりません\n` : `❌ ${func.name}: Not found\n`;
      }
    }

    output += isJapanese ? "\n=== 推奨事項 ===\n" : "\n=== RECOMMENDATIONS ===\n";
    
    if (isJapanese) {
      output += "1. すべての価格が0の場合: Thirdweb Dashboard → Claim Conditions を確認\n";
      output += "2. 関数が見つからない場合: コントラクトが異なる関数名を使用している可能性\n";
      output += "3. Thirdweb Explorerの「Write」タブで支払い可能な関数を確認\n";
    } else {
      output += "1. If all prices show 0: Check Thirdweb Dashboard → Claim Conditions\n";
      output += "2. If no functions found: Contract may use different function names\n";
      output += "3. Check the 'Write' tab on Thirdweb explorer for payable functions\n";
    }
    
    output += isJapanese ? "4. 直接リンク: " : "4. Direct link: ";
    output += `https://thirdweb.com/${chain.id === 137 ? 'polygon' : 'ethereum'}/${contractAddress}\n`;

    setResults(output);
    setChecking(false);
  };

  return (
    <div className="bg-white/90 rounded-xl p-6 shadow-md">
      <h4 className="font-bold text-gray-900 mb-2">
        {isJapanese ? "🔍 価格チェッカー" : "🔍 Price Checker"}
      </h4>
      <button
        onClick={checkPrice}
        disabled={checking}
        className="mb-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {checking 
          ? (isJapanese ? "チェック中..." : "Checking...")
          : (isJapanese ? "すべての価格をチェック" : "Check All Prices")
        }
      </button>
      
      {results && (
        <pre className="bg-white p-3 rounded text-xs font-mono font-bold text-gray-900 overflow-auto max-h-64 border-2 border-gray-300">
          {results}
        </pre>
      )}
    </div>
  );
}