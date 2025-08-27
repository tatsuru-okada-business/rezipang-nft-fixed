'use client';

import { useEffect, useState } from 'react';

interface SettingsUpdateNotificationProps {
  visible: boolean;
  onClose?: () => void;
}

export function SettingsUpdateNotification({ 
  visible, 
  onClose 
}: SettingsUpdateNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      // 自動的に5秒後に非表示にする
      const timer = setTimeout(() => {
        setShow(false);
        if (onClose) onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <svg 
          className="w-5 h-5 animate-spin" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        <span className="font-medium">
          設定が更新されました
        </span>
      </div>
    </div>
  );
}