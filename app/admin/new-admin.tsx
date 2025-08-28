'use client';

import { useEffect, useState } from 'react';
import { useActiveAccount, ConnectButton } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';
import type { ManagedToken } from '@/lib/types/adminConfig';
import { formatPrice } from '@/lib/formatPrice';
import { ProjectSettings } from '@/components/admin/ProjectSettings';

const ADMIN_ADDRESSES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || '').split(',').map(addr => addr.toLowerCase().trim());

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
        syncTokens();
      }
    } else {
      setIsAdmin(false);
    }
  }, [account?.address]);

  const syncTokens = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync-tokens');
      if (response.ok) {
        const data = await response.json();
        console.log('Received tokens from API:', data.tokens);
        data.tokens.forEach((token: any) => {
          console.log(`Token ${token.thirdweb.tokenId}:`, {
            name: token.thirdweb.name,
            hasImage: !!token.thirdweb.image,
            imageUrl: token.thirdweb.image,
          });
        });
        setTokens(data.tokens);
        setLastSync(new Date(data.lastSync));
        
        // default-token.jsonを読み込み
        const defaultRes = await fetch('/default-token.json');
        const defaultData = await defaultRes.json();
        setDefaultTokenId(defaultData.tokenId || 0);
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
            .filter(token => !token.thirdweb.name.match(/^Token #\d+$/))
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
                      {formatPrice(token.thirdweb.currentPrice || '0', token.thirdweb.currency || 'POL')} {token.thirdweb.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">供給量:</span>
                    <span className="text-gray-300">
                      {token.thirdweb.totalSupply?.toString() || '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">クレーム条件:</span>
                    <span className={token.thirdweb.claimConditionActive ? 'text-green-400' : 'text-red-400'}>
                      {token.thirdweb.claimConditionActive ? 'アクティブ' : '非アクティブ'}
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
                  <div>
                    <span className="text-gray-500">Merkle Root:</span>
                    <span className="text-gray-300 ml-2">
                      {selectedToken.thirdweb.merkleRoot ? '設定済み' : 'なし'}
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

                {/* 価格設定 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    カスタム価格（Thirdwebで価格が設定されていない場合に使用）
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.001"
                      value={selectedToken.local.customPrice || ''}
                      onChange={(e) => {
                        const newToken = { ...selectedToken };
                        newToken.local.customPrice = e.target.value;
                        setSelectedToken(newToken);
                      }}
                      placeholder="例: 1"
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded"
                    />
                    <span className="text-gray-400">
                      {selectedToken.thirdweb.currency || 'POL'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Thirdwebのクレーム条件で価格が設定されていない場合、この価格が使用されます
                  </p>
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
                    
                    <div>
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
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        現在のアローリストをダウンロード
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

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        1ウォレットあたりの最大ミント数
                      </label>
                      <input
                        type="number"
                        value={selectedToken.local.maxPerWallet || 10}
                        onChange={(e) => {
                          const newToken = { ...selectedToken };
                          const inputValue = parseInt(e.target.value);
                          
                          // 入力値の検証
                          if (isNaN(inputValue) || inputValue < 0) {
                            return;
                          }
                          
                          // ClaimConditionからの制限を取得
                          const claimConditionLimit = selectedToken.thirdweb.maxPerWallet;
                          const maxAllowed = claimConditionLimit || 100; // ClaimConditionが未設定の場合は100
                          
                          // 0からmaxAllowedまでの範囲で制限
                          let finalValue = inputValue;
                          if (inputValue > maxAllowed) {
                            finalValue = maxAllowed;
                            // 警告メッセージを表示
                            const warningMessage = claimConditionLimit
                              ? `⚠️ ClaimConditionの制限（${claimConditionLimit}枚）を超えています。${claimConditionLimit}枚に調整されました。`
                              : `⚠️ ClaimConditionが未設定のため、最大100枚までです。100枚に調整されました。`;
                            
                            // 警告を表示（一時的なトースト通知）
                            const toast = document.createElement('div');
                            toast.className = 'fixed top-20 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-500';
                            toast.textContent = warningMessage;
                            document.body.appendChild(toast);
                            setTimeout(() => {
                              toast.style.opacity = '0';
                              setTimeout(() => toast.remove(), 500);
                            }, 3000);
                          }
                          
                          newToken.local.maxPerWallet = finalValue;
                          setSelectedToken(newToken);
                        }}
                        className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                        min="0"
                        max={selectedToken.thirdweb.maxPerWallet || 100}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        1つのウォレットがミントできる最大数
                        {selectedToken.thirdweb.maxPerWallet ? (
                          <span className="block text-yellow-400 mt-1">
                            ※ ClaimConditionの制限: 0〜{selectedToken.thirdweb.maxPerWallet}枚まで設定可
                          </span>
                        ) : (
                          <span className="block text-gray-400 mt-1">
                            ※ ClaimCondition未設定: 0〜100枚まで設定可
                          </span>
                        )}
                        {selectedToken.local.maxPerWallet === 0 && (
                          <span className="block text-red-400 mt-1">
                            ⚠️ 0に設定するとミントできなくなります
                          </span>
                        )}
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
    </div>
  );
}