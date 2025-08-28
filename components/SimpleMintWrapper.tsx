"use client";

import dynamic from 'next/dynamic';

interface SimpleMintWrapperProps {
  locale?: string;
}

// SimpleMintコンポーネントを動的にインポート（ローディング最適化）
const SimpleMint = dynamic(() => import('./SimpleMint').then(mod => ({ default: mod.SimpleMint })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  ),
});

export default function SimpleMintWrapper({ locale }: SimpleMintWrapperProps) {
  return <SimpleMint locale={locale} />;
}