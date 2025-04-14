// Transaction trace types
export interface TraceElement {
  type: string;
  from?: string;
  to?: string;
  value?: string;
  gas?: string;
  gasUsed?: string;
  input?: string;
  output?: string;
  error?: string;
  returnValue?: string;
  signature?: string;
  name?: string;
  params?: any[];
  result?: any;
  children?: TraceElement[];
}

// Token transfer types
export interface TokenTransfer {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  from: string;
  to: string;
  value: string;
}

// Transaction result from API
export interface TransactionResult {
  hash: string;
  blockNumber: string;
  blockTimestamp?: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: number;
  isPYUSDTransfer: boolean;
  ethPrice?: number;
  tokenTransfers?: TokenTransfer[];
  trace?: TraceElement[];
  analysis?: string;
  timestamp?: number;
}

// Dashboard stats types
export interface PYUSDStats {
  totalSupply: string;
  totalHolders: number;
  transactionVolume24h: string;
  avgTransactionValue: string;
  changePercentages: {
    supply: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
    holders: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
    volume: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
    avgValue: {
      value: number;
      direction: 'up' | 'down' | 'neutral';
    };
  };
}

// Activity chart data
export interface ActivityData {
  daily: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
  weekly: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
  monthly: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
  all: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
}

// Holder data
export interface HolderData {
  address: string;
  balance: string;
  percentage: string;
}

// Distribution data
export interface DistributionData {
  byType: {
    exchanges: number;
    daos: number;
    individualWallets: number;
    other: number;
  };
  issuanceBurnRate: Array<{
    date: string;
    issuance: number;
    burns: number;
  }>;
}
