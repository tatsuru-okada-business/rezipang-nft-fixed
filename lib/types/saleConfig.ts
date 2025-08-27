export interface ClaimCondition {
  id: string;
  tokenId: number;
  startTime: Date;
  endTime?: Date;
  price: string;
  currency: 'POL' | 'ZENY' | 'USDC';
  currencyAddress?: string;
  maxSupply?: number;
  maxPerWallet?: number;
  allowlist?: string[];
}

export interface UserClaimInfo {
  address: string;
  isAllowlisted: boolean;
  maxMintAmount: number;
  currentPrice: string;
  currency: string;
  paymentTokenAddress?: string;
  availableSupply: number;
  userMinted: number;
  canMint: boolean;
  saleActive: boolean;
  saleStartTime?: Date;
  saleEndTime?: Date;
  reason?: string;
}

export interface SaleConfig {
  tokenId: number;
  name: string;
  description?: string;
  conditions: ClaimCondition[];
  totalSupply: number;
  currentSupply: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminConfig {
  adminAddresses: string[];
  saleConfigs: SaleConfig[];
}