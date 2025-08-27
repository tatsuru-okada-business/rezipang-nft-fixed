import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_CONFIG_PATH = join(process.cwd(), 'project-settings.json');

// デフォルト設定
const DEFAULT_SETTINGS = {
  projectName: "ReZipang NFT",
  projectDescription: "ReZipang NFT Minting Site",
  features: {
    showTokenGallery: true,
    showPriceChecker: false,
    showMintSimulator: false,
    showDebugInfo: false,
    maxMintPerWallet: true,
  },
  ui: {
    theme: {
      primary: "purple",
      secondary: "blue",
    },
  },
  localization: {
    defaultLocale: "ja",
    availableLocales: ["ja", "en"],
  },
  // 支払い設定は削除（ClaimConditionから取得）
};

// プロジェクト設定を取得
export async function GET() {
  try {
    let settings = DEFAULT_SETTINGS;
    
    if (existsSync(PROJECT_CONFIG_PATH)) {
      const content = readFileSync(PROJECT_CONFIG_PATH, 'utf-8');
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
    
    // admin-config.jsonから支払い情報を取得
    const adminConfigPath = join(process.cwd(), 'admin-config.json');
    let paymentInfo = null;
    
    if (existsSync(adminConfigPath)) {
      const adminConfig = JSON.parse(readFileSync(adminConfigPath, 'utf-8'));
      if (adminConfig.tokens && adminConfig.tokens.length > 0) {
        const defaultToken = adminConfig.tokens[0];
        paymentInfo = {
          currency: defaultToken.thirdweb.currency,
          price: defaultToken.thirdweb.currentPrice,
          tokenAddress: defaultToken.thirdweb.currency === 'ZENY' 
            ? '0x7B2d2732dcCC1830AA63241dC13649b7861d9b54' 
            : null,
        };
      }
    }
    
    return NextResponse.json({
      ...settings,
      payment: paymentInfo,
      source: 'ClaimCondition',
    });
  } catch (error) {
    console.error('Error loading project settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// プロジェクト設定を更新
export async function POST(req: Request) {
  try {
    const settings = await req.json();
    
    // 支払い情報以外の設定を保存
    const { payment, ...settingsToSave } = settings;
    
    writeFileSync(
      PROJECT_CONFIG_PATH, 
      JSON.stringify(settingsToSave, null, 2)
    );
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: settingsToSave,
    });
  } catch (error) {
    console.error('Error saving project settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}