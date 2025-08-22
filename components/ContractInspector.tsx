"use client";

import { useState } from "react";
import { getContract, readContract } from "thirdweb";
import { client, chain, contractAddress } from "@/lib/thirdweb";

export function ContractInspector() {
  const [results, setResults] = useState<string>("");
  const [inspecting, setInspecting] = useState(false);

  const inspectContract = async () => {
    if (!contractAddress) {
      setResults("No contract address configured");
      return;
    }

    setInspecting(true);
    setResults("Inspecting contract functions...\n\n");

    const contract = getContract({
      client,
      chain,
      address: contractAddress,
    });

    // 価格関連の関数を調査
    const priceFunctions = [
      { name: "price", method: "function price() view returns (uint256)" },
      { name: "mintPrice", method: "function mintPrice() view returns (uint256)" },
      { name: "cost", method: "function cost() view returns (uint256)" },
      { name: "publicPrice", method: "function publicPrice() view returns (uint256)" },
      { name: "getPrice", method: "function getPrice() view returns (uint256)" },
      { name: "pricePerToken", method: "function pricePerToken() view returns (uint256)" },
      { name: "tokenPrice", method: "function tokenPrice() view returns (uint256)" },
      { name: "mintCost", method: "function mintCost() view returns (uint256)" },
    ];

    // Claim条件の関数を調査
    const claimFunctions = [
      { name: "claimCondition", method: "function claimCondition() view returns (uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata)" },
      { name: "getActiveClaimConditionId", method: "function getActiveClaimConditionId() view returns (uint256)" },
      { name: "getClaimConditionById", method: "function getClaimConditionById(uint256 _conditionId) view returns (tuple)" },
    ];

    // 供給量関連の関数を調査
    const supplyFunctions = [
      { name: "totalSupply", method: "function totalSupply() view returns (uint256)" },
      { name: "maxSupply", method: "function maxSupply() view returns (uint256)" },
      { name: "maxTotalSupply", method: "function maxTotalSupply() view returns (uint256)" },
      { name: "totalMinted", method: "function totalMinted() view returns (uint256)" },
    ];

    // ミント関連の関数を調査
    const mintFunctions = [
      { name: "mint (2 params)", check: "function mint(address to, uint256 amount)" },
      { name: "mint (1 param)", check: "function mint(uint256 amount)" },
      { name: "claim", check: "function claim(address receiver, uint256 quantity)" },
      { name: "publicMint", check: "function publicMint(uint256 quantity)" },
      { name: "purchase", check: "function purchase(uint256 quantity)" },
      { name: "buy", check: "function buy(uint256 amount)" },
    ];

    let output = "=== PRICE FUNCTIONS ===\n";
    for (const func of priceFunctions) {
      try {
        const result = await readContract({
          contract,
          method: func.method as any,
          params: [],
        });
        const priceInWei = result?.toString() || "0";
        const priceInEther = (Number(priceInWei) / 10 ** 18).toFixed(6);
        output += `✅ ${func.name}(): ${priceInWei} wei (${priceInEther} MATIC)\n`;
      } catch (e) {
        output += `❌ ${func.name}(): Not found\n`;
      }
    }

    output += "\n=== SUPPLY FUNCTIONS ===\n";
    for (const func of supplyFunctions) {
      try {
        const result = await readContract({
          contract,
          method: func.method as any,
          params: [],
        });
        output += `✅ ${func.name}(): ${result?.toString()}\n`;
      } catch (e) {
        output += `❌ ${func.name}(): Not found\n`;
      }
    }

    output += "\n=== CLAIM CONDITIONS ===\n";
    for (const func of claimFunctions) {
      try {
        const result = await readContract({
          contract,
          method: func.method as any,
          params: [],
        });
        output += `✅ ${func.name}(): Found\n`;
        if (result && typeof result === 'object') {
          output += `   Details: ${JSON.stringify(result, null, 2)}\n`;
        }
      } catch (e) {
        output += `❌ ${func.name}(): Not found\n`;
      }
    }

    output += "\n=== MINT FUNCTIONS (existence check) ===\n";
    for (const func of mintFunctions) {
      output += `🔍 ${func.name}: Check manually in Write tab\n`;
    }

    output += "\n=== RECOMMENDATIONS ===\n";
    output += "1. Check the 'Write' tab on Thirdweb explorer for available mint functions\n";
    output += "2. Look for 'claim' or 'mint' functions with payable modifier\n";
    output += "3. Check if there are any access restrictions (onlyOwner, etc.)\n";

    setResults(output);
    setInspecting(false);
  };

  return (
    <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono">
      <h3 className="text-xl mb-4 text-white">🔍 Contract Inspector</h3>
      
      <button
        onClick={inspectContract}
        disabled={inspecting}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600"
      >
        {inspecting ? "Inspecting..." : "Inspect Contract"}
      </button>

      {results && (
        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
          {results}
        </pre>
      )}

      <div className="mt-4 text-yellow-400 text-sm">
        <p>📝 Manual Check Required:</p>
        <a 
          href={`https://thirdweb.com/polygon/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-yellow-300"
        >
          Open Contract in Thirdweb Explorer →
        </a>
        <p className="mt-2">Go to &quot;Write&quot; tab to see available functions</p>
      </div>
    </div>
  );
}