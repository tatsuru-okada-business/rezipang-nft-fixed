// 価格フォーマット用のヘルパー関数

export function formatPrice(price: string | number, currency: string): string {
  if (!price || price === '0') return '0';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // USDC（6桁小数）の場合の特別処理
  if (currency === 'USDC') {
    // 1以上の値は小数点以下2桁まで表示
    if (numPrice >= 1) {
      return numPrice.toFixed(2).replace(/\.00$/, '');
    }
    
    // 0.01以上1未満の値は小数点以下2桁まで表示
    if (numPrice >= 0.01) {
      return numPrice.toFixed(2);
    }
    
    // 0.0001以上0.01未満の値は4桁まで表示
    if (numPrice >= 0.0001) {
      return numPrice.toFixed(4).replace(/\.?0+$/, '');
    }
    
    // それ以下の小さい値は6桁まで表示
    if (numPrice > 0) {
      return numPrice.toFixed(6).replace(/\.?0+$/, '');
    }
    
    return '0';
  }
  
  // ZENY（整数）の場合
  if (currency === 'ZENY') {
    // 巨大な数値（Wei単位）の場合は変換
    if (numPrice > 1e15) {
      return Math.floor(numPrice / 1e18).toString();
    }
    return Math.floor(numPrice).toString();
  }
  
  // POL/ETH（18桁小数）の場合
  if (currency === 'POL' || currency === 'ETH') {
    // 1未満の値は小数点以下4桁まで表示
    if (numPrice < 1) {
      return numPrice.toFixed(4).replace(/\.?0+$/, '');
    }
    // 1以上の値は小数点以下2桁まで表示
    return numPrice.toFixed(2).replace(/\.00$/, '');
  }
  
  // デフォルト
  return numPrice.toString();
}

// 販売期間のチェック
export function isInSalesPeriod(token: {
  salesPeriodEnabled?: boolean;
  salesStartDate?: Date | string;
  salesEndDate?: Date | string;
  isUnlimited?: boolean;
}): boolean {
  // 販売期間が設定されていない場合は常に販売中
  if (!token.salesPeriodEnabled) return true;
  
  // 無期限販売の場合は常に販売中
  if (token.isUnlimited) return true;
  
  // 販売期間が有効だが日付が未設定の場合は販売不可
  if (!token.salesStartDate && !token.salesEndDate) {
    return false; // 期間設定が有効なのに日付がない = まだ販売開始前
  }
  
  const now = new Date();
  
  // 開始日時のチェック
  if (token.salesStartDate) {
    const startDate = typeof token.salesStartDate === 'string' 
      ? new Date(token.salesStartDate) 
      : token.salesStartDate;
    if (now < startDate) return false;
  }
  
  // 終了日時のチェック
  if (token.salesEndDate) {
    const endDate = typeof token.salesEndDate === 'string'
      ? new Date(token.salesEndDate)
      : token.salesEndDate;
    if (now > endDate) return false;
  }
  
  return true;
}