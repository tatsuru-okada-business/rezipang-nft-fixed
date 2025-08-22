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

export function MintButton({ locale = "en" }: { locale?: string }) {
  const t = translations[locale as keyof typeof translations] || translations.en;
  const account = useActiveAccount();
  const [isAllowlisted, setIsAllowlisted] = useState<boolean | null>(null);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  
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

  const handleMint = async () => {
    if (!account || !isAllowlisted || !contractAddress) return;

    setMinting(true);
    setMintError(null);
    setMintSuccess(false);

    try {
      const contract = getContract({
        client,
        chain,
        address: contractAddress,
      });

      // 一般的なミント関数のパターン
      // NFT Dropの場合: claim
      // NFT Collectionの場合: mint または safeMint
      const transaction = prepareContractCall({
        contract,
        method: "function mint(address to, uint256 amount)",  // または "function claim(address receiver, uint256 quantity)"
        params: [account.address, BigInt(1)],
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

  if (isAllowlisted === false) {
    return (
      <div className="text-center">
        <button
          type="button"
          disabled
          className="px-8 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
        >
          {t.mint.notAllowlisted}
        </button>
      </div>
    );
  }

  if (mintSuccess) {
    return (
      <div className="text-center">
        <div className="text-green-600 font-semibold mb-4">
          {t.mint.success}
        </div>
        <button
          type="button"
          onClick={() => setMintSuccess(false)}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t.mint.mintAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleMint}
        disabled={minting || !isAllowlisted}
        className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
          minting
            ? "bg-gray-400 text-gray-200 cursor-wait"
            : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
        }`}
      >
        {minting ? t.mint.minting : t.mint.button}
      </button>
      
      {mintError && (
        <div className="mt-4 text-red-600 text-sm">
          {t.mint.error}: {mintError}
        </div>
      )}
    </div>
  );
}