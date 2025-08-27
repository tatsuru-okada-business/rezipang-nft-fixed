'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>({});
  
  useEffect(() => {
    async function runTests() {
      const results: any = {};
      
      // Test 1: Token 1 (3-day period) - should be YELLOW
      const token1 = await fetch('/api/tokens?tokenId=1').then(r => r.json());
      results.token1 = {
        data: token1.tokens[0],
        expectedColor: 'yellow (3-day period)',
        salesPeriod: {
          start: token1.tokens[0]?.salesStartDate,
          end: token1.tokens[0]?.salesEndDate,
          enabled: token1.tokens[0]?.salesPeriodEnabled
        }
      };
      
      // Test 2: Token 2 (7+ day period) - should be GREEN
      const token2 = await fetch('/api/tokens?tokenId=2').then(r => r.json());
      results.token2 = {
        data: token2.tokens[0],
        expectedColor: 'green (7+ day period)',
        salesPeriod: {
          start: token2.tokens[0]?.salesStartDate,
          end: token2.tokens[0]?.salesEndDate,
          enabled: token2.tokens[0]?.salesPeriodEnabled
        }
      };
      
      // Test 3: Token 4 - check sales period
      const token4 = await fetch('/api/tokens?tokenId=4').then(r => r.json());
      results.token4 = {
        data: token4.tokens[0],
        expectedColor: 'depends on current date',
        salesPeriod: {
          start: token4.tokens[0]?.salesStartDate,
          end: token4.tokens[0]?.salesEndDate,
          enabled: token4.tokens[0]?.salesPeriodEnabled
        }
      };
      
      setTestResults(results);
    }
    
    runTests();
  }, []);
  
  const calculateDaysRemaining = (endDate: string) => {
    if (!endDate) return 'N/A';
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days;
  };
  
  const getExpectedColor = (days: number) => {
    if (days >= 7) return '🟢 GREEN';
    if (days >= 3) return '🟡 YELLOW';
    if (days >= 0) return '🔴 RED';
    return '⚫ ENDED';
  };
  
  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">販売期間機能テスト</h1>
      
      <div className="space-y-6">
        {Object.entries(testResults).map(([key, value]: [string, any]) => {
          const days = calculateDaysRemaining(value.salesPeriod?.end);
          const expectedColor = typeof days === 'number' ? getExpectedColor(days) : 'N/A';
          
          return (
            <div key={key} className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">
                {value.data?.name || key} (Token ID: {value.data?.id})
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">販売期間有効:</p>
                  <p className="font-bold">{value.salesPeriod?.enabled ? '✅ 有効' : '❌ 無効'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400">残り日数:</p>
                  <p className="font-bold">{days} 日</p>
                </div>
                
                <div>
                  <p className="text-gray-400">開始日 (UTC):</p>
                  <p className="text-sm">{value.salesPeriod?.start || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400">終了日 (UTC):</p>
                  <p className="text-sm">{value.salesPeriod?.end || 'N/A'}</p>
                </div>
                
                <div>
                  <p className="text-gray-400">期待される色:</p>
                  <p className="font-bold text-lg">{expectedColor}</p>
                </div>
                
                <div>
                  <p className="text-gray-400">価格:</p>
                  <p className="font-bold">{value.data?.price} {value.data?.currency}</p>
                </div>
              </div>
              
              {value.salesPeriod?.enabled && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <p className="text-sm text-gray-300">
                    実際のミントページで確認: 
                    <a href={`/ja?tokenId=${value.data?.id}`} className="text-blue-400 underline ml-2">
                      Token {value.data?.id} を表示
                    </a>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 p-6 bg-blue-900 rounded-lg">
        <h3 className="text-lg font-bold mb-3">色分けルール</h3>
        <ul className="space-y-2">
          <li>🟢 GREEN: 残り7日以上</li>
          <li>🟡 YELLOW: 残り3〜6日</li>
          <li>🔴 RED: 残り3日未満</li>
          <li>⚫ GRAY: 販売終了</li>
        </ul>
      </div>
    </div>
  );
}