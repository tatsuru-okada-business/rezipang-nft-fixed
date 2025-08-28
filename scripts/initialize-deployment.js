#!/usr/bin/env node
/**
 * 本番環境デプロイ時の自動初期化スクリプト
 * 環境変数からコントラクト情報を読み取り、Thirdwebから必要な情報を取得して
 * 各種設定ファイルを初期化します。
 */

const fs = require('fs');
const path = require('path');
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");

// 環境変数の確認
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "137";
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!CONTRACT_ADDRESS) {
  console.error("❌ Error: NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("❌ Error: NEXT_PUBLIC_THIRDWEB_CLIENT_ID is not set");
  process.exit(1);
}

console.log("🚀 Initializing deployment configuration...");
console.log(`📋 Contract: ${CONTRACT_ADDRESS}`);
console.log(`⛓️  Chain ID: ${CHAIN_ID}`);

// チェーンの設定
const getChain = (chainId) => {
  switch(chainId) {
    case "137":
      return "polygon";
    case "1":
      return "mainnet";
    case "11155111":
      return "sepolia";
    default:
      return "polygon";
  }
};

async function initializeDeployment() {
  try {
    // Thirdweb SDKの初期化
    const sdk = new ThirdwebSDK(getChain(CHAIN_ID), {
      clientId: CLIENT_ID,
    });

    // コントラクトの取得
    const contract = await sdk.getContract(CONTRACT_ADDRESS);
    
    // NFTメタデータの取得
    console.log("📦 Fetching NFT metadata from Thirdweb...");
    let tokens = [];
    
    try {
      // ERC1155として試行
      const nfts = await contract.erc1155.getAll();
      
      for (const nft of nfts) {
        const tokenId = parseInt(nft.metadata.id);
        
        // Claim Conditionの取得
        let claimCondition = null;
        try {
          const conditions = await contract.erc1155.claimConditions.getActive(tokenId);
          claimCondition = conditions;
        } catch (e) {
          console.log(`⚠️ No claim condition for token ${tokenId}`);
        }
        
        tokens.push({
          tokenId: tokenId,
          thirdweb: {
            tokenId: tokenId,
            name: nft.metadata.name || `Token #${tokenId}`,
            description: nft.metadata.description || "",
            image: nft.metadata.image || "",
            maxSupply: claimCondition?.maxClaimableSupply?.toString() || "0",
            currentPrice: claimCondition?.price?.toString() || "0",
            currency: claimCondition?.currency || "0x0000000000000000000000000000000000000000",
            currencySymbol: claimCondition?.currency === "0x0000000000000000000000000000000000000000" ? "POL" : "CUSTOM"
          }
        });
      }
    } catch (e) {
      // ERC721として試行
      console.log("Trying as ERC721...");
      const claimCondition = await contract.erc721.claimConditions.getActive();
      
      tokens.push({
        tokenId: 0,
        thirdweb: {
          tokenId: 0,
          name: "NFT",
          description: "",
          image: "",
          maxSupply: claimCondition?.maxClaimableSupply?.toString() || "0",
          currentPrice: claimCondition?.price?.toString() || "0",
          currency: claimCondition?.currency || "0x0000000000000000000000000000000000000000",
          currencySymbol: claimCondition?.currency === "0x0000000000000000000000000000000000000000" ? "POL" : "CUSTOM"
        }
      });
    }

    // admin-config.jsonの初期化
    const adminConfig = {
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      tokens: tokens,
      lastSync: new Date().toISOString(),
      initialized: true
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'admin-config.json'),
      JSON.stringify(adminConfig, null, 2)
    );
    console.log("✅ admin-config.json initialized");

    // local-settings.jsonの初期化
    const localSettings = {
      defaultTokenId: tokens[0]?.tokenId || 0,
      tokens: {},
      lastUpdated: new Date().toISOString()
    };

    // 各トークンのローカル設定を初期化
    for (const token of tokens) {
      localSettings.tokens[token.tokenId] = {
        displayEnabled: true,
        displayOrder: token.tokenId,
        isDefaultDisplay: token.tokenId === 0,
        salesPeriodEnabled: true,
        isUnlimited: true, // デフォルトで無期限販売
        totalMinted: 0,
        tokenId: token.tokenId,
        lastSyncTime: new Date().toISOString()
      };
    }

    fs.writeFileSync(
      path.join(process.cwd(), 'local-settings.json'),
      JSON.stringify(localSettings, null, 2)
    );
    console.log("✅ local-settings.json initialized");

    // default-token.jsonの初期化
    const defaultToken = tokens[0] || {
      tokenId: 0,
      name: "NFT",
      description: "",
      image: ""
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'default-token.json'),
      JSON.stringify(defaultToken, null, 2)
    );
    console.log("✅ default-token.json initialized");

    // generated-favicon.svgを削除（デフォルトに戻す）
    const generatedFaviconPath = path.join(process.cwd(), 'public', 'generated-favicon.svg');
    if (fs.existsSync(generatedFaviconPath)) {
      fs.unlinkSync(generatedFaviconPath);
      console.log("✅ generated-favicon.svg removed (using default)");
    }

    // project-settings.jsonは初期化しない（管理パネルで設定）
    // ただし、存在しない場合のみデフォルトを作成
    const projectSettingsPath = path.join(process.cwd(), 'project-settings.json');
    if (!fs.existsSync(projectSettingsPath)) {
      const defaultProjectSettings = {
        projectName: "NFT Minting Site",
        projectDescription: "NFT Minting Platform",
        features: {
          showTokenGallery: true,
          showPriceChecker: false,
          showMintSimulator: false,
          showDebugInfo: false,
          maxMintPerWallet: true
        },
        ui: {
          theme: {
            backgroundColor: "#E0E7FF",
            textColor: "#7C3AED"
          },
          textOutline: {
            enabled: false,
            color: "#000000"
          }
        },
        localization: {
          defaultLocale: "ja",
          availableLocales: ["ja", "en"]
        }
      };

      fs.writeFileSync(
        projectSettingsPath,
        JSON.stringify(defaultProjectSettings, null, 2)
      );
      console.log("✅ project-settings.json created with defaults");
    } else {
      console.log("ℹ️  project-settings.json already exists (skipped)");
    }

    console.log("\n🎉 Deployment initialization completed successfully!");
    console.log("📝 Next step: Access /admin to configure project settings");

  } catch (error) {
    console.error("❌ Initialization failed:", error.message);
    process.exit(1);
  }
}

// スクリプトの実行
initializeDeployment().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});