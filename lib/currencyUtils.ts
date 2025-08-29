import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CurrencyInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  isNative: boolean;
  chainId: number;
  description: string;
}

interface CurrencyConfig {
  currencies: CurrencyInfo[];
  defaultCurrency: string;
}

let currencyCache: CurrencyConfig | null = null;

// Load currency configuration
export function loadCurrencyConfig(): CurrencyConfig {
  if (currencyCache) return currencyCache;
  
  const configPath = join(process.cwd(), 'currency-config.json');
  if (!existsSync(configPath)) {
    return {
      currencies: [],
      defaultCurrency: 'POL'
    };
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    currencyCache = JSON.parse(content);
    return currencyCache!;
  } catch (error) {
    console.error('Error loading currency config:', error);
    return {
      currencies: [],
      defaultCurrency: 'POL'
    };
  }
}

// Get currency info by symbol
export function getCurrencyBySymbol(symbol: string): CurrencyInfo | null {
  const config = loadCurrencyConfig();
  return config.currencies.find(c => 
    c.symbol.toLowerCase() === symbol.toLowerCase()
  ) || null;
}

// Resolve currency address from symbol or address
export function resolveCurrencyAddress(currencyInput: string): string {
  // If it's already a valid address (starts with 0x and has 42 chars)
  if (currencyInput?.startsWith('0x') && currencyInput.length === 42) {
    return currencyInput;
  }
  
  // Native currency placeholder
  if (currencyInput === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    return currencyInput;
  }
  
  // Try to resolve from symbol
  const currencyInfo = getCurrencyBySymbol(currencyInput);
  if (currencyInfo) {
    // For native currencies, return the special placeholder
    if (currencyInfo.isNative) {
      return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    }
    return currencyInfo.address;
  }
  
  // Default to native currency if not found
  console.warn(`Currency ${currencyInput} not found in config, defaulting to native`);
  return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
}

// Get currency decimals
export function getCurrencyDecimals(currencyInput: string): number {
  const currencyInfo = getCurrencyBySymbol(currencyInput);
  return currencyInfo?.decimals || 18;
}

// Check if currency is native
export function isCurrencyNative(currencyInput: string): boolean {
  // Check special placeholders
  if (currencyInput === '0x0000000000000000000000000000000000000000' ||
      currencyInput === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    return true;
  }
  
  const currencyInfo = getCurrencyBySymbol(currencyInput);
  return currencyInfo?.isNative || false;
}

// Get currency symbol from address
export function getCurrencySymbol(currencyAddress: string): string {
  const config = loadCurrencyConfig();
  
  // Check if it's native currency
  if (currencyAddress === '0x0000000000000000000000000000000000000000' ||
      currencyAddress === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE') {
    return config.defaultCurrency || 'POL';
  }
  
  // Find by address
  const currency = config.currencies.find(c => 
    c.address.toLowerCase() === currencyAddress.toLowerCase()
  );
  
  return currency?.symbol || currencyAddress;
}