
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId || 'user-' + Date.now(),
      },
      client_name: 'Oakline Bank',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
      // For sandbox, allow all account types
      account_filters: {
        depository: {
          account_subtypes: ['checking', 'savings'],
        },
      },
    });

    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: error.message });
  }
}
