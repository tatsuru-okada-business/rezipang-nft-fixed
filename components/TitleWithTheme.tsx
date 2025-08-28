'use client';

import { useEffect, useState } from 'react';

interface TitleWithThemeProps {
  title: string;
}

export function TitleWithTheme({ title }: TitleWithThemeProps) {
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [bgColor, setBgColor] = useState('#9333EA');

  useEffect(() => {
    // 管理パネルの設定を読み込み
    fetch('/api/admin/project-settings')
      .then(res => res.json())
      .then(data => {
        if (data.ui?.theme) {
          setTextColor(data.ui.theme.titleTextColor || '#FFFFFF');
          setBgColor(data.ui.theme.titleBgColor || '#9333EA');
        }
      })
      .catch(console.error);
  }, []);

  return (
    <h1 
      className="text-5xl font-bold mb-4 px-8 py-4 rounded-xl inline-block"
      style={{ 
        color: textColor,
        backgroundColor: bgColor,
      }}
    >
      {title}
    </h1>
  );
}