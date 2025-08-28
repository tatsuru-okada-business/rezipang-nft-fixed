'use client';

import { useEffect, useState, ReactNode } from 'react';

interface PageThemeWrapperProps {
  children: ReactNode;
}

export function PageThemeWrapper({ children }: PageThemeWrapperProps) {
  const [backgroundColor, setBackgroundColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 管理パネルの設定を読み込み
    fetch('/api/admin/project-settings')
      .then(res => res.json())
      .then(data => {
        if (data.ui?.theme) {
          const bg = data.ui.theme.backgroundColor || '#E0E7FF';
          const text = data.ui.theme.textColor || '#7C3AED';
          
          setBackgroundColor(bg);
          setTextColor(text);
          
          // CSS変数として設定
          const root = document.documentElement;
          root.style.setProperty('--site-bg-color', bg);
          root.style.setProperty('--site-text-color', text);
        }
        setIsLoaded(true);
      })
      .catch(err => {
        console.error(err);
        setIsLoaded(true);
      });
  }, []);

  if (!isLoaded) {
    return <div className="min-h-screen" />;
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: backgroundColor || '#E0E7FF',
        '--tw-text-opacity': '1',
      }}
    >
      <style jsx global>{`
        :root {
          --site-bg-color: ${backgroundColor};
          --site-text-color: ${textColor};
        }
        
        /* タイトル */
        h1, h2, h3, h4, h5, h6 {
          color: var(--site-text-color) !important;
        }
        
        /* 限定NFTミントのタイトル */
        .site-title {
          color: var(--site-text-color) !important;
        }
        
        /* 価格表示（無料など） */
        .price-display {
          color: var(--site-text-color) !important;
        }
        
        /* ボタン */
        .mint-button {
          background-color: var(--site-text-color) !important;
          color: var(--site-bg-color) !important;
        }
        
        .mint-button:hover {
          opacity: 0.9;
        }
        
        /* 数量セレクター */
        .quantity-button {
          border-color: var(--site-text-color) !important;
          color: var(--site-text-color) !important;
          background-color: transparent !important;
        }
        
        /* グレーアウト状態のボタンはグレーを保持 */
        .bg-gray-100 {
          background-color: rgb(243 244 246) !important;
        }
        
        .text-gray-400 {
          color: rgb(156 163 175) !important;
        }
        
        .quantity-display {
          color: var(--site-text-color) !important;
        }
        
        /* その他のテキスト */
        .themed-text {
          color: var(--site-text-color) !important;
        }
        
        /* ウォレット接続ボタン等 */
        .themed-button {
          background-color: var(--site-text-color) !important;
          color: var(--site-bg-color) !important;
        }
      `}</style>
      {children}
    </div>
  );
}