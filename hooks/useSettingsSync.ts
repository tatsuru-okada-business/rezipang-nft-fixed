'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSettingsSyncOptions {
  onSettingsChange?: () => void;
  pollInterval?: number;
  enabled?: boolean;
}

export function useSettingsSync({
  onSettingsChange,
  pollInterval = 5000, // 5秒ごとにチェック
  enabled = true
}: UseSettingsSyncOptions = {}) {
  const lastVersionRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      const response = await fetch('/api/settings-version', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      const currentVersion = data.version;
      
      if (currentVersion && lastVersionRef.current && currentVersion !== lastVersionRef.current) {
        // 設定が変更された
        console.log('Settings updated, refreshing...', {
          old: lastVersionRef.current,
          new: currentVersion
        });
        
        if (onSettingsChange) {
          onSettingsChange();
        } else {
          // デフォルトの動作：ページをリロード
          window.location.reload();
        }
      }
      
      lastVersionRef.current = currentVersion;
    } catch (error) {
      console.error('Error checking for settings updates:', error);
    }
  }, [onSettingsChange]);

  useEffect(() => {
    if (!enabled) return;

    // 初回チェック
    checkForUpdates();

    // 定期的なチェックを設定
    intervalRef.current = setInterval(checkForUpdates, pollInterval);

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkForUpdates, pollInterval, enabled]);

  // 手動で更新をチェックする関数を返す
  return { checkForUpdates };
}