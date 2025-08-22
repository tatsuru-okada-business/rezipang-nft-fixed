"use client";

import { useState, useEffect } from "react";
import { readContract, getContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";

interface NFTDetailsProps {
  locale?: string;
}

export function NFTDetails({ locale = "en" }: NFTDetailsProps) {
  const [collectionName, setCollectionName] = useState<string>("");
  const [collectionSymbol, setCollectionSymbol] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<string>("");
  const [maxSupply, setMaxSupply] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string>("");

  useEffect(() => {
    async function fetchNFTDetails() {
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

        // コレクション名を取得
        try {
          const name = await readContract({
            contract,
            method: "function name() view returns (string)",
            params: [],
          });
          setCollectionName(name as string);
        } catch (e) {
          console.log("Could not fetch name");
        }

        // シンボルを取得
        try {
          const symbol = await readContract({
            contract,
            method: "function symbol() view returns (string)",
            params: [],
          });
          setCollectionSymbol(symbol as string);
        } catch (e) {
          console.log("Could not fetch symbol");
        }

        // 総供給量を取得
        try {
          const supply = await readContract({
            contract,
            method: "function totalSupply() view returns (uint256)",
            params: [],
          });
          setTotalSupply(supply?.toString() || "0");
        } catch (e) {
          console.log("Could not fetch total supply");
        }

        // 最大供給量を取得（存在する場合）
        try {
          const max = await readContract({
            contract,
            method: "function maxSupply() view returns (uint256)",
            params: [],
          });
          setMaxSupply(max?.toString() || "");
        } catch (e) {
          // maxSupplyがない場合もある
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching NFT details:", error);
        setLoading(false);
      }
    }

    fetchNFTDetails();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  const chainName = chain.id === 137 ? "Polygon" : 
                    chain.id === 1 ? "Ethereum" : 
                    chain.id === 11155111 ? "Sepolia" : 
                    `Chain ${chain.id}`;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8 border border-purple-200">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {collectionName || "NFT Collection"}
          </h2>
          {collectionSymbol && (
            <p className="text-sm text-gray-700 font-medium mt-1">
              Symbol: {collectionSymbol}
            </p>
          )}
          <div className="mt-3 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Network:</span> {chainName}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">Contract:</span>{" "}
              <a 
                href={`https://${chain.id === 137 ? 'polygonscan.com' : chain.id === 1 ? 'etherscan.io' : 'sepolia.etherscan.io'}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:text-blue-800 hover:underline font-medium"
              >
                {contractAddress?.slice(0, 6)}...{contractAddress?.slice(-4)}
              </a>
            </p>
            {totalSupply && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">
                  {locale === "ja" ? "発行済み:" : "Minted:"}
                </span>{" "}
                {totalSupply}
                {maxSupply && ` / ${maxSupply}`}
              </p>
            )}
          </div>
        </div>
        {imageUrl && (
          <img 
            src={imageUrl} 
            alt={collectionName}
            className="w-24 h-24 rounded-lg object-cover"
          />
        )}
      </div>
    </div>
  );
}