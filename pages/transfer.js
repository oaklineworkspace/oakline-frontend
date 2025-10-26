import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Transfer() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]); // State for pending accounts
  const [fromAccount, setFromAccount] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('internal');
  const [transferDetails, setTransferDetails] = useState({
    recipient_name: '',
    recipient_email: '',
    memo: '',
    routing_number: '',
    bank_name: '',
    swift_code: '',
    country: '',
    purpose: '',
    recipient_address: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setPageLoading(true);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session error:', sessionError);
        router.push('/login');
        return;
      }

      if (!session?.user) {
        console.log('No active session found');
        router.push('/login');
        return;
      }

      console.log('User session found:', {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at
      });
      setUser(session.user);

      // Fetch user profile with multiple attempts
      let profile = null;

      // Try by user ID first
      const { data: profileById, error: profileByIdError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profileByIdError && profileById) {
        profile = profileById;
        console.log('Profile found by ID:', {
          id: profile.id,
          email: profile.email,
          application_id: profile.application_id
        });
      } else {
        console.error('Profile fetch by ID error:', profileByIdError);

        // Try by email as fallback
        const { data: profileByEmail, error: profileByEmailError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (!profileByEmailError && profileByEmail) {
          profile = profileByEmail;
          console.log('Profile found by email:', {
            id: profile.id,
            email: profile.email,
            application_id: profile.application_id
          });
        } else {
          console.error('Profile fetch by email error:', profileByEmailError);
        }
      }

      if (profile) {
        setUserProfile(profile);
      } else {
        console.warn('No profile found, but continuing with account fetch');
      }

      await fetchAccounts(session.user, profile);

    } catch (error) {
      console.error('Error in checkUserAndFetchData:', error);
      setMessage('Error loading user data. Please try refreshing the page.');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchAccounts = async (user, profile) => {
    try {
      console.log('Fetching accounts for user:', { id: user.id, email: user.email });

      if (!user || !user.id) {
        console.error('Invalid user object');
        setMessage('Authentication error. Please log in again.');
        setAccounts([]);
        return;
      }

      let accountsData = [];
      let pendingAccountsData = [];

      // Try multiple methods to find accounts

      // Method 1: Get accounts through application_id if profile exists
      if (profile?.application_id) {
        console.log('Trying application_id method:', profile.application_id);
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('application_id', profile.application_id)
          .order('created_at', { ascending: true });

        if (!accountsError && accounts && accounts.length > 0) {
          accountsData = accounts.filter(acc => acc.status === 'active');
          pendingAccountsData = accounts.filter(acc => acc.status === 'pending');
          console.log('Found accounts through application_id:', accountsData.length, 'pending:', pendingAccountsData.length);
        } else if (accountsError) {
          console.error('Application ID query error:', accountsError);
        }
      }

      // Method 2: Try direct user_id lookup if no accounts found or to supplement
      if (accountsData.length === 0 || pendingAccountsData.length === 0) {
        console.log('Trying direct user_id lookup');
        const { data: directAccounts, error: directError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!directError && directAccounts && directAccounts.length > 0) {
          const currentActive = directAccounts.filter(acc => acc.status === 'active');
          const currentPending = directAccounts.filter(acc => acc.status === 'pending');

          // Merge if new accounts found
          if (currentActive.length > 0 && !accountsData.some(acc => currentActive.some(ca => ca.id === acc.id))) {
            accountsData = [...accountsData, ...currentActive];
          }
          if (currentPending.length > 0 && !pendingAccountsData.some(acc => currentPending.some(cp => cp.id === acc.id))) {
            pendingAccountsData = [...pendingAccountsData, ...currentPending];
          }
          console.log('Found accounts via direct user_id lookup:', currentActive.length, 'pending:', currentPending.length);
        } else if (directError) {
          console.error('Direct user_id query error:', directError);
        }
      }

      // Method 3: Try looking up by email if still no accounts found
      if (accountsData.length === 0 && user.email) {
        console.log('Trying email-based lookup');

        // First get profile by email
        const { data: emailProfile, error: profileError } = await supabase
          .from('profiles')
          .select('application_id')
          .eq('email', user.email)
          .single();

        if (!profileError && emailProfile?.application_id) {
          const { data: emailAccounts, error: emailAccountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('application_id', emailProfile.application_id)
            .order('created_at', { ascending: true });

          if (!emailAccountsError && emailAccounts && emailAccounts.length > 0) {
            const currentActive = emailAccounts.filter(acc => acc.status === 'active');
            const currentPending = emailAccounts.filter(acc => acc.status === 'pending');

            // Validate these accounts belong to current user and merge
            const validAccounts = currentActive.filter(account => {
              return account.email === user.email || account.user_email === user.email;
            });
            const validPendingAccounts = currentPending.filter(account => {
              return account.email === user.email || account.user_email === user.email;
            });

            if (validAccounts.length > 0 && !accountsData.some(acc => validAccounts.some(va => va.id === acc.id))) {
              accountsData = [...accountsData, ...validAccounts];
            }
            if (validPendingAccounts.length > 0 && !pendingAccountsData.some(acc => validPendingAccounts.some(vp => vp.id === acc.id))) {
              pendingAccountsData = [...pendingAccountsData, ...validPendingAccounts];
            }
            console.log('Found accounts via email lookup:', validAccounts.length, 'pending:', validPendingAccounts.length);
          }
        }
      }

      // Method 4: Last resort - try finding any accounts associated with the user's email
      if (accountsData.length === 0 && user.email) {
        console.log('Last resort: checking accounts table for email patterns');
        const { data: lastResortAccounts, error: lastError } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: true });

        if (!lastError && lastResortAccounts) {
          // Filter accounts that might belong to this user (this is not ideal but helps debug)
          console.log('All accounts found:', lastResortAccounts.length);
          const userSpecificAccounts = lastResortAccounts.filter(account =>
            account.user_id === user.id ||
            (account.application_id && profile?.application_id === account.application_id) ||
            account.email === user.email || account.user_email === user.email
          );
          const currentActive = userSpecificAccounts.filter(acc => acc.status === 'active');
          const currentPending = userSpecificAccounts.filter(acc => acc.status === 'pending');

          if (currentActive.length > 0 && !accountsData.some(acc => currentActive.some(ca => ca.id === acc.id))) {
            accountsData = [...accountsData, ...currentActive];
          }
          if (currentPending.length > 0 && !pendingAccountsData.some(acc => currentPending.some(cp => cp.id === acc.id))) {
            pendingAccountsData = [...pendingAccountsData, ...currentPending];
          }
          console.log('Filtered accounts for user:', userSpecificAccounts.length, 'active:', currentActive.length, 'pending:', currentPending.length);
        }
      }

      // Set accounts and select first one
      if (accountsData.length > 0) {
        setAccounts(accountsData);
        setFromAccount(accountsData[0].id.toString());
        setMessage('');
        console.log('Successfully loaded user accounts:', accountsData.length);
        console.log('Account details:', accountsData.map(acc => ({
          id: acc.id,
          type: acc.account_type,
          number: acc.account_number,
          balance: acc.balance
        })));
      } else {
        setAccounts([]);
        setMessage('No active accounts found for your profile. Please contact support or apply for an account first.');
        console.log('No active accounts found for user after all methods');
      }
      setPendingAccounts(pendingAccountsData); // Set pending accounts regardless of active accounts

    } catch (error) {
      console.error('Error fetching accounts:', error);
      setMessage('Unable to load accounts. Please try again or contact support.');
      setAccounts([]);
      setPendingAccounts([]);
    } finally {
      setPageLoading(false);
    }
  };

  const handleTransferDetailsChange = (field, value) => {
    setTransferDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const selectedAccountData = accounts.find(acc => acc.id.toString() === fromAccount);
    const transferAmount = parseFloat(amount);

    if (!fromAccount || !toAccountNumber || !amount || transferAmount <= 0) {
      setMessage('Please select accounts and enter a valid transfer amount.');
      return false;
    }

    if (transferAmount > parseFloat(selectedAccountData?.balance || 0)) {
      setMessage('Insufficient funds. Your current balance is $' + parseFloat(selectedAccountData?.balance || 0).toFixed(2));
      return false;
    }

    if (transferAmount > 25000 && transferType !== 'internal') {
      setMessage('External transfers over $25,000 require additional verification. Please contact support.');
      return false;
    }

    switch (transferType) {
      case 'domestic_external':
        if (!transferDetails.recipient_name || !transferDetails.routing_number || !transferDetails.bank_name) {
          setMessage('Please fill in recipient name, routing number, and bank name for domestic transfers.');
          return false;
        }
        break;
      case 'international':
        if (!transferDetails.recipient_name || !transferDetails.swift_code ||
            !transferDetails.country || !transferDetails.purpose) {
          setMessage('Please fill in all required fields for international transfers.');
          return false;
        }
        break;
      case 'internal':
        if (!transferDetails.recipient_name) {
          setMessage('Please provide the recipient name for reference.');
          return false;
        }
        break;
    }
    return true;
  };

  const calculateFee = () => {
    const transferAmount = parseFloat(amount) || 0;
    switch (transferType) {
      case 'internal': return 0;
      case 'domestic_external': return transferAmount > 1000 ? 5.00 : 2.00;
      case 'international': return 30.00;
      default: return 0;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const selectedAccountData = accounts.find(acc => acc.id.toString() === fromAccount);
      const transferAmount = parseFloat(amount);
      const fee = calculateFee();
      const totalDeduction = transferAmount + fee;

      if (totalDeduction > parseFloat(selectedAccountData?.balance || 0)) {
        setMessage(`Insufficient funds including fees. Total needed: $${totalDeduction.toFixed(2)}`);
        setLoading(false);
        return;
      }

      // Create sender transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: parseInt(fromAccount),
          amount: -transferAmount,
          type: 'transfer_out',
          description: `${transferType.toUpperCase()} transfer to ${toAccountNumber} - ${transferDetails.recipient_name} - ${transferDetails.memo || 'Transfer'}`,
          status: transferType === 'internal' ? 'completed' : 'pending',
          category: 'transfer',
          created_at: new Date().toISOString()
        }]);

      if (transactionError) throw transactionError;

      // Create fee transaction if applicable
      if (fee > 0) {
        await supabase.from('transactions').insert([{
          user_id: user.id,
          account_id: parseInt(fromAccount),
          amount: -fee,
          type: 'fee',
          description: `${transferType.toUpperCase()} transfer fee`,
          status: 'completed',
          category: 'fee',
          created_at: new Date().toISOString()
        }]);
      }

      setMessage(`✅ Transfer of $${transferAmount.toFixed(2)} has been processed successfully!${fee > 0 ? ` Fee: $${fee.toFixed(2)}` : ''}`);
      setAmount('');
      setToAccountNumber('');
      setTransferDetails({
        recipient_name: '', recipient_email: '', memo: '', routing_number: '',
        bank_name: '', swift_code: '', country: '', purpose: '', recipient_address: ''
      });

      // Refresh accounts
      await fetchAccounts(user, userProfile);

      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Transfer error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const renderTransferTypeFields = () => {
    switch (transferType) {
      case 'internal':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Recipient Name *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)}
                placeholder="Name for reference"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Memo (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.memo}
                onChange={(e) => handleTransferDetailsChange('memo', e.target.value)}
                placeholder="What's this transfer for?"
              />
            </div>
          </>
        );

      case 'domestic_external':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Recipient Name *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)}
                placeholder="Full name on account"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Bank Name *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.bank_name}
                onChange={(e) => handleTransferDetailsChange('bank_name', e.target.value)}
                placeholder="Recipient's bank name"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Routing Number *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.routing_number}
                onChange={(e) => handleTransferDetailsChange('routing_number', e.target.value)}
                placeholder="123456789"
                maxLength="9"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Memo (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.memo}
                onChange={(e) => handleTransferDetailsChange('memo', e.target.value)}
                placeholder="Purpose of transfer"
              />
            </div>
          </>
        );

      case 'international':
        return (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Recipient Name *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)}
                placeholder="Full name on account"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Country *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.country}
                onChange={(e) => handleTransferDetailsChange('country', e.target.value)}
                placeholder="Destination country"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>SWIFT Code *</label>
              <input
                type="text"
                style={styles.input}
                value={transferDetails.swift_code}
                onChange={(e) => handleTransferDetailsChange('swift_code', e.target.value)}
                placeholder="ABCDUS33XXX"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Purpose of Transfer *</label>
              <select
                style={styles.select}
                value={transferDetails.purpose}
                onChange={(e) => handleTransferDetailsChange('purpose', e.target.value)}
                required
              >
                <option value="">Select purpose</option>
                <option value="family_support">Family Support</option>
                <option value="education">Education</option>
                <option value="business">Business</option>
                <option value="investment">Investment</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Recipient Address</label>
              <textarea
                style={{...styles.input, minHeight: '60px', resize: 'vertical'}}
                value={transferDetails.recipient_address}
                onChange={(e) => handleTransferDetailsChange('recipient_address', e.target.value)}
                placeholder="Complete address of recipient"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading transfer page...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to make transfers</p>
          <a href="/login" style={styles.loginButton}>Go to Login</a>
        </div>
      </div>
    );
  }

  // Conditional rendering based on whether there are active accounts
  if (accounts.length === 0 && !loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <div style={styles.routingInfo}>Routing Number: 075915826</div>
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>
        </div>
        <div style={styles.emptyState}>
          <h1 style={styles.emptyTitle}>No Accounts Found</h1>
          <p style={styles.emptyDesc}>You need to have at least one active account to make transfers. If you have applied for an account, it may still be pending approval. Please contact support or apply for an account first.</p>
          <Link href="/apply" style={styles.emptyButton}>Apply for Account</Link>

          {/* Display pending accounts if any */}
          {pendingAccounts.length > 0 && (
            <div style={styles.pendingAccountsDisplay}>
              <h2 style={styles.pendingTitle}>Your Pending Accounts</h2>
              <div style={styles.pendingAccountsList}>
                {pendingAccounts.map((account) => (
                  <div key={account.id} style={styles.pendingAccountCard}>
                    <div style={styles.pendingAccountInfo}>
                      <p><strong>Account Type:</strong> {account.account_type?.replace('_', ' ')?.toUpperCase()}</p>
                      <p><strong>Account Number:</strong> ****{account.account_number?.slice(-4)}</p>
                      <p style={styles.pendingStatus}>Status: Pending Approval</p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={styles.contactInfo}>
                Your account is pending approval. Please wait for confirmation or contact support if you have questions.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedAccountData = accounts.find(acc => acc.id.toString() === fromAccount);
  const fee = calculateFee();
  const totalAmount = (parseFloat(amount) || 0) + fee;

  return (
    <>
      <Head>
        <title>Transfer Funds - Oakline Bank</title>
        <meta name="description" content="Send money securely with bank-level encryption" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <div style={styles.routingInfo}>Routing: 075915826</div>
            <Link href="/dashboard" style={styles.backButton}>← Back</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>💸 Transfer Funds</h1>
            <p style={styles.subtitle}>Send money securely</p>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              color: message.includes('✅') ? '#155724' : '#721c24',
              borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
            }}>
              {message}
            </div>
          )}

          {/* Display pending accounts if user has them but no active accounts */}
          {accounts.length === 0 && pendingAccounts.length > 0 && (
            <div style={styles.pendingAccountsDisplay}>
              <h2 style={styles.pendingTitle}>Your Pending Accounts</h2>
              <div style={styles.pendingAccountsList}>
                {pendingAccounts.map((account) => (
                  <div key={account.id} style={styles.pendingAccountCard}>
                    <div style={styles.pendingAccountInfo}>
                      <p><strong>Account Type:</strong> {account.account_type?.replace('_', ' ')?.toUpperCase()}</p>
                      <p><strong>Account Number:</strong> ****{account.account_number?.slice(-4)}</p>
                      <p style={styles.pendingStatus}>Status: Pending Approval</p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={styles.contactInfo}>
                Your account is pending approval. You cannot make transfers until your account is active. Please contact support if you have questions.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Transfer From Account *</label>
              <select
                style={styles.select}
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                required
                disabled={accounts.length === 0} // Disable if no active accounts
              >
                <option value="">Choose account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                    ****{account.account_number?.slice(-4)} -
                    {formatCurrency(account.balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Transfer Type *</label>
              <select
                style={styles.select}
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                required
              >
                <option value="internal">🏦 Internal (Free)</option>
                <option value="domestic_external">🇺🇸 Domestic ($2-5)</option>
                <option value="international">🌍 International ($30)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>To Account Number *</label>
              <input
                type="text"
                style={styles.input}
                value={toAccountNumber}
                onChange={(e) => setToAccountNumber(e.target.value)}
                placeholder="Recipient account number"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                style={styles.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                step="0.01"
                min="0.01"
                max={selectedAccountData ? parseFloat(selectedAccountData.balance || 0) - fee : 25000}
                required
              />
            </div>

            <div style={styles.detailsSection}>
              <h3 style={styles.sectionTitle}>Transfer Details</h3>
              {renderTransferTypeFields()}
            </div>

            {fee > 0 && (
              <div style={styles.feeNotice}>
                <h4 style={styles.feeTitle}>💰 Fee Notice</h4>
                <p>This transfer incurs a {formatCurrency(fee)} fee.</p>
                <p><strong>Total: {formatCurrency(totalAmount)}</strong></p>
              </div>
            )}

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading || accounts.length === 0} // Disable if no active accounts
            >
              {loading ? '🔄 Processing...' : `Transfer ${formatCurrency(parseFloat(amount) || 0)}`}
            </button>
          </form>

          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Transfer Information</h4>
            <ul style={styles.infoList}>
              <li><strong>Internal:</strong> Instant transfers between Oakline accounts</li>
              <li><strong>Domestic:</strong> 1-3 business days to other US banks</li>
              <li><strong>International:</strong> 3-5 business days worldwide</li>
              <li>All transfers are secured with bank-level encryption</li>
              <li>Daily transfer limit: $25,000</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  routingInfo: {
    fontSize: '0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  content: {
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 6vw, 2rem)',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    color: '#64748b'
  },
  form: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  },
  detailsSection: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    border: '2px solid #e2e8f0'
  },
  sectionTitle: {
    color: '#1e40af',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  feeNotice: {
    backgroundColor: '#fff3cd',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  feeTitle: {
    color: '#92400e',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1e40af',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '0.85rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  emptyTitle: {
    fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  emptyDesc: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '16px',
    marginTop: '20px'
  },
  pendingAccountsDisplay: {
    marginTop: '2rem',
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  pendingTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  pendingAccountsList: {
    margin: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  pendingAccountCard: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'left'
  },
  pendingAccountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px'
  },
  pendingStatus: {
    color: '#856404',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  contactInfo: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
