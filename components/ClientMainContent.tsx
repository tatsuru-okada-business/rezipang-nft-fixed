"use client";

import dynamic from 'next/dynamic';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isFeatureEnabled } from "@/lib/projectConfig";

// 動的インポートで重いコンポーネントを遅延読み込み
const WalletConnect = dynamic(
  () => import("@/components/WalletConnect").then(mod => ({ default: mod.WalletConnect })),
  { 
    ssr: false,
    loading: () => <div className="h-12 bg-gray-200 animate-pulse rounded" />
  }
);

const SimpleMint = dynamic(
  () => import("@/components/SimpleMintV2").then(mod => ({ default: mod.SimpleMint })),
  { 
    ssr: false,
    loading: () => <div className="h-64 bg-gray-200 animate-pulse rounded" />
  }
);

const NFTDetails = dynamic(
  () => import("@/components/NFTDetails").then(mod => ({ default: mod.NFTDetails })),
  { 
    ssr: false,
    loading: () => <div className="h-32 bg-gray-200 animate-pulse rounded mb-8" />
  }
);

const PriceChecker = dynamic(
  () => import("@/components/PriceChecker").then(mod => ({ default: mod.PriceChecker })),
  { ssr: false }
);

const MintSimulator = dynamic(
  () => import("@/components/MintSimulator").then(mod => ({ default: mod.MintSimulator })),
  { ssr: false }
);

interface ClientMainContentProps {
  locale: string;
  translations: any;
  projectConfig: any;
}

export function ClientMainContent({ locale, translations: t, projectConfig }: ClientMainContentProps) {
  return (
    <>
      <div className="flex justify-end mb-4">
        <LanguageSwitcher currentLocale={locale} />
      </div>
      
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-4 site-title" style={{
          textShadow: projectConfig.ui?.textOutline?.enabled 
            ? `1px 1px 0 ${projectConfig.ui.textOutline.color || '#000000'}, -1px 1px 0 ${projectConfig.ui.textOutline.color || '#000000'}, 1px -1px 0 ${projectConfig.ui.textOutline.color || '#000000'}, -1px -1px 0 ${projectConfig.ui.textOutline.color || '#000000'}`
            : 'none'
        }}>
          {projectConfig.projectName || t.title}
        </h1>
        <p className="text-xl font-medium themed-text" style={{
          textShadow: projectConfig.ui?.textOutline?.enabled 
            ? `0.5px 0.5px 0 ${projectConfig.ui.textOutline.color || '#000000'}, -0.5px 0.5px 0 ${projectConfig.ui.textOutline.color || '#000000'}, 0.5px -0.5px 0 ${projectConfig.ui.textOutline.color || '#000000'}, -0.5px -0.5px 0 ${projectConfig.ui.textOutline.color || '#000000'}`
            : 'none'
        }}>
          {projectConfig.projectDescription || t.subtitle}
        </p>
      </header>

      {/* NFTコレクション情報 */}
      <NFTDetails locale={locale} />

      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        {/* ウォレット接続 */}
        <div className="flex justify-center mb-8">
          <WalletConnect locale={locale} />
        </div>

        {/* シンプルなミントUI */}
        <div className="border-t pt-8">
          <SimpleMint locale={locale} />
        </div>
      </div>

      {/* ミントシミュレーター - 設定で制御 */}
      {isFeatureEnabled('showMintSimulator') && (
        <div className="mb-8">
          <MintSimulator locale={locale} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 使い方 */}
        <div className="bg-white/90 rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.howItWorks.title}</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-800">
            <li>{t.howItWorks.step1}</li>
            <li>{t.howItWorks.step2}</li>
            <li>{t.howItWorks.step3}</li>
            <li>{t.howItWorks.step4}</li>
          </ol>
        </div>
        
        {/* 価格チェッカー（開発用） - 設定で制御 */}
        {isFeatureEnabled('showPriceChecker') && (
          <PriceChecker locale={locale} />
        )}
      </div>
    </>
  );
}