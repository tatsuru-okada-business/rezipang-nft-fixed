'use client';

import { useEffect, useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import type { UserClaimInfo } from '@/lib/types/saleConfig';

interface UserClaimInfoProps {
  tokenId: number;
  locale: string;
  defaultCollapsed?: boolean;
}

export default function UserClaimInfoDisplay({ tokenId, locale, defaultCollapsed = true }: UserClaimInfoProps) {
  const account = useActiveAccount();
  const [claimInfo, setClaimInfo] = useState<UserClaimInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    if (account?.address) {
      fetchUserClaimInfo();
    }
  }, [account?.address, tokenId]);

  const fetchUserClaimInfo = async () => {
    if (!account?.address) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/user-claim-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: account.address,
          tokenId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setClaimInfo(data);
      }
    } catch (error) {
      console.error('Error fetching claim info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!account?.address) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!claimInfo) {
    return null;
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString(locale === 'ja' ? 'ja-JP' : 'en-US');
  };

  const labels = {
    ja: {
      yourStatus: 'あなたのステータス',
      allowlisted: 'アローリスト登録',
      yes: 'はい',
      no: 'いいえ',
      price: '価格',
      maxMint: '最大MINT可能数',
      alreadyMinted: 'MINT済み',
      available: '利用可能在庫',
      saleStatus: '販売ステータス',
      active: 'アクティブ',
      inactive: '非アクティブ',
      salePeriod: '販売期間',
      from: '開始',
      to: '終了',
      unlimited: '無制限',
      pieces: '個',
      reason: '理由',
    },
    en: {
      yourStatus: 'Your Status',
      allowlisted: 'Allowlisted',
      yes: 'Yes',
      no: 'No',
      price: 'Price',
      maxMint: 'Max Mint Amount',
      alreadyMinted: 'Already Minted',
      available: 'Available Supply',
      saleStatus: 'Sale Status',
      active: 'Active',
      inactive: 'Inactive',
      salePeriod: 'Sale Period',
      from: 'From',
      to: 'To',
      unlimited: 'Unlimited',
      pieces: 'pcs',
      reason: 'Reason',
    },
  };

  const t = labels[locale as keyof typeof labels] || labels.en;

  return (
    <div className="bg-white/80 rounded-lg border border-purple-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          {t.yourStatus}
        </span>
        <div className="flex items-center gap-2">
          {!claimInfo?.canMint && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
              {locale === 'ja' ? 'MINT不可' : 'Cannot Mint'}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {!isCollapsed && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.allowlisted}:</span>
              <span className={`font-semibold ${claimInfo.isAllowlisted ? 'text-green-600' : 'text-red-600'}`}>
                {claimInfo.isAllowlisted ? t.yes : t.no}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.price}:</span>
              <span className="text-gray-800 font-semibold">
                {claimInfo.currentPrice} {claimInfo.currency}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.maxMint}:</span>
              <span className="text-gray-800 font-semibold">
                {claimInfo.maxMintAmount} {t.pieces}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.alreadyMinted}:</span>
              <span className="text-gray-800">
                {claimInfo.userMinted} {t.pieces}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.available}:</span>
              <span className="text-gray-800">
                {claimInfo.availableSupply} {t.pieces}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.saleStatus}:</span>
              <span className={`font-semibold ${claimInfo.saleActive ? 'text-green-600' : 'text-yellow-600'}`}>
                {claimInfo.saleActive ? t.active : t.inactive}
              </span>
            </div>

            {(claimInfo.saleStartTime || claimInfo.saleEndTime) && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-gray-600 mb-1 text-sm">{t.salePeriod}:</p>
                <div className="pl-4 text-sm">
                  {claimInfo.saleStartTime && (
                    <p className="text-gray-700">
                      {t.from}: {formatDate(claimInfo.saleStartTime)}
                    </p>
                  )}
                  {claimInfo.saleEndTime ? (
                    <p className="text-gray-700">
                      {t.to}: {formatDate(claimInfo.saleEndTime)}
                    </p>
                  ) : (
                    <p className="text-gray-700">{t.to}: {t.unlimited}</p>
                  )}
                </div>
              </div>
            )}

            {claimInfo.reason && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-yellow-600 text-sm">
                  {t.reason}: {claimInfo.reason}
                </p>
              </div>
            )}

            {!claimInfo.canMint && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-red-600 text-sm text-center">
                  {locale === 'ja' ? '現在MINTできません' : 'Cannot mint at this time'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}