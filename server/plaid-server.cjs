/**
 * Plaid Backend Server
 *
 * This server handles Plaid API calls that require secret keys.
 * Run with: node server/plaid-server.js
 *
 * Required environment variables (create a .env file):
 * - PLAID_CLIENT_ID: Your Plaid client ID
 * - PLAID_SECRET: Your Plaid secret key
 * - PLAID_ENV: sandbox, development, or production
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Validate environment variables
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.error('Error: PLAID_CLIENT_ID and PLAID_SECRET must be set in .env file');
  process.exit(1);
}

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Store access tokens in memory (in production, use secure storage)
const accessTokens = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: PLAID_ENV });
});

// Create a link token
app.post('/api/plaid/create-link-token', async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: 'budget-app-user' },
      client_name: 'Budget Tracker',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token
app.post('/api/plaid/exchange-token', async (req, res) => {
  const { public_token, institution } = req.body;

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store access token (in production, encrypt and store securely)
    accessTokens.set(itemId, {
      accessToken,
      institution,
      createdAt: new Date().toISOString(),
    });

    res.json({
      item_id: itemId,
      institution,
      success: true
    });
  } catch (error) {
    console.error('Error exchanging token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Get linked accounts
app.get('/api/plaid/accounts', async (req, res) => {
  const accounts = [];

  for (const [itemId, data] of accessTokens) {
    try {
      const response = await plaidClient.accountsGet({
        access_token: data.accessToken,
      });

      accounts.push(...response.data.accounts.map(account => ({
        ...account,
        item_id: itemId,
        institution: data.institution,
      })));
    } catch (error) {
      console.error(`Error fetching accounts for ${itemId}:`, error.response?.data || error.message);
    }
  }

  res.json({ accounts });
});

// Get transactions
app.post('/api/plaid/transactions', async (req, res) => {
  const { start_date, end_date } = req.body;

  // Default to last 30 days if not specified
  const endDate = end_date || new Date().toISOString().split('T')[0];
  const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const allTransactions = [];

  for (const [itemId, data] of accessTokens) {
    try {
      let hasMore = true;
      let cursor = undefined;

      // Use sync for incremental updates
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: data.accessToken,
          cursor,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Filter by date range
        const filteredTransactions = added
          .filter(t => t.date >= startDate && t.date <= endDate)
          .map(t => ({
            ...t,
            item_id: itemId,
            institution: data.institution,
          }));

        allTransactions.push(...filteredTransactions);

        cursor = next_cursor;
        hasMore = has_more;
      }
    } catch (error) {
      // Fall back to regular transactions endpoint if sync fails
      try {
        const response = await plaidClient.transactionsGet({
          access_token: data.accessToken,
          start_date: startDate,
          end_date: endDate,
        });

        allTransactions.push(...response.data.transactions.map(t => ({
          ...t,
          item_id: itemId,
          institution: data.institution,
        })));
      } catch (fallbackError) {
        console.error(`Error fetching transactions for ${itemId}:`, fallbackError.response?.data || fallbackError.message);
      }
    }
  }

  // Sort by date descending
  allTransactions.sort((a, b) => b.date.localeCompare(a.date));

  res.json({ transactions: allTransactions });
});

// Remove a linked item
app.delete('/api/plaid/item/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const data = accessTokens.get(itemId);

  if (!data) {
    return res.status(404).json({ error: 'Item not found' });
  }

  try {
    await plaidClient.itemRemove({
      access_token: data.accessToken,
    });
    accessTokens.delete(itemId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing item:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Get linked institutions
app.get('/api/plaid/institutions', (req, res) => {
  const institutions = [];
  for (const [itemId, data] of accessTokens) {
    institutions.push({
      item_id: itemId,
      institution: data.institution,
      linked_at: data.createdAt,
    });
  }
  res.json({ institutions });
});

const PORT = process.env.PLAID_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Plaid server running on http://localhost:${PORT}`);
  console.log(`Environment: ${PLAID_ENV}`);
  console.log('\nEndpoints:');
  console.log('  POST /api/plaid/create-link-token - Create Plaid Link token');
  console.log('  POST /api/plaid/exchange-token - Exchange public token');
  console.log('  GET  /api/plaid/accounts - Get linked accounts');
  console.log('  POST /api/plaid/transactions - Get transactions');
  console.log('  GET  /api/plaid/institutions - Get linked institutions');
  console.log('  DELETE /api/plaid/item/:itemId - Remove linked item');
});
