'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { themeColors, ThemeColor } from '@/lib/theme/colors';

interface ThemeSettings {
  primary: ThemeColor;
  secondary: ThemeColor;
}

interface ThemeContextType {
  theme: ThemeSettings;
  updateTheme: (theme: ThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: { primary: 'blue', secondary: 'gray' },
  updateTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>({
    primary: 'blue',
    secondary: 'gray',
  });

  useEffect(() => {
    // 管理パネルの設定を読み込み
    fetch('/api/admin/project-settings')
      .then(res => res.json())
      .then(data => {
        if (data.ui?.theme) {
          setTheme(data.ui.theme);
          applyTheme(data.ui.theme);
        }
      })
      .catch(console.error);
  }, []);

  const applyTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement;
    
    // プライマリカラーのCSS変数を設定
    const primaryColors = themeColors[themeSettings.primary];
    const secondaryColors = themeColors[themeSettings.secondary];
    
    if (primaryColors) {
      Object.entries(primaryColors).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });
    }
    
    if (secondaryColors) {
      Object.entries(secondaryColors).forEach(([shade, value]) => {
        root.style.setProperty(`--color-secondary-${shade}`, value);
      });
    }
  };

  const updateTheme = (newTheme: ThemeSettings) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}