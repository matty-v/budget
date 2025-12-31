/**
 * Plaid API client for the frontend
 * Communicates with the Plaid backend server
 */

const PLAID_SERVER_URL = localStorage.getItem('plaid_server_url') || 'http://localhost:3001';

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    current: number | null;
    available: number | null;
  };
  item_id: string;
  institution: {
    name: string;
    institution_id: string;
  };
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  date: string;
  name: string;
  amount: number;
  category: string[] | null;
  merchant_name: string | null;
  pending: boolean;
  item_id: string;
  institution: {
    name: string;
    institution_id: string;
  };
}

export interface PlaidInstitution {
  item_id: string;
  institution: {
    name: string;
    institution_id: string;
  };
  linked_at: string;
}

class PlaidClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = PLAID_SERVER_URL;
  }

  setServerUrl(url: string) {
    this.baseUrl = url;
    localStorage.setItem('plaid_server_url', url);
  }

  getServerUrl(): string {
    return this.baseUrl;
  }

  async healthCheck(): Promise<{ status: string; env: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Plaid server is not available');
    }
    return response.json();
  }

  async createLinkToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/plaid/create-link-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create link token');
    }

    const data = await response.json();
    return data.link_token;
  }

  async exchangeToken(publicToken: string, institution: { name: string; institution_id: string }): Promise<{ item_id: string; success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/plaid/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token: publicToken, institution }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to exchange token');
    }

    return response.json();
  }

  async getAccounts(): Promise<PlaidAccount[]> {
    const response = await fetch(`${this.baseUrl}/api/plaid/accounts`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get accounts');
    }

    const data = await response.json();
    return data.accounts;
  }

  async getTransactions(startDate?: string, endDate?: string): Promise<PlaidTransaction[]> {
    const response = await fetch(`${this.baseUrl}/api/plaid/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get transactions');
    }

    const data = await response.json();
    return data.transactions;
  }

  async getInstitutions(): Promise<PlaidInstitution[]> {
    const response = await fetch(`${this.baseUrl}/api/plaid/institutions`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get institutions');
    }

    const data = await response.json();
    return data.institutions;
  }

  async removeItem(itemId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/plaid/item/${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove item');
    }
  }
}

export const plaidClient = new PlaidClient();
