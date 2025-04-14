# PYUSD xRay: Deep Transaction Forensics and Payments Dashboard

## Overview

Check it out at [pyusd.live](pyusd.live)

PYUSD xRay is a comprehensive fullstack Web3 dashboard that provides deep transaction forensics and payment capabilities for PayPal's stablecoin (PYUSD). Built for the PayPal x Google Cloud Web3 Hackathon, this application leverages Google Cloud's blockchain solutions to provide unprecedented visibility into PYUSD transactions, token metrics, and blockchain dynamics.

![PYUSD xRay Dashboard](https://example.com/placeholder-for-screenshot.png)

## Core Features

### 1. PyView: Real-time PYUSD Analytics Dashboard

- **Total Supply Tracking**: Real-time monitoring of PYUSD's circulating supply
- **Top Holders Analysis**: Identify and track the largest PYUSD token holders with percentage visualization
- **Active Wallet Metrics**: Monitor user adoption and wallet activity over time
- **Transaction Volume Analysis**: Track daily, weekly, and monthly transaction volumes
- **Recent Transaction Explorer**: View the latest PYUSD transfers with detailed transaction insights
- **Transaction Type Detection**: Automatically identify and categorize different transaction types (Transfer, Mint, Burn)

### 2. TracePay: Advanced Payment and Transaction Tracing

- **Deep Transaction Tracing**: Utilize blockchain debug methods for comprehensive transaction analysis
- **Gas-sponsored Payments**: Facilitate PYUSD payments via a relayer with gas sponsorship
- **Transaction Forensics**: Investigate token flows, contract interactions, and transaction histories

## Technical Architecture

### Backend Infrastructure

#### Google Cloud Integration

The application deeply integrates with several Google Cloud services:

1. **Google BigQuery**: Used to query the public `crypto_ethereum` datasets for:

   - Token transfer events across the Ethereum blockchain
   - Historical transaction analysis
   - Top token holder identification
   - Token supply calculation
   - Wallet activity metrics

2. **Google Cloud Blockchain Nodes**: Direct integration with Google-hosted Ethereum nodes through their JSON-RPC endpoints for:
   - Real-time transaction verification
   - Block data retrieval
   - Contract state queries
   - Token balance checking

#### Data Processing Pipeline

1. **Multi-tier Data Acquisition**:

   - Primary data source: BigQuery for efficient indexing of historical transactions
   - Secondary validation: On-chain verification through GCP blockchain endpoints
   - Tertiary enrichment: Direct contract calls for additional metadata

2. **Intelligent Caching System**:

   - Database-backed caching layer with custom expiration policies
   - Tiered caching strategies based on data volatility
   - Manual cache invalidation for time-sensitive operations

3. **Data Transformation**:
   - ERC-20 hexadecimal data parsing for accurate token amounts
   - Token decimal normalization (PYUSD uses 6 decimals unlike the standard 18)
   - Address normalization and validation

### Frontend Components

1. **Dynamic Dashboard Interface**:

   - Responsive design with Tailwind CSS and shadcn/ui components
   - Real-time data visualization with recharts
   - Automatic network detection and switching

2. **Network Awareness**:
   - Support for multiple Ethereum networks (Mainnet and Sepolia)
   - Network-specific Etherscan linking
   - Conditional rendering based on network capabilities

## How The Application Works

### BigQuery Integration

The application leverages Google BigQuery's public crypto datasets to efficiently query blockchain data:

```sql
-- Example: Query for recent PYUSD transactions
SELECT
  transaction_hash,
  block_number,
  LOWER(SUBSTR(topics[1], 27)) AS from_address,
  LOWER(SUBSTR(topics[2], 27)) AS to_address,
  data AS raw_amount,
  block_timestamp,
  CASE
    WHEN LOWER(SUBSTR(topics[1], 27)) = '0000000000000000000000000000000000000000' THEN 'Mint'
    WHEN LOWER(SUBSTR(topics[2], 27)) = '0000000000000000000000000000000000000000' THEN 'Burn'
    ELSE 'Transfer'
  END AS tx_type
FROM `bigquery-public-data.crypto_ethereum.logs`
WHERE address = '0x6c3ea9036406852006290770bedfcaba0e23a0e8' -- PYUSD contract
  AND topics[0] = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' -- Transfer event signature
ORDER BY block_timestamp DESC
```

ERC-20 token values in BigQuery are stored as raw hexadecimal data fields. Our application uses JavaScript to accurately parse these values:

```javascript
// Parse ERC-20 token amount from raw data
const rawHex = tx.raw_amount.startsWith("0x")
  ? tx.raw_amount
  : "0x" + tx.raw_amount
const amountBigInt = BigInt(rawHex)
const amountValue = Number(amountBigInt) / 1_000_000 // PYUSD uses 6 decimals
```

### Data Verification Process

To ensure data accuracy, we implement a multi-stage verification process:

1. **Query BigQuery** for candidate transactions and metrics
2. **Verify on-chain** using Google Cloud's blockchain endpoints
3. **Enrich with metadata** from direct contract calls
4. **Cache results** with appropriate expiration policies

This approach ensures:

- Fast response times for dashboard components
- Data accuracy and integrity
- Computational efficiency by avoiding redundant blockchain calls

### Caching Strategy

Our sophisticated caching system optimizes performance and reduces API costs:

```typescript
// Example of tiered caching based on data volatility
async storeTopHolders(holders: any[], network: NetworkType = 'mainnet') {
  // Cache for 1 hour (3600000 ms) since getting top holders uses expensive RPC calls
  return cacheService.set(CACHE_KEYS.TOP_HOLDERS, holders, network, 3600000);
}

async storeRecentTransactions(transactions: any[], network: NetworkType = 'mainnet') {
  // Cache for 15 minutes (900000 ms) - shorter since tx data changes more frequently
  return cacheService.set(CACHE_KEYS.RECENT_TRANSACTIONS, transactions, network, 900000);
}
```

## Setting Up the Application

### Prerequisites

- Node.js 16+
- PostgreSQL database
- Google Cloud service account with BigQuery access
- Ethereum RPC endpoints (Google Cloud or other providers)

### Environment Variables

The application requires the following environment variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/pyusd_xray
GCP_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project","private_key":"..."}
NETWORK_TYPE=mainnet  # or sepolia for testnet
```

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/pyusd-xray.git
   cd pyusd-xray
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up the database:

   ```
   npm run db:push
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## Using the Application

### Dashboard Navigation

The application provides two main views:

1. **PyView**: The main analytics dashboard for PYUSD statistics

   - Access statistics on total supply, active wallets, and transaction volume
   - Explore transaction history with automatic type detection
   - View top token holders with percentage breakdowns

2. **TracePay**: Transaction tracing and payment functionality
   - Trace specific transactions with detailed forensics
   - Initialize gas-sponsored payments
   - Analyze token flows and interactions

### Data Refresh

- All dashboard panels include a refresh button to fetch the latest data
- Cache invalidation can be triggered through the UI or API endpoint
- The application automatically refetches data on network changes

## Technical Challenges & Solutions

### Hexadecimal Data Parsing

Challenge: BigQuery stores ERC-20 token amounts as hexadecimal strings, which require proper parsing.

Solution: Implemented multiple parsing strategies in JavaScript to handle different BigQuery data formats:

```javascript
// Parse hex data carefully with proper error handling
try {
  const rawHex = tx.raw_amount.startsWith("0x")
    ? tx.raw_amount
    : "0x" + tx.raw_amount
  const amountBigInt = BigInt(rawHex)
  amountValue = Number(amountBigInt) / 1_000_000
} catch (hexError) {
  console.error(`Error parsing hex amount: ${tx.raw_amount}`, hexError)
}
```

### Network-aware Interface

Challenge: Supporting both Ethereum mainnet and Sepolia testnet with seamless transitions.

Solution: Implemented a network context provider that adjusts all blockchain interactions based on the current network:

```typescript
// Dynamically determine contract addresses and RPC endpoints
const pyusdAddress =
  networkType === "mainnet"
    ? "0x6c3ea9036406852006290770bedfcaba0e23a0e8"
    : "0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05"
```

### Efficient Blockchain Data Access

Challenge: Direct blockchain queries can be slow and expensive for large data sets.

Solution: Implemented a multi-tier strategy that leverages BigQuery for historical data and performs targeted on-chain verification:

```typescript
// First query BigQuery for transaction candidates
const [rows] = await client.query({ query })

// Then verify each transaction on-chain
for (const tx of rows) {
  const txReceipt = await provider.getTransactionReceipt(tx.transaction_hash)
  if (txReceipt) {
    // Transaction verified - process and include in results
  }
}
```

## API Reference

The application exposes several API endpoints:

### Dashboard Endpoints

- `GET /api/dashboard/stats`: Get overall PYUSD statistics
- `GET /api/dashboard/holders`: Get top PYUSD holders
- `GET /api/dashboard/transactions`: Get recent PYUSD transactions
- `GET /api/dashboard/activity`: Get PYUSD activity charts
- `GET /api/dashboard/clear-cache`: Clear the dashboard cache

### Network Endpoints

- `GET /api/network`: Get current network information
- `POST /api/network`: Change the current network

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Cloud Platform for blockchain infrastructure
- BigQuery public crypto datasets
- PayPal for the PYUSD stablecoin
- The Ethereum community for standards and tooling
