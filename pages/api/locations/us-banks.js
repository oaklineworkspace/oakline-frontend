
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Comprehensive list of major US banks
    const banks = [
      { id: 1, name: 'JPMorgan Chase Bank', code: 'CHASE' },
      { id: 2, name: 'Bank of America', code: 'BOA' },
      { id: 3, name: 'Wells Fargo Bank', code: 'WELLSFARGO' },
      { id: 4, name: 'Citibank', code: 'CITI' },
      { id: 5, name: 'U.S. Bank', code: 'USB' },
      { id: 6, name: 'PNC Bank', code: 'PNC' },
      { id: 7, name: 'Truist Bank', code: 'TRUIST' },
      { id: 8, name: 'Goldman Sachs Bank', code: 'GOLDMAN' },
      { id: 9, name: 'TD Bank', code: 'TD' },
      { id: 10, name: 'Capital One', code: 'CAPITALONE' },
      { id: 11, name: 'American Express National Bank', code: 'AMEX' },
      { id: 12, name: 'Citizens Bank', code: 'CITIZENS' },
      { id: 13, name: 'KeyBank', code: 'KEY' },
      { id: 14, name: 'Ally Bank', code: 'ALLY' },
      { id: 15, name: 'BMO Harris Bank', code: 'BMO' },
      { id: 16, name: 'Fifth Third Bank', code: 'FIFTH3RD' },
      { id: 17, name: 'Huntington National Bank', code: 'HUNTINGTON' },
      { id: 18, name: 'Regions Bank', code: 'REGIONS' },
      { id: 19, name: 'M&T Bank', code: 'MT' },
      { id: 20, name: 'HSBC Bank USA', code: 'HSBC' },
      { id: 21, name: 'Charles Schwab Bank', code: 'SCHWAB' },
      { id: 22, name: 'Discover Bank', code: 'DISCOVER' },
      { id: 23, name: 'Navy Federal Credit Union', code: 'NAVYFED' },
      { id: 24, name: 'USAA Federal Savings Bank', code: 'USAA' },
      { id: 25, name: 'State Farm Bank', code: 'STATEFARM' },
      { id: 26, name: 'Santander Bank', code: 'SANTANDER' },
      { id: 27, name: 'SunTrust Bank (now Truist)', code: 'SUNTRUST' },
      { id: 28, name: 'BB&T (now Truist)', code: 'BBT' },
      { id: 29, name: 'Barclays Bank Delaware', code: 'BARCLAYS' },
      { id: 30, name: 'CIT Bank', code: 'CIT' },
      { id: 31, name: 'First Citizens Bank', code: 'FCB' },
      { id: 32, name: 'UBS Bank USA', code: 'UBS' },
      { id: 33, name: 'Morgan Stanley Bank', code: 'MORGANSTANLEY' },
      { id: 34, name: 'First Republic Bank', code: 'FIRSTREPUBLIC' },
      { id: 35, name: 'Silicon Valley Bank', code: 'SVB' },
      { id: 36, name: 'Synchrony Bank', code: 'SYNCHRONY' },
      { id: 37, name: 'Marcus by Goldman Sachs', code: 'MARCUS' },
      { id: 38, name: 'Varo Bank', code: 'VARO' },
      { id: 39, name: 'Chime Bank', code: 'CHIME' },
      { id: 40, name: 'SoFi Bank', code: 'SOFI' },
      { id: 41, name: 'Axos Bank', code: 'AXOS' },
      { id: 42, name: 'Regions Bank', code: 'REGIONS' },
      { id: 43, name: 'Comerica Bank', code: 'COMERICA' },
      { id: 44, name: 'Zions Bancorporation', code: 'ZIONS' },
      { id: 45, name: 'First Horizon Bank', code: 'FIRSTHORIZON' },
      { id: 46, name: 'East West Bank', code: 'EASTWEST' },
      { id: 47, name: 'Western Alliance Bank', code: 'WESTERNALLIA' },
      { id: 48, name: 'Webster Bank', code: 'WEBSTER' },
      { id: 49, name: 'People\'s United Bank', code: 'PEOPLES' },
      { id: 50, name: 'Synovus Bank', code: 'SYNOVUS' },
      { id: 51, name: 'BOK Financial', code: 'BOK' },
      { id: 52, name: 'Valley National Bank', code: 'VALLEY' },
      { id: 53, name: 'Signature Bank', code: 'SIGNATURE' },
      { id: 54, name: 'New York Community Bank', code: 'NYCB' },
      { id: 55, name: 'Frost Bank', code: 'FROST' },
      { id: 56, name: 'Hancock Whitney Bank', code: 'HANCOCKWHIT' },
      { id: 57, name: 'South State Bank', code: 'SOUTHSTATE' },
      { id: 58, name: 'BancorpSouth Bank', code: 'BANCORPSOUTH' },
      { id: 59, name: 'Ameris Bank', code: 'AMERIS' },
      { id: 60, name: 'First National Bank of Omaha', code: 'FNBO' },
      { id: 61, name: 'Commerce Bank', code: 'COMMERCE' },
      { id: 62, name: 'Umpqua Bank', code: 'UMPQUA' },
      { id: 63, name: 'Associated Bank', code: 'ASSOCIATED' },
      { id: 64, name: 'Old National Bank', code: 'OLDNATIONAL' },
      { id: 65, name: 'Simmons Bank', code: 'SIMMONS' },
      { id: 66, name: 'Pinnacle Financial Partners', code: 'PINNACLE' },
      { id: 67, name: 'First Interstate Bank', code: 'FIRSTINTERST' },
      { id: 68, name: 'Fulton Bank', code: 'FULTON' },
      { id: 69, name: 'BankUnited', code: 'BANKUNITED' },
      { id: 70, name: 'Texas Capital Bank', code: 'TEXASCAP' },
      { id: 71, name: 'Flagstar Bank', code: 'FLAGSTAR' },
      { id: 72, name: 'Home BancShares', code: 'HOMEBANC' },
      { id: 73, name: 'Investors Bank', code: 'INVESTORS' },
      { id: 74, name: 'Banner Bank', code: 'BANNER' },
      { id: 75, name: 'Atlantic Union Bank', code: 'ATLANTICUNI' },
      { id: 76, name: 'Washington Federal Bank', code: 'WASHFED' },
      { id: 77, name: 'United Bank', code: 'UNITED' },
      { id: 78, name: 'Independent Bank', code: 'INDEPENDENT' },
      { id: 79, name: 'FirstBank', code: 'FIRSTBANK' },
      { id: 80, name: 'Other/Manual Entry', code: 'OTHER' }
    ];

    return res.status(200).json({ banks });
  } catch (error) {
    console.error('Error in US banks API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
