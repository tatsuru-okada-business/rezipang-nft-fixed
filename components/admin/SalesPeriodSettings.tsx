"use client";

import { useState, useEffect } from 'react';

interface SalesPeriodSettingsProps {
  tokenId: number;
  salesPeriodEnabled: boolean;
  salesStartDate?: string;
  salesEndDate?: string;
  isUnlimited: boolean;
  onUpdate: (settings: {
    salesPeriodEnabled: boolean;
    salesStartDate?: string;
    salesEndDate?: string;
    isUnlimited: boolean;
  }) => void;
}

export function SalesPeriodSettings({
  tokenId,
  salesPeriodEnabled: initialEnabled,
  salesStartDate: initialStartDate,
  salesEndDate: initialEndDate,
  isUnlimited: initialUnlimited,
  onUpdate
}: SalesPeriodSettingsProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [unlimited, setUnlimited] = useState(initialUnlimited);
  const [timezone, setTimezone] = useState<'UTC' | 'JST'>('JST');
  const [includeTime, setIncludeTime] = useState(false);
  
  // Date and time states
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');
  
  useEffect(() => {
    // Initialize dates from props
    if (initialStartDate) {
      const date = new Date(initialStartDate);
      setStartDate(date.toISOString().split('T')[0]);
      const time = date.toTimeString().slice(0, 5);
      if (time !== '00:00') {
        setIncludeTime(true);
        setStartTime(time);
      }
    }
    
    if (initialEndDate) {
      const date = new Date(initialEndDate);
      setEndDate(date.toISOString().split('T')[0]);
      const time = date.toTimeString().slice(0, 5);
      if (time !== '23:59') {
        setIncludeTime(true);
        setEndTime(time);
      }
    }
  }, [initialStartDate, initialEndDate]);
  
  const handleSave = () => {
    if (!enabled) {
      onUpdate({
        salesPeriodEnabled: false,
        isUnlimited: false
      });
      return;
    }
    
    if (unlimited) {
      onUpdate({
        salesPeriodEnabled: true,
        isUnlimited: true
      });
      return;
    }
    
    // Construct datetime strings
    let startDateTime = '';
    let endDateTime = '';
    
    if (startDate) {
      if (includeTime) {
        startDateTime = `${startDate}T${startTime}:00`;
      } else {
        startDateTime = `${startDate}T00:00:00`;
      }
      
      // Convert to UTC if needed
      if (timezone === 'JST') {
        const jstDate = new Date(startDateTime + '+09:00');
        startDateTime = jstDate.toISOString();
      } else {
        startDateTime = new Date(startDateTime + 'Z').toISOString();
      }
    }
    
    if (endDate) {
      if (includeTime) {
        endDateTime = `${endDate}T${endTime}:00`;
      } else {
        endDateTime = `${endDate}T23:59:59`;
      }
      
      // Convert to UTC if needed
      if (timezone === 'JST') {
        const jstDate = new Date(endDateTime + '+09:00');
        endDateTime = jstDate.toISOString();
      } else {
        endDateTime = new Date(endDateTime + 'Z').toISOString();
      }
    }
    
    onUpdate({
      salesPeriodEnabled: true,
      salesStartDate: startDateTime,
      salesEndDate: endDateTime,
      isUnlimited: false
    });
  };
  
  const formatPreview = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '未設定';
    
    const datetime = includeTime 
      ? `${dateStr} ${timeStr}`
      : dateStr;
    
    return `${datetime} ${timezone}`;
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold">販売期間設定</h3>
      
      {/* Enable/Disable */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={`sales-period-${tokenId}`}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        <label htmlFor={`sales-period-${tokenId}`} className="text-gray-300">
          販売期間を設定する
        </label>
      </div>
      
      {enabled && (
        <>
          {/* Unlimited Sale */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`unlimited-${tokenId}`}
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="rounded"
            />
            <label htmlFor={`unlimited-${tokenId}`} className="text-gray-300">
              無期限販売
            </label>
          </div>
          
          {!unlimited && (
            <>
              {/* Timezone Selection */}
              <div className="flex items-center space-x-4">
                <span className="text-gray-300">タイムゾーン:</span>
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    value="JST"
                    checked={timezone === 'JST'}
                    onChange={() => setTimezone('JST')}
                  />
                  <span className="text-gray-300">日本時間 (JST)</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    value="UTC"
                    checked={timezone === 'UTC'}
                    onChange={() => setTimezone('UTC')}
                  />
                  <span className="text-gray-300">UTC</span>
                </label>
              </div>
              
              {/* Include Time Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`include-time-${tokenId}`}
                  checked={includeTime}
                  onChange={(e) => setIncludeTime(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor={`include-time-${tokenId}`} className="text-gray-300">
                  時刻も指定する
                </label>
              </div>
              
              {/* Start Date/Time */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm">開始日時</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-gray-700 text-white rounded px-3 py-1"
                  />
                  {includeTime && (
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-gray-700 text-white rounded px-3 py-1"
                    />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  プレビュー: {formatPreview(startDate, startTime)}
                </div>
              </div>
              
              {/* End Date/Time */}
              <div className="space-y-2">
                <label className="text-gray-300 text-sm">終了日時</label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-gray-700 text-white rounded px-3 py-1"
                  />
                  {includeTime && (
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-gray-700 text-white rounded px-3 py-1"
                    />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  プレビュー: {formatPreview(endDate, endTime)}
                </div>
              </div>
            </>
          )}
          
          {/* Save Button */}
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            設定を保存
          </button>
        </>
      )}
    </div>
  );
}