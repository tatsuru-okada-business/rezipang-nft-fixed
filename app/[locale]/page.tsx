import { ClientMainContent } from "@/components/ClientMainContent";
import { PageThemeWrapper } from "@/components/PageThemeWrapper";
import { getProjectConfig } from "@/lib/projectConfig";
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
  const projectConfig = getProjectConfig();

  return (
    <PageThemeWrapper>
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <ClientMainContent 
              locale={locale} 
              translations={t} 
              projectConfig={projectConfig}
            />
          </div>
        </div>
      </main>
    </PageThemeWrapper>
  );
}