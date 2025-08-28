// 管理画面用の型定義

// Thirdwebから取得する情報（読み取り専用）
export interface ThirdwebTokenInfo {
  tokenId: number;
  name: string;
  symbol?: string;
  totalSupply: bigint;
  uri?: string;
  image?: string; // NFT画像URL
  description?: string; // NFT説明文
  currentPrice?: string;
  price?: string; // 価格
  currency?: string; // 通貨アドレス
  currencySymbol?: string; // 通貨シンボル（POL, USDC等）
  currencyDecimals?: number; // 通貨の小数点桁数
  currencyIsNative?: boolean; // ネイティブトークンかどうか
  maxPerWallet?: number;
  merkleRoot?: string;
  claimConditionActive: boolean;
}

// ローカルで管理する補助情報（編集可能）
export interface LocalTokenSettings {
  tokenId: number;
  displayEnabled: boolean;      // サイトに表示するか
  displayOrder: number;         // 表示順序
  customDescription?: string;   // カスタム説明文
  salesNote?: string;          // 販売メモ（内部用）
  stockAlertThreshold?: number; // 在庫アラート閾値
  salesPeriodEnabled: boolean;  // 販売期間設定の有効/無効
  salesStartDate?: Date;        // 販売開始日時
  salesEndDate?: Date;          // 販売終了日時
  isUnlimited: boolean;         // 無期限販売フラグ
  totalMinted: number;         // 累計ミント数（追跡用）
  lastSyncTime: Date;          // 最終同期時刻
  maxSupply?: number;          // 最大発行数
  reservedSupply?: number;     // 運営予約分
  soldOutMessage?: string;     // 売り切れ時のメッセージ
  maxPerWallet?: number;       // 1ウォレットあたりの最大ミント数
}

// 統合されたトークン情報
export interface ManagedToken {
  thirdweb: ThirdwebTokenInfo;  // Thirdwebからの情報
  local: LocalTokenSettings;    // ローカル設定
}

// 管理設定全体
export interface AdminConfiguration {
  contractAddress: string;
  lastSync: Date;
  tokens: ManagedToken[];
}