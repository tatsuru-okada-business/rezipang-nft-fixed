'use client';

import { useState, useEffect } from 'react';

interface ProjectSettings {
  projectName: string;
  projectDescription: string;
  features: {
    showTokenGallery: boolean;
    showPriceChecker: boolean;
    showMintSimulator: boolean;
    showDebugInfo: boolean;
    maxMintPerWallet: boolean;
  };
  ui: {
    theme: {
      primary: string;
      secondary: string;
    };
  };
  localization: {
    defaultLocale: string;
    availableLocales: string[];
  };
  payment?: {
    currency: string;
    price: string;
    tokenAddress: string | null;
  };
}

export function ProjectSettings() {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/project-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/project-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        alert('設定を保存しました');
      } else {
        alert('設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!settings) return <div>設定を読み込めませんでした</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">プロジェクト設定</h2>
      
      {/* 基本設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">基本設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              プロジェクト名
            </label>
            <input
              type="text"
              value={settings.projectName}
              onChange={(e) => setSettings({
                ...settings,
                projectName: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              プロジェクト説明
            </label>
            <textarea
              value={settings.projectDescription}
              onChange={(e) => setSettings({
                ...settings,
                projectDescription: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 支払い情報（読み取り専用） */}
      {settings.payment && (
        <div className="mb-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            支払い設定（Claim Conditionから自動取得）
          </h3>
          <div className="space-y-2 text-sm">
            <p>通貨: <span className="font-semibold">{settings.payment.currency}</span></p>
            <p>価格: <span className="font-semibold">{settings.payment.price}</span></p>
            {settings.payment.tokenAddress && (
              <p className="text-xs">
                トークンアドレス: {settings.payment.tokenAddress}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ 支払い設定はThirdwebのClaim Conditionから自動的に取得されます
          </p>
        </div>
      )}

      {/* 機能フラグ */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">機能設定</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features.showTokenGallery}
              onChange={(e) => setSettings({
                ...settings,
                features: {
                  ...settings.features,
                  showTokenGallery: e.target.checked
                }
              })}
              className="mr-2"
            />
            トークンギャラリーを表示
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features.showPriceChecker}
              onChange={(e) => setSettings({
                ...settings,
                features: {
                  ...settings.features,
                  showPriceChecker: e.target.checked
                }
              })}
              className="mr-2"
            />
            価格チェッカーを表示（開発用）
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features.showMintSimulator}
              onChange={(e) => setSettings({
                ...settings,
                features: {
                  ...settings.features,
                  showMintSimulator: e.target.checked
                }
              })}
              className="mr-2"
            />
            ミントシミュレーターを表示
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.features.maxMintPerWallet}
              onChange={(e) => setSettings({
                ...settings,
                features: {
                  ...settings.features,
                  maxMintPerWallet: e.target.checked
                }
              })}
              className="mr-2"
            />
            ウォレットごとの最大ミント数制限
          </label>
        </div>
      </div>

      {/* UI設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">UIテーマ</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              プライマリカラー
            </label>
            <select
              value={settings.ui.theme.primary}
              onChange={(e) => setSettings({
                ...settings,
                ui: {
                  ...settings.ui,
                  theme: {
                    ...settings.ui.theme,
                    primary: e.target.value
                  }
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="purple">Purple</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="red">Red</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              セカンダリカラー
            </label>
            <select
              value={settings.ui.theme.secondary}
              onChange={(e) => setSettings({
                ...settings,
                ui: {
                  ...settings.ui,
                  theme: {
                    ...settings.ui.theme,
                    secondary: e.target.value
                  }
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="blue">Blue</option>
              <option value="purple">Purple</option>
              <option value="green">Green</option>
              <option value="gray">Gray</option>
            </select>
          </div>
        </div>
      </div>

      {/* 言語設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">言語設定</h3>
        <div>
          <label className="block text-sm font-medium mb-1">
            デフォルト言語
          </label>
          <select
            value={settings.localization.defaultLocale}
            onChange={(e) => setSettings({
              ...settings,
              localization: {
                ...settings.localization,
                defaultLocale: e.target.value
              }
            })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>
    </div>
  );
}