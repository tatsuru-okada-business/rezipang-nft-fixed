import { WalletConnect } from "@/components/WalletConnect";
import { SimpleMint } from "@/components/SimpleMint";
import { NFTDetails } from "@/components/NFTDetails";
import { PriceChecker } from "@/components/PriceChecker";
import { MintSimulator } from "@/components/MintSimulator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DebugInfo } from "@/components/DebugInfo";
import { isFeatureEnabled } from "@/lib/projectConfig";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

const translations = {
  en,
  ja,
} as const;

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = translations[locale as keyof typeof translations] || translations.en;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher currentLocale={locale} />
          </div>
          
          <header className="text-center mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {t.title}
            </h1>
            <p className="text-xl text-gray-800 font-medium">
              {t.subtitle}
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
        </div>
      </div>
      
      {/* デバッグ情報（常に表示 - エラー報告用） */}
      <DebugInfo locale={locale} />
    </main>
  );
}