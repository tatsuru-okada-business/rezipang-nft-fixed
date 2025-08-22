"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";

export function DebugInfo({ locale = "en" }: { locale?: string }) {
  const account = useActiveAccount();
  const [debugData, setDebugData] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const collectDebugInfo = () => {
    const info = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      wallet: account?.address || "Not connected",
      network: {
        chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
        contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
        paymentToken: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS,
      },
      metamask: {
        installed: typeof window !== "undefined" && window.ethereum !== undefined,
        isMetaMask: window.ethereum?.isMetaMask || false,
      },
      console: "ブラウザのコンソールログを確認してください",
    };

    const debugText = JSON.stringify(info, null, 2);
    setDebugData(debugText);
    
    // コンソールにも出力
    console.log("=== DEBUG INFO ===");
    console.log(info);
    console.log("==================");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(debugData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={collectDebugInfo}
        className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 shadow-lg animate-pulse"
      >
        {locale === "ja" ? "🔧 エラー報告用" : "🔧 Error Report"}
      </button>
      
      {debugData && (
        <div className="absolute bottom-10 right-0 bg-white border rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm">Debug Information</h3>
            <button
              onClick={copyToClipboard}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {debugData}
          </pre>
          <div className="mt-2 text-xs text-red-600">
            {locale === "ja" 
              ? "エラー発生時は、ブラウザのコンソール（F12）のスクリーンショットも必要です"
              : "Please also take a screenshot of browser console (F12) when error occurs"
            }
          </div>
        </div>
      )}
    </div>
  );
}