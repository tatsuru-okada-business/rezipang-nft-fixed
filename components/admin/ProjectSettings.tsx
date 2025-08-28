'use client';

import { useState, useEffect } from 'react';
import { ColorPicker } from './ColorPicker';

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
      backgroundColor: string;
      textColor: string;
    };
    textOutline?: {
      enabled: boolean;
      color: string;
    };
  };
  localization: {
    defaultLocale: string;
    availableLocales: string[];
  };
}

export function ProjectSettings() {
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingFavicon, setGeneratingFavicon] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

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

  const generateFavicon = async () => {
    if (!settings) return;
    
    setGeneratingFavicon(true);
    try {
      const response = await fetch('/api/admin/generate-favicon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: settings.projectName || 'NFT',
          theme: settings.ui.theme,
          textOutline: settings.ui.textOutline
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFaviconPreview(data.favicon);
        
        // faviconを即座に更新（少し遅延させてファイルが保存されるのを待つ）
        setTimeout(() => {
          updateFaviconInDOM();
        }, 100);
      }
    } catch (error) {
      console.error('Favicon generation failed:', error);
    }
    setGeneratingFavicon(false);
  };

  const updateFaviconInDOM = () => {
    try {
      // 既存のfaviconリンクを更新または新規作成
      let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      
      if (!faviconLink) {
        // faviconリンクが存在しない場合は新規作成
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/svg+xml';
        document.head.appendChild(faviconLink);
      }
      
      // hrefを更新（キャッシュバスティング付き）
      faviconLink.href = `/api/favicon?t=${Date.now()}`;
      
    } catch (error) {
      console.error('Error updating favicon:', error);
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
        
        // faviconがプレビューされている場合、再度生成して反映
        if (faviconPreview) {
          await generateFavicon();
        }
        
        // ページをリロードして新しい設定を反映
        setTimeout(() => {
          window.location.reload();
        }, 500);
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">プロジェクト設定</h2>
      
      {/* 基本設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">基本設定</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              プロジェクト名
            </label>
            <input
              type="text"
              value={settings.projectName}
              onChange={(e) => setSettings({
                ...settings,
                projectName: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              プロジェクト説明
            </label>
            <textarea
              value={settings.projectDescription}
              onChange={(e) => setSettings({
                ...settings,
                projectDescription: e.target.value
              })}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>
      </div>


      {/* 機能フラグ */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">機能設定</h3>
        <div className="space-y-3">
          <label className="flex items-center text-gray-700">
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
              className="mr-2 accent-blue-600"
            />
            トークンギャラリーを表示
          </label>
          <label className="flex items-center text-gray-700">
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
              className="mr-2 accent-blue-600"
            />
            価格チェッカーを表示（開発用）
          </label>
          <label className="flex items-center text-gray-700">
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
              className="mr-2 accent-blue-600"
            />
            ミントシミュレーターを表示
          </label>
          <label className="flex items-center text-gray-700">
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
              className="mr-2 accent-blue-600"
            />
            ウォレットごとの最大ミント数制限
          </label>
        </div>
      </div>

      {/* UI設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">サイト全体の色設定</h3>
        <div className="text-sm text-gray-600 mb-4">
          サイト全体の背景色と文字色を設定できます
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label="背景色"
            color={settings.ui.theme.backgroundColor || '#E0E7FF'}
            onChange={(color) => setSettings({
              ...settings,
              ui: {
                ...settings.ui,
                theme: {
                  ...settings.ui.theme,
                  backgroundColor: color
                }
              }
            })}
          />
          <ColorPicker
            label="メイン文字色"
            color={settings.ui.theme.textColor || '#7C3AED'}
            onChange={(color) => setSettings({
              ...settings,
              ui: {
                ...settings.ui,
                theme: {
                  ...settings.ui.theme,
                  textColor: color
                }
              }
            })}
          />
        </div>
        <div className="mt-4 p-4 border rounded-lg">
          <div className="text-sm text-gray-600 mb-2">プレビュー:</div>
          <div 
            className="p-6 rounded-lg"
            style={{ 
              backgroundColor: settings.ui.theme.backgroundColor || '#E0E7FF',
            }}
          >
            <h2 
              className="text-2xl font-bold mb-3"
              style={{ 
                color: settings.ui.theme.textColor || '#7C3AED',
                textShadow: settings.ui?.textOutline?.enabled 
                  ? `1px 1px 0 ${settings.ui.textOutline.color || '#000000'}, -1px 1px 0 ${settings.ui.textOutline.color || '#000000'}, 1px -1px 0 ${settings.ui.textOutline.color || '#000000'}, -1px -1px 0 ${settings.ui.textOutline.color || '#000000'}`
                  : 'none'
              }}
            >
              限定NFTミント
            </h2>
            <div className="space-y-2">
              <p style={{ color: settings.ui.theme.textColor || '#7C3AED' }}>
                ・無料
              </p>
              <div className="flex items-center gap-2">
                <button 
                  className="px-3 py-1 rounded border-2"
                  style={{ 
                    borderColor: settings.ui.theme.textColor || '#7C3AED',
                    color: settings.ui.theme.textColor || '#7C3AED'
                  }}
                >
                  -
                </button>
                <span style={{ color: settings.ui.theme.textColor || '#7C3AED' }}>1</span>
                <button 
                  className="px-3 py-1 rounded border-2"
                  style={{ 
                    borderColor: settings.ui.theme.textColor || '#7C3AED',
                    color: settings.ui.theme.textColor || '#7C3AED'
                  }}
                >
                  +
                </button>
              </div>
              <button 
                className="px-6 py-2 rounded-lg font-bold"
                style={{ 
                  backgroundColor: settings.ui.theme.textColor || '#7C3AED',
                  color: settings.ui.theme.backgroundColor || '#E0E7FF'
                }}
              >
                NFTをミント
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 縁取り設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">縁取り設定</h3>
        <div className="space-y-4">
          <label className="flex items-center text-gray-700">
            <input
              type="checkbox"
              checked={settings.ui?.textOutline?.enabled || false}
              onChange={(e) => setSettings({
                ...settings,
                ui: {
                  ...settings.ui,
                  textOutline: {
                    enabled: e.target.checked,
                    color: settings.ui?.textOutline?.color || '#000000'
                  }
                }
              })}
              className="mr-2 accent-blue-600"
            />
            文字の縁取りを有効にする
          </label>
          {settings.ui?.textOutline?.enabled && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                縁取りの色
              </label>
              <input
                type="color"
                value={settings.ui?.textOutline?.color || '#000000'}
                onChange={(e) => setSettings({
                  ...settings,
                  ui: {
                    ...settings.ui,
                    textOutline: {
                      enabled: settings.ui?.textOutline?.enabled || false,
                      color: e.target.value
                    }
                  }
                })}
                className="w-20 h-10 border-2 border-gray-300 rounded cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                プロジェクト名、説明、favicon文字に適用されます
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Favicon自動生成 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Favicon設定</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              onClick={generateFavicon}
              disabled={generatingFavicon}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                generatingFavicon
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {generatingFavicon ? '生成中...' : 'アイコン自動生成'}
            </button>
            {faviconPreview && (
              <div className="flex items-center gap-2">
                <img src={faviconPreview} alt="Favicon Preview" className="w-8 h-8" />
                <span className="text-sm text-green-600 font-medium">
                  ✅ 生成されました
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            プロジェクト名の頭文字、テーマカラー、縁取り設定を使用して自動生成されます
          </p>
        </div>
      </div>

      {/* 言語設定 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">言語設定</h3>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
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
            className="w-full px-3 py-2 border rounded-lg text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ja" className="text-gray-600">日本語</option>
            <option value="en" className="text-gray-600">English</option>
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