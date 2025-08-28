export interface LocalTokenSettings {
  displayEnabled: boolean;
  displayOrder: number;
  isDefaultDisplay?: boolean;
  salesPeriodEnabled?: boolean;
  salesStartDate?: string;
  salesEndDate?: string;
  isUnlimited?: boolean;
  customDescription?: string;
  customName?: string;
  customPrice?: string;  // カスタム価格設定
  totalMinted?: number;
  maxSupply?: number;
  reservedSupply?: number;
  soldOutMessage?: string;
  salesNote?: string;
  maxPerWallet?: number;  // 1ウォレットあたりの最大ミント数
}

export interface LocalSettings {
  defaultTokenId: number;
  tokens: {
    [key: string]: LocalTokenSettings;
  };
  lastUpdated: string;
}

// Merged configuration type
export interface MergedTokenConfig {
  tokenId: number;
  // From Thirdweb
  name: string;
  totalSupply: string;
  uri: string;
  image: string;
  description: string;
  currentPrice: string;
  currency: string;
  merkleRoot?: string;
  claimConditionActive: boolean;
  // From Local Settings
  displayEnabled: boolean;
  displayOrder: number;
  isDefaultDisplay?: boolean;
  salesPeriodEnabled?: boolean;
  salesStartDate?: string;
  salesEndDate?: string;
  isUnlimited?: boolean;
  customDescription?: string;
  customName?: string;
  totalMinted?: number;
  maxSupply?: number;
  reservedSupply?: number;
  soldOutMessage?: string;
  maxPerWallet?: number;
}