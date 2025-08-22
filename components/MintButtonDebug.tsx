"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

const translations = {
  en,
  ja,
} as const;

export function MintButtonDebug({ locale = "en" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const account = useActiveAccount();
  const [, setIsAllowlisted] = useState<boolean | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  const { mutate: sendTransaction } = useSendTransaction();

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

  const tryMintFunctions = async () => {
    if (!account || !contractAddress) return;

    setMinting(true);
    setMintError(null);
    setMintSuccess(false);
    setDebugInfo("Trying different mint functions...\n");

    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // 試すべき関数のリスト
    const mintFunctions = [
      { 
        name: "claim",
        method: "function claim(address receiver, uint256 quantity)",
        params: [account.address, BigInt(1)]
      },
      {
        name: "mint",
        method: "function mint(address to, uint256 amount)",
        params: [account.address, BigInt(1)]
      },
      {
        name: "safeMint",
        method: "function safeMint(address to)",
        params: [account.address]
      },
      {
        name: "mintTo",
        method: "function mintTo(address to)",
        params: [account.address]
      },
      {
        name: "publicMint",
        method: "function publicMint(uint256 quantity)",
        params: [BigInt(1)]
      }
    ];

    for (const func of mintFunctions) {
      try {
        setDebugInfo(prev => prev + `\nTrying ${func.name}...`);
        
        const transaction = prepareContractCall({
          contract,
          method: func.method as any,
          params: func.params as unknown[],
        });

        sendTransaction(transaction, {
          onSuccess: () => {
            setMintSuccess(true);
            setMinting(false);
            setDebugInfo(prev => prev + ` ✅ Success with ${func.name}!`);
          },
          onError: (error) => {
            setDebugInfo(prev => prev + ` ❌ Failed: ${error.message}`);
            setMintError(`${func.name} failed: ${error.message}`);
          },
        });

        // 成功したら終了
        if (mintSuccess) break;
        
      } catch (error) {
        setDebugInfo(prev => prev + ` ❌ ${func.name} not found or failed`);
        console.error(`${func.name} error:`, error);
      }
    }

    setMinting(false);
  };

  if (!account) {
    return (
      <div className="text-center text-gray-600">
        {t.wallet.notConnected}
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="text-center text-red-600">
        {t.mint.contractNotConfigured}
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <button
        type="button"
        onClick={tryMintFunctions}
        disabled={minting}
        className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
          minting
            ? "bg-gray-400 text-gray-200 cursor-wait"
            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
        }`}
      >
        {minting ? "Testing Functions..." : "Debug Mint Functions"}
      </button>

      {debugInfo && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {debugInfo}
          </pre>
        </div>
      )}

      {mintError && (
        <div className="mt-4 text-red-600 text-sm">
          Last Error: {mintError}
        </div>
      )}

      {mintSuccess && (
        <div className="text-green-600 font-semibold">
          🎉 Mint Successful!
        </div>
      )}
    </div>
  );
}