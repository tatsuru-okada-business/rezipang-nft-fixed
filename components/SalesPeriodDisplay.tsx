"use client";

import { useState, useEffect } from 'react';

interface SalesPeriodDisplayProps {
  salesPeriodEnabled?: boolean;
  salesStartDate?: string;
  salesEndDate?: string;
  isUnlimited?: boolean;
  locale?: string;
  timezone?: 'UTC' | 'JST';
}

export function SalesPeriodDisplay({
  salesPeriodEnabled,
  salesStartDate,
  salesEndDate,
  isUnlimited,
  locale = 'ja',
  timezone = 'JST'
}: SalesPeriodDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 300000); // Update every 5 minutes (reduced frequency for performance)
    
    return () => clearInterval(timer);
  }, []);
  
  if (!salesPeriodEnabled) {
    return null;
  }
  
  const formatDateTime = (dateStr: string | undefined, showBothTimezones = true) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    
    // Format for primary timezone
    const primaryOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone === 'JST' ? 'Asia/Tokyo' : 'UTC',
      hour12: false
    };
    
    const primaryFormatted = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', primaryOptions).format(date);
    const primaryLabel = timezone === 'JST' ? 'JST' : 'UTC';
    
    if (!showBothTimezones) {
      return `${primaryFormatted} ${primaryLabel}`;
    }
    
    // Format for secondary timezone (show JST when primary is UTC)
    if (timezone === 'UTC') {
      const jstOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo',
        hour12: false
      };
      const jstFormatted = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', jstOptions).format(date);
      return `${primaryFormatted} UTC (${jstFormatted} JST)`;
    }
    
    return `${primaryFormatted} ${primaryLabel}`;
  };
  
  const isInSalesPeriod = () => {
    if (isUnlimited) return true;
    
    const now = currentTime.getTime();
    const start = salesStartDate ? new Date(salesStartDate).getTime() : 0;
    const end = salesEndDate ? new Date(salesEndDate).getTime() : Infinity;
    
    return now >= start && now <= end;
  };
  
  const getTimeRemaining = () => {
    if (isUnlimited) return null;
    
    const now = currentTime.getTime();
    const end = salesEndDate ? new Date(salesEndDate).getTime() : 0;
    
    if (end <= now) return null;
    
    const diff = end - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return locale === 'ja' 
        ? `残り ${days}日 ${hours}時間`
        : `${days} days ${hours} hours remaining`;
    } else if (hours > 0) {
      return locale === 'ja'
        ? `残り ${hours}時間 ${minutes}分`
        : `${hours} hours ${minutes} minutes remaining`;
    } else {
      return locale === 'ja'
        ? `残り ${minutes}分`
        : `${minutes} minutes remaining`;
    }
  };
  
  const inPeriod = isInSalesPeriod();
  const timeRemaining = getTimeRemaining();
  
  return (
    <div className={`rounded-lg p-3 text-sm ${inPeriod ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${inPeriod ? 'text-green-700' : 'text-gray-600'}`}>
          {locale === 'ja' ? '販売期間' : 'Sales Period'}
        </span>
        {inPeriod ? (
          <span className="text-green-600 font-bold text-xs">
            {locale === 'ja' ? '販売中' : 'ON SALE'}
          </span>
        ) : (
          <span className="text-gray-500 font-bold text-xs">
            {locale === 'ja' ? '販売終了' : 'ENDED'}
          </span>
        )}
      </div>
      
      {isUnlimited ? (
        <div className="text-gray-600">
          {locale === 'ja' ? '無期限販売' : 'Unlimited Sale'}
        </div>
      ) : (
        <div className="space-y-1">
          {salesStartDate && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">
                {locale === 'ja' ? '開始: ' : 'Start: '}
              </span>
              {formatDateTime(salesStartDate)}
            </div>
          )}
          {salesEndDate && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">
                {locale === 'ja' ? '終了: ' : 'End: '}
              </span>
              {formatDateTime(salesEndDate)}
            </div>
          )}
          {timeRemaining && inPeriod && (
            <div className="text-xs font-semibold text-orange-600 mt-2">
              ⏰ {timeRemaining}
            </div>
          )}
        </div>
      )}
    </div>
  );
}