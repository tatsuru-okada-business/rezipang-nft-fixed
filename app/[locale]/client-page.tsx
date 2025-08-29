'use client';

import { SimpleMint } from "@/components/SimpleMintV2";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { SettingsUpdateNotification } from "@/components/SettingsUpdateNotification";
import { useState } from "react";

interface ClientPageProps {
  locale: string;
  translations: any;
}

export default function ClientPage({ locale, translations }: ClientPageProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  
  // 管理画面からの設定変更を監視
  useSettingsSync({
    onSettingsChange: () => {
      // 通知を表示
      setShowUpdateNotification(true);
      // 1秒後にコンポーネントを再レンダリング（アニメーション用）
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 1000);
    },
    pollInterval: 3000, // 3秒ごとにチェック
    enabled: true
  });

  return (
    <>
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        {translations.mint.title}
      </h1>
      <SimpleMint key={refreshKey} locale={locale} />
      <SettingsUpdateNotification 
        visible={showUpdateNotification}
        onClose={() => setShowUpdateNotification(false)}
      />
    </>
  );
}