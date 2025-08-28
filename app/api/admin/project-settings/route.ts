import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const PROJECT_CONFIG_PATH = join(process.cwd(), 'project-settings.json');

// デフォルト設定
const DEFAULT_SETTINGS = {
  projectName: "NFT Minting Site",
  projectDescription: "NFT Minting Platform",
  features: {
    showTokenGallery: true,
    showPriceChecker: false,
    showMintSimulator: false,
    showDebugInfo: false,
    maxMintPerWallet: true,
  },
  ui: {
    theme: {
      backgroundColor: "#E0E7FF",
      textColor: "#7C3AED",
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
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error loading project settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

// プロジェクト設定を更新
export async function POST(req: Request) {
  try {
    const settings = await req.json();
    
    // 支払い情報とsource以外のすべての設定を保存
    const { payment, source, ...settingsToSave } = settings;
    
    // 既存の設定を読み込んでマージ
    let existingSettings = {};
    if (existsSync(PROJECT_CONFIG_PATH)) {
      const content = readFileSync(PROJECT_CONFIG_PATH, 'utf-8');
      existingSettings = JSON.parse(content);
    }
    
    // 新しい設定とマージ
    const finalSettings = {
      ...existingSettings,
      ...settingsToSave,
      projectName: settings.projectName,
      projectDescription: settings.projectDescription,
      features: settings.features,
      ui: settings.ui,
      localization: settings.localization,
    };
    
    // ファイルに保存
    writeFileSync(
      PROJECT_CONFIG_PATH, 
      JSON.stringify(finalSettings, null, 2)
    );
    
    console.log('Saved settings:', finalSettings);
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: finalSettings,
    });
  } catch (error) {
    console.error('Error saving project settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}