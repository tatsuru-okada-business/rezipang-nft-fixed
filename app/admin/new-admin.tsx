'use client';

import { useEffect, useState } from 'react';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';
import type { ManagedToken } from '@/lib/types/adminConfig';
import { formatPrice } from '@/lib/formatPrice';
import { ProjectSettings } from '@/components/admin/ProjectSettings';

const ADMIN_ADDRESSES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || '').split(',').map(addr => addr.toLowerCase().trim());

interface AllowlistData {
  exists: boolean;
  tokenId: string;
  isDefault: boolean;
  headers: string[];
  data: any[];
  stats: {
    totalEntries: number;
    uniqueAddresses: number;
    totalMaxMint: number;
  };
  filePath: string;
}

export default function NewAdminPanel() {
  const account = useActiveAccount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tokens, setTokens] = useState<ManagedToken[]>([]);
  const [defaultTokenId, setDefaultTokenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ManagedToken | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [showAllowlistModal, setShowAllowlistModal] = useState(false);
  const [allowlistData, setAllowlistData] = useState<AllowlistData | null>(null);
  const [loadingAllowlist, setLoadingAllowlist] = useState(false);

  // default-token APIを読み込む
  useEffect(() => {
    fetch('/api/default-token')
      .then(res => res.json())
      .then(data => {
        if (data.token && data.token.tokenId !== undefined) {
          setDefaultTokenId(data.token.tokenId);
        }
      })
      .catch(() => {
        // エラー時は何もしない（nullのまま）
      });
  }, []);

  useEffect(() => {
    if (account?.address) {
      const isAdminUser = ADMIN_ADDRESSES.includes(account.address.toLowerCase());
      setIsAdmin(isAdminUser);
      if (isAdminUser) {
        // 自動同期を削除、JSONファイルから読み込みのみ
        loadTokensFromConfig();
      }
    } else {
      setIsAdmin(false);
    }
  }, [account?.address]);

  // JSONファイルから設定を読み込む（同期なし）
  const loadTokensFromConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tokens');
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
        if (data.lastSync) {
          setLastSync(new Date(data.lastSync));
        }
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  // Thirdwebと同期（手動実行のみ）
  const syncTokens = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-tokens');
      if (response.ok) {
        const data = await response.json();
        console.log('Received tokens from API:', data.tokens);
        
        // トークンデータの検証
        const validTokens = (data.tokens || []).filter((token: any) => {
          if (!token || !token.thirdweb) {
            console.warn('Invalid token structure:', token);
            return false;
          }
          return true;
        });
        
        validTokens.forEach((token: any) => {
          console.log(`Token ${token.thirdweb.tokenId}:`, {
            name: token.thirdweb.name,
            hasImage: !!token.thirdweb.image,
            imageUrl: token.thirdweb.image,
          });
        });
        
        setTokens(validTokens);
        setLastSync(new Date(data.lastSync));
        
        // default-token.jsonを読み込み（APIエンドポイント経由）
        const defaultRes = await fetch('/api/default-token');
        if (defaultRes.ok) {
          const defaultData = await defaultRes.json();
          setDefaultTokenId(defaultData.tokenId || 0);
        }
      }
    } catch (error) {
      console.error('Error syncing tokens:', error);
    } finally {
      setSyncing(false);
    }
  };

  const updateLocalSettings = async (tokenId: number, settings: any) => {
    setSaving(true);
    try {
      // デフォルト表示の更新
      if (settings.isDefaultDisplay) {
        // default-token.jsonに書き込む
        await fetch('/api/default-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenId })
        });
        setDefaultTokenId(tokenId);
      }
      
      // Date オブジェクトをISO文字列に変換
      const settingsToSend = {
        ...settings,
        salesStartDate: settings.salesStartDate instanceof Date ? 
          settings.salesStartDate.toISOString() : settings.salesStartDate,
        salesEndDate: settings.salesEndDate instanceof Date ? 
          settings.salesEndDate.toISOString() : settings.salesEndDate,
      };
      
      const response = await fetch('/api/admin/sync-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, settings: settingsToSend }),
      });
      
      if (response.ok) {
        // ローカル状態を即座に更新（再同期なし）
        const updatedTokens = tokens.map(t => 
          t.thirdweb.tokenId === tokenId 
            ? { ...t, local: { ...t.local, ...settingsToSend } }
            : t
        );
        setTokens(updatedTokens);
        
        // 短い成功表示
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-500';
        successMessage.textContent = '✅ 設定を保存しました';
        document.body.appendChild(successMessage);
        setTimeout(() => {
          successMessage.style.opacity = '0';
          setTimeout(() => document.body.removeChild(successMessage), 500);
        }, 2000);
      } else {
        throw new Error('保存に失敗しました');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      // エラー表示
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-500';
      errorMessage.textContent = '❌ 設定の保存に失敗しました';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        errorMessage.style.opacity = '0';
        setTimeout(() => document.body.removeChild(errorMessage), 500);
      }, 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!account?.address) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">管理パネル</h1>
          <p className="text-gray-400 mb-8">管理者ウォレットを接続してください</p>
          <ConnectButton client={client} />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">アクセス拒否</h1>
          <p className="text-gray-400">管理者権限がありません</p>
          <p className="text-gray-500 text-sm mt-2">接続中: {account.address}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">NFT管理パネル</h1>
            {lastSync && (
              <p className="text-gray-400 text-sm mt-1">
                最終同期: {lastSync.toLocaleString('ja-JP')}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={syncTokens}
              disabled={syncing}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {syncing ? '同期中...' : 'Thirdwebと同期'}
            </button>
            <ConnectButton client={client} />
          </div>
        </div>

        {/* トークン一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens
            .filter(token => token?.thirdweb?.name && !token.thirdweb.name.match(/^Token #\d+$/))
            .map(token => (
            <div
              key={token.thirdweb.tokenId}
              className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 transition"
              onClick={() => setSelectedToken(token)}
            >
              {/* Thirdweb情報（読み取り専用） */}
              <div className="mb-4 pb-4 border-b border-gray-700">
                {/* トークン画像 */}
                {token.thirdweb.image && (
                  <div className="mb-3">
                    <img
                      src={token.thirdweb.image.startsWith('ipfs://') 
                        ? `https://ipfs.io/ipfs/${token.thirdweb.image.replace('ipfs://', '')}`
                        : token.thirdweb.image
                      }
                      alt={token.thirdweb.name}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {token.thirdweb.name}
                </h3>
                <p className="text-gray-400 text-sm">Token ID: #{token.thirdweb.tokenId}</p>
                
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">価格:</span>
                    <span className="text-gray-300">
                      {formatPrice(token.thirdweb.currentPrice || token.thirdweb.price || '0', token.thirdweb.currencySymbol || token.thirdweb.currency || '')} {token.thirdweb.currencySymbol || ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">供給量:</span>
                    <span className="text-gray-300">
                      {token.thirdweb.totalSupply?.toString() || '∞'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                  <a
                    href={`https://thirdweb.com/polygon/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}/nfts/${token.thirdweb.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Thirdwebで編集 →
                  </a>
                  <button
                    className="text-purple-400 text-xs hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedToken(token);
                    }}
                  >
                    詳細設定 →
                  </button>
                </div>
              </div>

              {/* ローカル設定（編集可能） */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">サイト表示:</span>
                  <span className={`text-sm font-semibold ${token.local.displayEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                    {token.local.displayEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                
                {/* 最大発行数設定 */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">最大発行数:</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {token.local.maxSupply || '無制限'}
                  </span>
                </div>
                
                {token.local.maxSupply && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">残り:</span>
                    <span className="text-sm font-semibold text-yellow-400">
                      {(token.local.maxSupply - (token.local.totalMinted || 0))} / {token.local.maxSupply}
                    </span>
                  </div>
                )}
                
                {/* 販売期間表示 */}
                {token.local.salesPeriodEnabled && (
                  <div className="mt-2 p-2 bg-gray-700 rounded text-xs space-y-1">
                    <div className="text-gray-300">📅 販売期間</div>
                    {token.local.salesStartDate && (
                      <div className="text-gray-400">
                        開始: {new Date(token.local.salesStartDate).toLocaleString('ja-JP', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                    {token.local.salesEndDate && (
                      <div className="text-gray-400">
                        終了: {new Date(token.local.salesEndDate).toLocaleString('ja-JP', { 
                          month: '2-digit', 
                          day: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                    {!token.local.salesStartDate && !token.local.salesEndDate && (
                      <div className="text-gray-400">期間制限なし</div>
                    )}
                  </div>
                )}
                
                {token.thirdweb.tokenId === defaultTokenId && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-400 text-sm">デフォルト表示:</span>
                    <span className="text-sm font-semibold text-blue-400">★</span>
                  </div>
                )}
                
                {token.local.salesNote && (
                  <div className="mt-2 p-2 bg-gray-700 rounded text-xs text-gray-300">
                    📝 {token.local.salesNote}
                  </div>
                )}
                
                {token.local.totalMinted > 0 && (
                  <div className="text-xs text-gray-400">
                    累計ミント: {token.local.totalMinted}個
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* トークン詳細モーダル */}
        {selectedToken && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
              {/* トークン画像 */}
              {selectedToken.thirdweb.image && (
                <div className="mb-6">
                  <img
                    src={selectedToken.thirdweb.image.startsWith('ipfs://') 
                      ? `https://ipfs.io/ipfs/${selectedToken.thirdweb.image.replace('ipfs://', '')}`
                      : selectedToken.thirdweb.image
                    }
                    alt={selectedToken.thirdweb.name}
                    className="w-full max-w-md mx-auto h-64 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <h2 className="text-2xl font-bold text-white mb-6">
                {selectedToken.thirdweb.name}
                <span className="text-gray-400 text-lg ml-2">
                  (Token #{selectedToken.thirdweb.tokenId})
                </span>
              </h2>

              {/* Thirdweb情報 */}
              <div className="bg-gray-900 rounded p-4 mb-6">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  Thirdweb情報（読み取り専用）
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">価格:</span>
                    <span className="text-gray-300 ml-2">
                      {selectedToken.thirdweb.currentPrice} {selectedToken.thirdweb.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">最大購入数:</span>
                    <span className="text-gray-300 ml-2">
                      {selectedToken.thirdweb.maxPerWallet || '無制限'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ローカル設定 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-400">
                  ローカル設定（編集可能）
                </h3>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    サイト表示
                  </label>
                  <select
                    value={selectedToken.local.displayEnabled ? 'true' : 'false'}
                    onChange={(e) => {
                      const newToken = { ...selectedToken };
                      newToken.local.displayEnabled = e.target.value === 'true';
                      setSelectedToken(newToken);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                  >
                    <option value="true">表示する</option>
                    <option value="false">非表示</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedToken.local.isDefaultDisplay || selectedToken.thirdweb.tokenId === defaultTokenId}
                      onChange={(e) => {
                        const newToken = { ...selectedToken };
                        newToken.local.isDefaultDisplay = e.target.checked;
                        setSelectedToken(newToken);
                        // 即座にUIを更新
                        if (e.target.checked) {
                          setDefaultTokenId(selectedToken.thirdweb.tokenId);
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-400">デフォルト表示に設定</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    ギャラリー下部に最初に表示されるNFTとして設定
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    表示順序
                  </label>
                  <input
                    type="number"
                    value={selectedToken.local.displayOrder}
                    onChange={(e) => {
                      const newToken = { ...selectedToken };
                      newToken.local.displayOrder = parseInt(e.target.value);
                      setSelectedToken(newToken);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                  />
                </div>

                {/* 価格と通貨設定 */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      価格
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={selectedToken.local.customPrice || selectedToken.thirdweb.price || ''}
                      onChange={(e) => {
                        const newToken = { ...selectedToken };
                        newToken.local.customPrice = e.target.value;
                        if (!newToken.thirdweb) newToken.thirdweb = {};
                        newToken.thirdweb.price = e.target.value;
                        setSelectedToken(newToken);
                      }}
                      placeholder="例: 1"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      通貨
                    </label>
                    <select
                      value={selectedToken.thirdweb.currencySymbol || selectedToken.thirdweb.currency || ''}
                      onChange={async (e) => {
                        const symbol = e.target.value;
                        // 通貨設定を取得
                        const response = await fetch('/api/admin/currency-config');
                        const config = await response.json();
                        const currency = config.currencies.find((c: any) => c.symbol === symbol);
                        
                        const newToken = { ...selectedToken };
                        if (!newToken.thirdweb) newToken.thirdweb = {};
                        newToken.thirdweb.currencySymbol = symbol;
                        newToken.thirdweb.currency = currency?.address || '0x0000000000000000000000000000000000000000';
                        newToken.thirdweb.currencyDecimals = currency?.decimals || 18;
                        newToken.thirdweb.currencyIsNative = currency?.isNative || false;
                        setSelectedToken(newToken);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                    >
                      <option value="POL">POL (Native)</option>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="ZENY">ZENY</option>
                      <option value="WETH">WETH</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      選択した通貨でNFTを販売します
                    </p>
                  </div>
                </div>

                {/* 販売期間設定 */}
                <div className="border-t border-gray-600 pt-4">
                  <label className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedToken.local.salesPeriodEnabled || false}
                      onChange={(e) => {
                        const newToken = { ...selectedToken };
                        newToken.local.salesPeriodEnabled = e.target.checked;
                        if (!e.target.checked) {
                          newToken.local.isUnlimited = false;
                        }
                        setSelectedToken(newToken);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-400">販売期間を設定</span>
                  </label>

                  {selectedToken.local.salesPeriodEnabled && (
                    <>
                      <div className="ml-6 space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedToken.local.isUnlimited || false}
                            onChange={(e) => {
                              const newToken = { ...selectedToken };
                              newToken.local.isUnlimited = e.target.checked;
                              setSelectedToken(newToken);
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-400">無期限販売</span>
                        </label>

                        {!selectedToken.local.isUnlimited && (
                          <>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                販売開始日時 (UTC)
                              </label>
                              <input
                                type="datetime-local"
                                value={selectedToken.local.salesStartDate ? 
                                  new Date(selectedToken.local.salesStartDate).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const newToken = { ...selectedToken };
                                  // datetime-localの値をUTCとして扱う
                                  newToken.local.salesStartDate = e.target.value ? new Date(e.target.value + 'Z') : undefined;
                                  setSelectedToken(newToken);
                                }}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm"
                              />
                              {selectedToken.local.salesStartDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  JST: {new Date(selectedToken.local.salesStartDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-xs text-gray-400 mb-1">
                                販売終了日時 (UTC)
                              </label>
                              <input
                                type="datetime-local"
                                value={selectedToken.local.salesEndDate ? 
                                  new Date(selectedToken.local.salesEndDate).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const newToken = { ...selectedToken };
                                  // datetime-localの値をUTCとして扱う
                                  newToken.local.salesEndDate = e.target.value ? new Date(e.target.value + 'Z') : undefined;
                                  setSelectedToken(newToken);
                                }}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm"
                              />
                              {selectedToken.local.salesEndDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  JST: {new Date(selectedToken.local.salesEndDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 最大発行数設定 */}
                {/* CSVアローリスト管理 */}
                <div className="bg-gray-900 rounded p-4 mb-4">
                  <h4 className="text-md font-semibold text-green-400 mb-3">
                    アローリスト管理（CSV）
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        CSVファイルアップロード
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('tokenId', selectedToken.thirdweb.tokenId.toString());
                          
                          try {
                            const response = await fetch('/api/admin/upload-allowlist', {
                              method: 'POST',
                              headers: {
                                'X-Admin-Address': account?.address || '',
                              },
                              body: formData,
                            });
                            
                            const data = await response.json();
                            if (data.success) {
                              alert(`アローリストをアップロードしました。\n登録アドレス数: ${data.stats.totalAddresses}`);
                            } else {
                              alert(`エラー: ${data.error}`);
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert('アップロードに失敗しました');
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        CSVフォーマット: address,maxMintAmount (ヘッダー行必須)
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setLoadingAllowlist(true);
                          try {
                            const response = await fetch(`/api/admin/view-allowlist?tokenId=${selectedToken.thirdweb.tokenId}`, {
                              headers: {
                                'X-Admin-Address': account?.address || '',
                              },
                            });
                            if (response.ok) {
                              const data = await response.json();
                              setAllowlistData(data);
                              setShowAllowlistModal(true);
                            } else {
                              alert('アローリストの取得に失敗しました');
                            }
                          } catch (error) {
                            console.error('View error:', error);
                            alert('アローリストの表示に失敗しました');
                          } finally {
                            setLoadingAllowlist(false);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                        disabled={loadingAllowlist}
                      >
                        {loadingAllowlist ? '読み込み中...' : 'アローリストを表示'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/admin/upload-allowlist?tokenId=${selectedToken.thirdweb.tokenId}`);
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `allowlist-token-${selectedToken.thirdweb.tokenId}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } else {
                              alert('アローリストが見つかりません');
                            }
                          } catch (error) {
                            console.error('Download error:', error);
                            alert('ダウンロードに失敗しました');
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        CSVダウンロード
                      </button>
                    </div>
                  </div>
                </div>

                {/* 最大発行数管理 */}
                <div className="bg-gray-900 rounded p-4">
                  <h4 className="text-md font-semibold text-yellow-400 mb-3">
                    最大発行数管理
                  </h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        追加発行数
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          placeholder="追加発行数を入力"
                          onChange={(e) => {
                            const newToken = { ...selectedToken };
                            const additionalSupply = e.target.value ? parseInt(e.target.value) : 0;
                            const currentMinted = newToken.local.totalMinted || 0;
                            newToken.local.maxSupply = additionalSupply > 0 ? currentMinted + additionalSupply : undefined;
                            setSelectedToken(newToken);
                          }}
                          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded"
                          min="0"
                        />
                        <button
                          onClick={() => {
                            const newToken = { ...selectedToken };
                            newToken.local.maxSupply = undefined;
                            newToken.local.isUnlimited = true;
                            setSelectedToken(newToken);
                          }}
                          className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm"
                        >
                          無制限に設定
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        現在のミント済み数: {selectedToken.local.totalMinted || 0}個
                      </p>
                      {selectedToken.local.maxSupply && (
                        <p className="text-xs text-green-400 mt-1">
                          → 最大発行数: {selectedToken.local.maxSupply}個に設定されます
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        運営予約分
                      </label>
                      <input
                        type="number"
                        value={selectedToken.local.reservedSupply || 0}
                        onChange={(e) => {
                          const newToken = { ...selectedToken };
                          newToken.local.reservedSupply = parseInt(e.target.value) || 0;
                          setSelectedToken(newToken);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                        min="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        最大発行数から差し引かれる運営保有分
                      </p>
                    </div>

                    {selectedToken.local.maxSupply && (
                      <div className="bg-gray-800 rounded p-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">最大発行数:</span>
                          <span className="text-white font-semibold">
                            {selectedToken.local.maxSupply}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">運営予約分:</span>
                          <span className="text-white">
                            {selectedToken.local.reservedSupply || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">一般販売可能数:</span>
                          <span className="text-white font-semibold">
                            {(selectedToken.local.maxSupply || 0) - (selectedToken.local.reservedSupply || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">現在のミント済み数:</span>
                          <span className="text-white">
                            {selectedToken.local.totalMinted || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">残り販売可能数:</span>
                          <span className={`font-semibold ${
                            ((selectedToken.local.maxSupply || 0) - (selectedToken.local.reservedSupply || 0) - (selectedToken.local.totalMinted || 0)) <= 10
                              ? 'text-red-400'
                              : 'text-green-400'
                          }`}>
                            {(selectedToken.local.maxSupply || 0) - (selectedToken.local.reservedSupply || 0) - (selectedToken.local.totalMinted || 0)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        売り切れ時のメッセージ
                      </label>
                      <input
                        type="text"
                        value={selectedToken.local.soldOutMessage || ''}
                        onChange={(e) => {
                          const newToken = { ...selectedToken };
                          newToken.local.soldOutMessage = e.target.value;
                          setSelectedToken(newToken);
                        }}
                        placeholder="売り切れました"
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        在庫がなくなった時に表示されるメッセージ
                      </p>
                    </div>

                    {/* 最大ミント数の設定は削除 - アローリストCSVで管理 */}
                    <div className="bg-gray-900 rounded p-3">
                      <div className="text-sm text-gray-400 mb-2">
                        💡 最大ミント数の管理
                      </div>
                      <p className="text-xs text-gray-500">
                        最大ミント数はアローリストCSVで管理されます。
                        <br />
                        CSVファイルの「maxMintAmount」列で各ウォレットの最大ミント数を設定してください。
                        <br />
                        <span className="text-yellow-400 mt-1 block">
                          ※ ClaimConditionの制限を超えることはできません
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    販売メモ（内部用）
                  </label>
                  <textarea
                    value={selectedToken.local.salesNote || ''}
                    onChange={(e) => {
                      const newToken = { ...selectedToken };
                      newToken.local.salesNote = e.target.value;
                      setSelectedToken(newToken);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    カスタム説明文（サイト表示用）
                  </label>
                  <textarea
                    value={selectedToken.local.customDescription || ''}
                    onChange={(e) => {
                      const newToken = { ...selectedToken };
                      newToken.local.customDescription = e.target.value;
                      setSelectedToken(newToken);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                    rows={3}
                  />
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={async () => {
                    await updateLocalSettings(selectedToken.thirdweb.tokenId, selectedToken.local);
                    if (!saving) {
                      setSelectedToken(null);
                    }
                  }}
                  disabled={saving}
                  className={`flex-1 px-6 py-3 text-white rounded transition-all ${
                    saving 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </span>
                  ) : '保存'}
                </button>
                <button
                  onClick={() => setSelectedToken(null)}
                  disabled={saving}
                  className={`flex-1 px-6 py-3 text-white rounded transition-all ${
                    saving 
                      ? 'bg-gray-500 cursor-not-allowed' 
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* プロジェクト設定セクション */}
      <div className="mt-8">
        <ProjectSettings />
      </div>
      
      {/* 保存中のグローバルオーバーレイ（最前面） */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-2xl">
            <svg className="animate-spin h-16 w-16 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-800 font-bold text-lg">設定を保存中...</p>
            <p className="text-gray-600 text-sm mt-2">しばらくお待ちください</p>
          </div>
        </div>
      )}

      {/* アローリスト表示モーダル */}
      {showAllowlistModal && allowlistData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                アローリスト - Token #{allowlistData.tokenId}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowAllowlistModal(false);
                  setAllowlistData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!allowlistData.exists ? (
              <div className="text-center py-8">
                <p className="text-gray-400">このトークンにはアローリストが設定されていません</p>
              </div>
            ) : (
              <>
                {/* 統計情報 */}
                <div className="bg-gray-900 rounded p-4 mb-4">
                  <h3 className="text-sm font-semibold text-green-400 mb-2">統計情報</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">登録アドレス数:</span>
                      <span className="ml-2 text-white font-semibold">{allowlistData.stats.totalEntries}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">ユニークアドレス:</span>
                      <span className="ml-2 text-white font-semibold">{allowlistData.stats.uniqueAddresses}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">合計最大ミント数:</span>
                      <span className="ml-2 text-white font-semibold">{allowlistData.stats.totalMaxMint}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    ソース: {allowlistData.filePath}
                    {allowlistData.isDefault && " (デフォルトアローリスト)"}
                  </div>
                </div>

                {/* データテーブル */}
                <div className="flex-1 overflow-auto bg-gray-900 rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-400">#</th>
                        {allowlistData.headers.map((header, index) => (
                          <th key={index} className="px-4 py-2 text-left text-gray-400">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allowlistData.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-gray-700 hover:bg-gray-800">
                          <td className="px-4 py-2 text-gray-500">{rowIndex + 1}</td>
                          {allowlistData.headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-4 py-2 text-white font-mono text-xs">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* アクションボタン */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/admin/upload-allowlist?tokenId=${allowlistData.tokenId}`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `allowlist-token-${allowlistData.tokenId}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }
                      } catch (error) {
                        console.error('Download error:', error);
                        alert('ダウンロードに失敗しました');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    CSVダウンロード
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllowlistModal(false);
                      setAllowlistData(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}