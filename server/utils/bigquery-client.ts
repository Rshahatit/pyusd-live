import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
let bigqueryClient: BigQuery | null = null;

/**
 * Gets or creates a BigQuery client
 * 
 * Note: For authentication, BigQuery on GCP can use:
 * 1. Application Default Credentials (preferred)
 * 2. JSON key file specified by GOOGLE_APPLICATION_CREDENTIALS env var
 * 3. A JSON key provided directly via credentials object
 */
export function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    // Check if we have a service account key in environment variables
    const serviceAccountKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
    
    console.log('[BigQuery] Initializing BigQuery client...');
    console.log('[BigQuery] Service account key present:', !!serviceAccountKey);
    
    if (serviceAccountKey) {
      try {
        // If service account key is provided as a JSON string
        console.log('[BigQuery] Attempting to parse service account key');
        const credentials = JSON.parse(serviceAccountKey);
        
        // Log credential details (without sensitive data)
        console.log('[BigQuery] Credential structure:', Object.keys(credentials).join(', '));
        if (credentials.client_email) {
          console.log('[BigQuery] Using service account:', credentials.client_email);
        }
        
        bigqueryClient = new BigQuery({ credentials });
        console.log('[BigQuery] Initialized client with provided service account key');
      } catch (error) {
        console.error('[BigQuery] Error parsing service account key:', error);
        console.error('[BigQuery] Error details:', error instanceof Error ? error.message : String(error));
        
        // Fall back to application default credentials
        console.log('[BigQuery] Creating client with application default credentials as fallback');
        bigqueryClient = new BigQuery();
        console.log('[BigQuery] Falling back to application default credentials');
      }
    } else {
      // Use application default credentials
      console.log('[BigQuery] No service account key provided, using default credentials');
      bigqueryClient = new BigQuery();
      console.log('[BigQuery] Using application default credentials');
    }
  }
  
  return bigqueryClient;
}

/**
 * Query to get PYUSD transfers from BigQuery public crypto datasets
 */
export async function getPYUSDTransfers(options: {
  limit?: number;
  startTime?: Date;
  endTime?: Date;
  minValue?: number;
} = {}) {
  const { 
    limit = 5, // Default to 5 most recent transactions
    startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
    endTime = new Date(),
    minValue = 0
  } = options;
  
  const client = getBigQueryClient();
  
  // PYUSD contract addresses
  // Mainnet address: 0x6c3ea9036406852006290770bedfcaba0e23a0e8
  // Sepolia testnet address: 0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05
  // Use the appropriate one based on network
  const pyusdAddress = process.env.NETWORK_TYPE === 'mainnet' 
    ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
    : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
  
  // Convert dates to ISO strings for the query
  const startTimeStr = startTime.toISOString();
  const endTimeStr = endTime.toISOString();
  
  // Get token decimals (PYUSD has 6 decimals)
  const decimals = 6;
  
  console.log(`[BigQuery] Querying PYUSD transfers from ${startTimeStr} to ${endTimeStr}`);
  
  try {
    // BigQuery SQL query that uses the public crypto_ethereum dataset
    // to find ERC20 Transfer events for the PYUSD token
    const query = `
      SELECT
        block_timestamp,
        block_number,
        transaction_hash,
        from_address,
        to_address,
        value,
        CAST(value AS NUMERIC) / POW(10, ${decimals}) AS amount
      FROM
        \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE
        token_address = '${pyusdAddress.toLowerCase()}'
        AND block_timestamp BETWEEN TIMESTAMP('${startTimeStr}') AND TIMESTAMP('${endTimeStr}')
        AND CAST(value AS NUMERIC) / POW(10, ${decimals}) >= ${minValue}
      ORDER BY
        block_timestamp DESC
      LIMIT
        ${limit}
    `;

    console.log(`[BigQuery] Executing query: ${query}`);
    
    // Run the query
    const [rows] = await client.query({
      query,
      location: 'US',  // Specify the BigQuery dataset location
    });
    
    console.log(`[BigQuery] Retrieved ${rows.length} PYUSD transfers`);
    return rows;
  } catch (error) {
    console.error('[BigQuery] Error executing query:', error);
    throw error;
  }
}

/**
 * Query to get PYUSD total supply from BigQuery
 */
export async function getPYUSDTotalSupply() {
  const client = getBigQueryClient();
  
  // PYUSD contract addresses
  const pyusdAddress = process.env.NETWORK_TYPE === 'mainnet' 
    ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
    : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
  
  try {
    // BigQuery SQL query to calculate total supply
    // This query estimates total supply by calculating:
    // (total minted - total burned)
    const query = `
      SELECT
        SUM(CASE 
          WHEN from_address = '0x0000000000000000000000000000000000000000' THEN CAST(value AS NUMERIC)
          WHEN to_address = '0x0000000000000000000000000000000000000000' THEN -CAST(value AS NUMERIC)
          ELSE 0
        END) AS total_supply
      FROM
        \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE
        token_address = '${pyusdAddress.toLowerCase()}'
        AND (
          from_address = '0x0000000000000000000000000000000000000000'
          OR to_address = '0x0000000000000000000000000000000000000000'
        )
    `;
    
    console.log(`[BigQuery] Executing total supply query`);
    
    // Run the query
    const [rows] = await client.query({
      query,
      location: 'US',
    });
    
    if (rows.length > 0 && rows[0].total_supply) {
      // Convert from raw amount to token amount
      const decimals = 6;  // PYUSD has 6 decimals
      const totalSupply = Number(rows[0].total_supply) / Math.pow(10, decimals);
      console.log(`[BigQuery] PYUSD total supply: ${totalSupply}`);
      return totalSupply;
    }
    
    console.log('[BigQuery] No total supply data found');
    return null;
  } catch (error) {
    console.error('[BigQuery] Error executing total supply query:', error);
    throw error;
  }
}

/**
 * Query to get active wallets data from BigQuery
 */
export async function getActiveWallets(daysAgo = 7) {
  console.log(`[BigQuery] Starting active wallets query for the last ${daysAgo} days`);
  
  try {
    const client = getBigQueryClient();
    console.log('[BigQuery] Got BigQuery client for active wallets query');
    
    // PYUSD contract addresses
    const networkType = process.env.NETWORK_TYPE || 'sepolia';
    const pyusdAddress = networkType === 'mainnet' 
      ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
      : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
    
    console.log(`[BigQuery] Active wallets query using network: ${networkType}, contract: ${pyusdAddress}`);
    
    // First, let's check if there are any transactions at all for this token
    // with a simpler query that's less likely to timeout or have issues
    const checkQuery = `
      SELECT COUNT(*) as tx_count
      FROM \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE token_address = '${pyusdAddress.toLowerCase()}'
      LIMIT 1
    `;
    
    console.log('[BigQuery] Executing check query first to verify token has transfers');
    console.log(`[BigQuery] Check query: ${checkQuery}`);
    
    try {
      const [checkRows] = await client.query({
        query: checkQuery,
        location: 'US',
        jobTimeoutMs: 10000 // 10 second timeout for the check query
      });
      
      console.log(`[BigQuery] Check query result: ${JSON.stringify(checkRows)}`);
      
      if (checkRows.length === 0 || checkRows[0].tx_count === 0) {
        console.log('[BigQuery] No transactions found for this token address in BigQuery');
        return 0;
      }
      
      console.log('[BigQuery] Token transactions found, proceeding with active wallets query');
    } catch (checkError) {
      console.error('[BigQuery] Error with check query:', checkError);
      console.log('[BigQuery] Will attempt main query anyway');
    }
    
    // Proceed with main query
    const query = `
      WITH active_addresses AS (
        SELECT
          from_address as address
        FROM
          \`bigquery-public-data.crypto_ethereum.token_transfers\`
        WHERE
          token_address = '${pyusdAddress.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL ${daysAgo} DAY))
          AND from_address != '0x0000000000000000000000000000000000000000'
        UNION DISTINCT
        SELECT
          to_address as address
        FROM
          \`bigquery-public-data.crypto_ethereum.token_transfers\`
        WHERE
          token_address = '${pyusdAddress.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL ${daysAgo} DAY))
          AND to_address != '0x0000000000000000000000000000000000000000'
      )
      
      SELECT
        COUNT(DISTINCT address) as active_wallet_count
      FROM
        active_addresses
    `;
    
    console.log(`[BigQuery] Executing active wallets query`);
    console.log(`[BigQuery] Active wallets query: ${query}`);
    
    // Run the query with a longer timeout
    try {
      const [rows] = await client.query({
        query,
        location: 'US',
        jobTimeoutMs: 30000 // 30 second timeout
      });
      
      console.log(`[BigQuery] Active wallets query returned ${rows.length} rows`);
      
      if (rows.length > 0) {
        console.log(`[BigQuery] Active wallets raw result: ${JSON.stringify(rows[0])}`);
        
        if (rows[0].active_wallet_count !== undefined && rows[0].active_wallet_count !== null) {
          const activeWalletCount = Number(rows[0].active_wallet_count);
          console.log(`[BigQuery] Found ${activeWalletCount} active PYUSD wallets in the last ${daysAgo} days`);
          return activeWalletCount;
        } else {
          console.log('[BigQuery] Active wallet count was null or undefined in result');
        }
      } else {
        console.log('[BigQuery] No rows returned from active wallets query');
      }
      
      console.log('[BigQuery] No active wallet data found');
      return 0;
    } catch (queryError) {
      console.error('[BigQuery] Error executing main active wallets query:', queryError);
      
      // Try a simplified query as fallback
      console.log('[BigQuery] Attempting simplified active wallets query as fallback');
      
      const fallbackQuery = `
        SELECT
          COUNT(DISTINCT from_address) as active_wallet_count
        FROM
          \`bigquery-public-data.crypto_ethereum.token_transfers\`
        WHERE
          token_address = '${pyusdAddress.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL ${daysAgo} DAY))
          AND from_address != '0x0000000000000000000000000000000000000000'
      `;
      
      try {
        console.log(`[BigQuery] Fallback query: ${fallbackQuery}`);
        const [fallbackRows] = await client.query({
          query: fallbackQuery,
          location: 'US',
          jobTimeoutMs: 15000 // 15 second timeout for fallback
        });
        
        if (fallbackRows.length > 0 && fallbackRows[0].active_wallet_count) {
          const count = Number(fallbackRows[0].active_wallet_count);
          console.log(`[BigQuery] Fallback query found ${count} active senders`);
          return count;
        }
      } catch (fallbackError) {
        console.error('[BigQuery] Fallback query also failed:', fallbackError);
      }
      
      console.log('[BigQuery] All active wallet queries failed, returning 0');
      return 0;
    }
  } catch (error) {
    console.error('[BigQuery] Critical error executing active wallets query:', error);
    console.log('[BigQuery] Active wallets query failed completely, returning 0');
    return 0;
  }
}

/**
 * Query to get PYUSD activity data
 */
export async function getActivityData() {
  const client = getBigQueryClient();
  
  // PYUSD contract addresses
  const pyusdAddress = process.env.NETWORK_TYPE === 'mainnet' 
    ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
    : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
  
  const decimals = 6;  // PYUSD has 6 decimals
  
  try {
    // Get daily activity for the last 30 days
    const dailyQuery = `
      SELECT
        DATE(block_timestamp) as date,
        COUNT(*) as count,
        SUM(CAST(value AS NUMERIC) / POW(10, ${decimals})) as volume
      FROM
        \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE
        token_address = '${pyusdAddress.toLowerCase()}'
        AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
      GROUP BY
        date
      ORDER BY
        date DESC
    `;
    
    console.log(`[BigQuery] Executing daily activity query`);
    
    // Run the daily query
    const [dailyRows] = await client.query({
      query: dailyQuery,
      location: 'US',
    });
    
    // Get weekly activity for the last 12 weeks
    const weeklyQuery = `
      SELECT
        EXTRACT(WEEK FROM block_timestamp) as week,
        EXTRACT(YEAR FROM block_timestamp) as year,
        COUNT(*) as count,
        SUM(CAST(value AS NUMERIC) / POW(10, ${decimals})) as volume
      FROM
        \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE
        token_address = '${pyusdAddress.toLowerCase()}'
        AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK))
      GROUP BY
        week, year
      ORDER BY
        year DESC, week DESC
    `;
    
    console.log(`[BigQuery] Executing weekly activity query`);
    
    // Run the weekly query
    const [weeklyRows] = await client.query({
      query: weeklyQuery,
      location: 'US',
    });
    
    // Get monthly activity for the last 12 months
    const monthlyQuery = `
      SELECT
        EXTRACT(MONTH FROM block_timestamp) as month,
        EXTRACT(YEAR FROM block_timestamp) as year,
        COUNT(*) as count,
        SUM(CAST(value AS NUMERIC) / POW(10, ${decimals})) as volume
      FROM
        \`bigquery-public-data.crypto_ethereum.token_transfers\`
      WHERE
        token_address = '${pyusdAddress.toLowerCase()}'
        AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH))
      GROUP BY
        month, year
      ORDER BY
        year DESC, month DESC
    `;
    
    console.log(`[BigQuery] Executing monthly activity query`);
    
    // Run the monthly query
    const [monthlyRows] = await client.query({
      query: monthlyQuery,
      location: 'US',
    });
    
    // Format the results for the frontend
    const formatDailyData = dailyRows.map(row => {
      // First, check if row.date is a string or a Date object
      const dateObj = row.date instanceof Date ? row.date : new Date(row.date.value || row.date);
      
      return {
        date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: Number(row.count),
        volume: Number(row.volume)
      };
    });
    
    const formatWeeklyData = weeklyRows.map(row => ({
      date: `W${row.week} ${row.year}`,
      count: Number(row.count),
      volume: Number(row.volume)
    }));
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const formatMonthlyData = monthlyRows.map(row => ({
      date: `${monthNames[row.month - 1]} ${row.year}`,
      count: Number(row.count),
      volume: Number(row.volume)
    }));
    
    return {
      daily: formatDailyData.slice(0, 7), // Last 7 days
      weekly: formatWeeklyData.slice(0, 4), // Last 4 weeks
      monthly: formatMonthlyData.slice(0, 12), // Last 12 months
      all: formatMonthlyData // All data
    };
  } catch (error) {
    console.error('[BigQuery] Error executing activity data queries:', error);
    throw error;
  }
}

/**
 * Query to get PYUSD top holders
 * This implementation uses BigQuery to find recent active addresses,
 * then queries their actual balances on-chain for accurate data.
 */
export async function getTopHolders(limit = 10) {
  const client = getBigQueryClient();
  
  // PYUSD contract addresses
  const pyusdAddress = process.env.NETWORK_TYPE === 'mainnet' 
    ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
    : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
  
  const decimals = 6;  // PYUSD has 6 decimals
  
  try {
    console.log(`[BigQuery] Fetching active PYUSD addresses for top holders analysis`);
    
    // First, query BigQuery to get a list of recent active addresses
    // This gives us a starting point of addresses to check on-chain
    const activeAddressesQuery = `
      WITH active_addresses AS (
        SELECT
          from_address as address
        FROM
          \`bigquery-public-data.crypto_ethereum.token_transfers\`
        WHERE
          token_address = '${pyusdAddress.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
          AND from_address != '0x0000000000000000000000000000000000000000'
        UNION DISTINCT
        SELECT
          to_address as address
        FROM
          \`bigquery-public-data.crypto_ethereum.token_transfers\`
        WHERE
          token_address = '${pyusdAddress.toLowerCase()}'
          AND block_timestamp >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
          AND to_address != '0x0000000000000000000000000000000000000000'
      )
      SELECT
        address
      FROM
        active_addresses
      LIMIT 200
    `;
    
    console.log(`[BigQuery] Executing active addresses query for holders`);
    
    // Run the query
    const [activeAddressesRows] = await client.query({
      query: activeAddressesQuery,
      location: 'US',
    });
    
    if (!activeAddressesRows || activeAddressesRows.length === 0) {
      console.log(`[BigQuery] No active addresses found for PYUSD in BigQuery`);
      return [];
    }
    
    console.log(`[BigQuery] Found ${activeAddressesRows.length} active addresses for balance checking`);
    
    // Extract the addresses
    const addresses = activeAddressesRows.map(row => row.address);
    
    // Now, use the provider to check the actual balances on-chain
    // This gives us the real current balances, not just historical data
    const { ethers } = await import('ethers');
    const { getNetworkConfig } = await import('../utils/network-config');
    
    const networkConfig = getNetworkConfig(process.env.NETWORK_TYPE as any);
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    // Define ERC20 ABI for balanceOf function
    const ERC20_ABI = [
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)"
    ];
    
    // Create contract instance
    const contract = new ethers.Contract(pyusdAddress, ERC20_ABI, provider);
    
    // Get total supply for percentage calculation
    let totalSupplyBigInt;
    try {
      totalSupplyBigInt = await contract.totalSupply();
      console.log(`[BigQuery] Retrieved PYUSD total supply for percentage calculation: ${totalSupplyBigInt.toString()}`);
    } catch (error) {
      console.error(`[BigQuery] Error getting total supply:`, error);
      totalSupplyBigInt = BigInt(0);
    }
    
    // Batch the balance checks to avoid rate limits
    // Process in batches of 20 addresses
    const batchSize = 20;
    const batches = Math.ceil(addresses.length / batchSize);
    const balances: {address: string, balance: bigint}[] = [];
    
    console.log(`[BigQuery] Checking actual on-chain balances for ${addresses.length} addresses in ${batches} batches`);
    
    for (let i = 0; i < batches; i++) {
      const batchAddresses = addresses.slice(i * batchSize, (i + 1) * batchSize);
      console.log(`[BigQuery] Processing batch ${i + 1}/${batches} with ${batchAddresses.length} addresses`);
      
      // Process each address in the batch
      const batchPromises = batchAddresses.map(async (address) => {
        try {
          const balance = await contract.balanceOf(address);
          return { address, balance };
        } catch (error) {
          console.error(`[BigQuery] Error getting balance for ${address}:`, error);
          return { address, balance: BigInt(0) };
        }
      });
      
      // Wait for all the balance checks in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      balances.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limits
      if (i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Filter out zero balances and sort by balance (descending)
    const sortedBalances = balances
      .filter(item => item.balance > BigInt(0))
      .sort((a, b) => {
        if (b.balance > a.balance) return 1;
        if (b.balance < a.balance) return -1;
        return 0;
      })
      .slice(0, limit);
    
    console.log(`[BigQuery] Found ${sortedBalances.length} non-zero balances after on-chain check`);
    
    // Format the balances for display
    const formattedHolders = sortedBalances.map((item, index) => {
      const balanceNum = Number(ethers.formatUnits(item.balance, decimals));
      let formattedBalance;
      
      // Calculate percentage of total supply
      const percentage = totalSupplyBigInt > BigInt(0)
        ? Number(item.balance * BigInt(10000) / totalSupplyBigInt) / 100
        : 0;
      
      // Format the balance for display
      if (balanceNum >= 1_000_000) {
        formattedBalance = (balanceNum / 1_000_000).toFixed(1) + "M PYUSD";
      } else if (balanceNum >= 1_000) {
        formattedBalance = (balanceNum / 1_000).toFixed(1) + "K PYUSD";
      } else {
        formattedBalance = balanceNum.toFixed(0) + " PYUSD";
      }
      
      return {
        rank: index + 1,
        address: item.address,
        balance: formattedBalance,
        percentage: percentage.toFixed(2) + "%"
      };
    });
    
    return formattedHolders;
  } catch (error) {
    console.error('[BigQuery] Error executing top holders query:', error);
    throw error;
  }
}

/**
 * Get recent PYUSD transactions with on-chain verification
 * 
 * This function uses a mixed approach:
 * 1. Query BigQuery for recent transfer events to get a candidate list
 * 2. Use ethers.js to verify the transactions on-chain
 * 3. Returns formatted transaction data
 */
export async function getRecentTransactions(limit = 5) {
  const client = getBigQueryClient();
  
  // PYUSD contract addresses
  const networkType = process.env.NETWORK_TYPE || 'mainnet';
  const pyusdAddress = networkType === 'mainnet' 
    ? '0x6c3ea9036406852006290770bedfcaba0e23a0e8'
    : '0xFd57b4ddBf88a4e07fF4e34C487b99af2Fe82a05';
  
  console.log(`[BigQuery] Fetching recent PYUSD transactions for accurate on-chain data verification`);
  
  try {
    // Transfer event signature for logs table
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    
    // Get candidates from BigQuery to speed things up
    const query = `
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
      FROM \`bigquery-public-data.crypto_ethereum.logs\`
      WHERE address = '${pyusdAddress.toLowerCase()}'
        AND topics[0] = '${transferEventSignature}'
      ORDER BY block_timestamp DESC
      LIMIT ${limit * 2}  -- Get more than we need to account for potential filtering
    `;
    
    console.log('[BigQuery] Executing recent transactions query');
    
    const [rows] = await client.query({
      query,
      location: 'US',
    });
    
    if (!rows || rows.length === 0) {
      console.log('[BigQuery] No recent transactions found in BigQuery');
      return [];
    }
    
    console.log(`[BigQuery] Found ${rows.length} transaction candidates for verification`);
    
    // Import required ethers functions
    const { getProvider } = await import('../utils/ethers-helpers');
    
    // Get a provider for the current network
    const provider = getProvider(networkType as any);
    
    // Transactions to return
    const transactions = [];
    
    // Verify each transaction on-chain
    for (const tx of rows) {
      try {
        // Add proper 0x prefix to addresses
        const from = '0x' + tx.from_address;
        const to = '0x' + tx.to_address;
        
        // Use the transaction type from the query
        const type = tx.tx_type;
        
        // Format timestamp
        const timestamp = new Date(tx.block_timestamp);
        
        // Parse the raw amount from hex (data field)
        // ERC20 value is a uint256 without '0x' prefix in BigQuery
        let amountValue = 0;
        try {
          // Make sure the value has a 0x prefix for BigInt conversion
          const rawHex = tx.raw_amount.startsWith('0x') ? tx.raw_amount : '0x' + tx.raw_amount;
          // Convert from wei to the token's decimal places (PYUSD uses 6 decimals)
          const amountBigInt = BigInt(rawHex);
          amountValue = Number(amountBigInt) / 1_000_000;
          console.log(`[BigQuery] Parsed transaction amount: ${amountValue} PYUSD from ${rawHex}`);
        } catch (hexError) {
          console.error(`[BigQuery] Error parsing hex amount (${tx.raw_amount}):`, hexError);
        }
        
        // Get the transaction details on-chain for verification
        // We'll use the hash to get the block data
        const txReceipt = await provider.getTransactionReceipt(tx.transaction_hash);
        
        if (txReceipt) {
          // Transaction verified on chain
          console.log(`[BigQuery] Transaction ${tx.transaction_hash} verified on-chain in block ${txReceipt.blockNumber}`);
          
          transactions.push({
            hash: tx.transaction_hash,
            blockNumber: Number(tx.block_number),
            type,
            from,
            to,
            amount: amountValue > 0 ? amountValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " PYUSD" : "0 PYUSD",
            timestamp: timestamp.getTime(),
            formattedDate: timestamp.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
          
          // Stop if we have enough transactions
          if (transactions.length >= limit) {
            break;
          }
        }
      } catch (error) {
        console.error(`[BigQuery] Error verifying transaction ${tx.transaction_hash}:`, error);
      }
    }
    
    console.log(`[BigQuery] Returning ${transactions.length} verified recent transactions`);
    return transactions;
  } catch (error) {
    console.error('[BigQuery] Error fetching recent transactions:', error);
    return [];
  }
}

/**
 * Verify that BigQuery access is properly configured
 */
export async function verifyBigQueryAccess(): Promise<boolean> {
  try {
    const client = getBigQueryClient();
    
    // Log that we're attempting to verify access
    console.log('[BigQuery] Verifying BigQuery access with test query...');
    
    // Try a simple query to verify access
    const query = 'SELECT 1 as test';
    
    const [rows] = await client.query({ query });
    
    const result = rows.length > 0 && rows[0].test === 1;
    console.log(`[BigQuery] Access verification result: ${result ? 'Success' : 'Failed'}`);
    
    if (result) {
      // Also check that we can access the crypto dataset
      console.log('[BigQuery] Checking access to crypto_ethereum dataset...');
      try {
        const cryptoQuery = `
          SELECT COUNT(*) as token_count
          FROM \`bigquery-public-data.crypto_ethereum.tokens\`
          LIMIT 1
        `;
        
        const [cryptoRows] = await client.query({
          query: cryptoQuery,
          location: 'US',
          maxResults: 1
        });
        
        console.log(`[BigQuery] Successfully accessed crypto_ethereum dataset. Found ${cryptoRows[0].token_count} tokens.`);
        return true;
      } catch (cryptoError) {
        console.error('[BigQuery] Error accessing crypto_ethereum dataset:', cryptoError);
        return false;
      }
    }
    
    return result;
  } catch (error) {
    console.error('[BigQuery] Error verifying BigQuery access:', error);
    console.error('[BigQuery] Error details:', error instanceof Error ? error.message : String(error));
    return false;
  }
}