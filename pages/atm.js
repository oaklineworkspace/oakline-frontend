
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ATM() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState('welcome'); // welcome, pin, menu, operation
  const [pin, setPin] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [operationType, setOperationType] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    checkUser();
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchUserAccounts(session.user.id);
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      // Get user profile first
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setMessage('Unable to load account information');
        return;
      }

      if (profile?.application_id) {
        // Get accounts for this user
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('application_id', profile.application_id)
          .eq('status', 'active');

        if (accountsError) {
          console.error('Accounts error:', accountsError);
          setMessage('Unable to load accounts');
          return;
        }

        setAccounts(accountsData || []);
        
        if (!accountsData || accountsData.length === 0) {
          setMessage('No active accounts found. Please contact customer service.');
        }
      } else {
        setMessage('Account profile not found. Please contact customer service.');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setMessage('System error. Please try again later.');
    }
  };

  const fetchTransactionHistory = async (accountId) => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10);

      setTransactionHistory(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handlePinSubmit = () => {
    // Simple PIN validation (in real app, this would be more secure)
    if (pin.length === 4) {
      setCurrentStep('menu');
      setMessage('');
    } else {
      setMessage('Please enter a 4-digit PIN');
    }
  };

  const handleWithdrawal = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (withdrawAmount > selectedAccount.balance) {
      setMessage('Insufficient funds');
      return;
    }

    setIsLoading(true);
    try {
      // Update account balance
      const newBalance = parseFloat(selectedAccount.balance) - withdrawAmount;
      
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', selectedAccount.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: selectedAccount.id,
          type: 'withdrawal',
          amount: withdrawAmount,
          description: `ATM Withdrawal`,
          status: 'completed',
          category: 'ATM'
        });

      if (transactionError) throw transactionError;

      setMessage(`Withdrawal successful! Please take your cash: $${withdrawAmount.toFixed(2)}`);
      setSelectedAccount({ ...selectedAccount, balance: newBalance });
      setAmount('');
      
      setTimeout(() => {
        setCurrentStep('menu');
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    const depositAmount = parseFloat(amount);
    setIsLoading(true);

    try {
      // Update account balance
      const newBalance = parseFloat(selectedAccount.balance) + depositAmount;
      
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', selectedAccount.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: selectedAccount.id,
          type: 'deposit',
          amount: depositAmount,
          description: `ATM Deposit`,
          status: 'completed',
          category: 'ATM'
        });

      if (transactionError) throw transactionError;

      setMessage(`Deposit successful! Amount deposited: $${depositAmount.toFixed(2)}`);
      setSelectedAccount({ ...selectedAccount, balance: newBalance });
      setAmount('');
      
      setTimeout(() => {
        setCurrentStep('menu');
        setMessage('');
      }, 3000);

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage('Transaction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberPad = (num) => {
    if (currentStep === 'pin') {
      if (pin.length < 4) {
        setPin(pin + num);
      }
    } else if (currentStep === 'operation') {
      setAmount(amount + num);
    }
  };

  const handleClear = () => {
    if (currentStep === 'pin') {
      setPin('');
    } else if (currentStep === 'operation') {
      setAmount('');
    }
  };

  const handleBackspace = () => {
    if (currentStep === 'pin') {
      setPin(pin.slice(0, -1));
    } else if (currentStep === 'operation') {
      setAmount(amount.slice(0, -1));
    }
  };

  const renderWelcomeScreen = () => (
    <div style={styles.screenContent}>
      <div style={styles.welcomeContainer}>
        <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt={bankDetails?.name || "Oakline Bank"} style={styles.atmLogo} />
        <h1 style={styles.welcomeTitle}>Welcome to {bankDetails?.name || 'Oakline Bank'} ATM</h1>
        <p style={styles.welcomeText}>Please insert your card or enter your PIN to begin</p>
        {user ? (
          <button 
            onClick={() => setCurrentStep('pin')} 
            style={styles.welcomeButton}
          >
            Start Transaction
          </button>
        ) : (
          <Link href="/login" style={styles.welcomeButton}>
            Login to Continue
          </Link>
        )}
      </div>
    </div>
  );

  const renderPinScreen = () => (
    <div style={styles.screenContent}>
      <div style={styles.pinContainer}>
        <h2 style={styles.pinTitle}>Enter Your PIN</h2>
        <div style={styles.pinDisplay}>
          {'•'.repeat(pin.length)}
          {'_'.repeat(4 - pin.length)}
        </div>
        {message && <div style={styles.errorMessage}>{message}</div>}
        <button 
          onClick={handlePinSubmit} 
          style={styles.continueButton}
          disabled={pin.length !== 4}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderMenuScreen = () => (
    <div style={styles.screenContent}>
      <div style={styles.menuContainer}>
        <h2 style={styles.menuTitle}>Select Transaction</h2>
        {accounts.length > 0 ? (
          <>
            {accounts.length > 1 && (
              <div style={styles.accountSelector}>
                <label>Select Account:</label>
                <select 
                  value={selectedAccount?.id || accounts[0]?.id || ''}
                  onChange={(e) => {
                    const account = accounts.find(acc => acc.id === e.target.value);
                    setSelectedAccount(account);
                  }}
                  style={styles.accountSelect}
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type?.replace(/_/g, ' ').toUpperCase()} - ****{account.account_number?.slice(-4)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={styles.menuGrid}>
              <button 
                onClick={() => {
                  const account = selectedAccount || accounts[0];
                  setSelectedAccount(account);
                  setCurrentStep('operation');
                  setOperationType('balance');
                }}
                style={styles.menuButton}
              >
                <div style={styles.menuButtonIcon}>💰</div>
                <div>Balance Inquiry</div>
              </button>
          
          <button 
                onClick={() => {
                  const account = selectedAccount || accounts[0];
                  setSelectedAccount(account);
                  setCurrentStep('operation');
                  setOperationType('withdrawal');
                }}
                style={styles.menuButton}
              >
                <div style={styles.menuButtonIcon}>💸</div>
                <div>Cash Withdrawal</div>
              </button>
              
              <button 
                onClick={() => {
                  const account = selectedAccount || accounts[0];
                  setSelectedAccount(account);
                  setCurrentStep('operation');
                  setOperationType('deposit');
                }}
                style={styles.menuButton}
              >
                <div style={styles.menuButtonIcon}>💳</div>
                <div>Cash Deposit</div>
              </button>
              
              <button 
                onClick={() => {
                  const account = selectedAccount || accounts[0];
                  setSelectedAccount(account);
                  setCurrentStep('operation');
                  setOperationType('history');
                  fetchTransactionHistory(account.id);
                }}
                style={styles.menuButton}
              >
                <div style={styles.menuButtonIcon}>📋</div>
                <div>Transaction History</div>
              </button>
            </div>
          </>
        ) : (
          <div style={styles.noAccountsMessage}>
            <h3>No accounts available</h3>
            <p>Please contact customer service for assistance.</p>
            <button onClick={() => setCurrentStep('welcome')} style={styles.backButton}>
              Back to Start
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOperationScreen = () => {
    switch (operationType) {
      case 'balance':
        return (
          <div style={styles.screenContent}>
            <div style={styles.operationContainer}>
              <h2 style={styles.operationTitle}>Account Balance</h2>
              <div style={styles.balanceDisplay}>
                <div style={styles.accountInfo}>
                  <div>Account: {selectedAccount?.account_type?.replace(/_/g, ' ').toUpperCase()}</div>
                  <div>Number: ****{selectedAccount?.account_number?.slice(-4)}</div>
                </div>
                <div style={styles.balanceAmount}>
                  ${parseFloat(selectedAccount?.balance || 0).toFixed(2)}
                </div>
              </div>
              <div style={styles.operationButtons}>
                <button onClick={() => setCurrentStep('menu')} style={styles.backButton}>
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );

      case 'withdrawal':
        return (
          <div style={styles.screenContent}>
            <div style={styles.operationContainer}>
              <h2 style={styles.operationTitle}>Cash Withdrawal</h2>
              <div style={styles.accountBalance}>
                Available Balance: ${parseFloat(selectedAccount?.balance || 0).toFixed(2)}
              </div>
              <div style={styles.amountInput}>
                <div style={styles.amountDisplay}>
                  ${amount || '0.00'}
                </div>
              </div>
              {message && <div style={styles.message}>{message}</div>}
              <div style={styles.operationButtons}>
                <button 
                  onClick={handleWithdrawal} 
                  style={styles.confirmButton}
                  disabled={isLoading || !amount}
                >
                  {isLoading ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
                <button onClick={() => setCurrentStep('menu')} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );

      case 'deposit':
        return (
          <div style={styles.screenContent}>
            <div style={styles.operationContainer}>
              <h2 style={styles.operationTitle}>Cash Deposit</h2>
              <div style={styles.depositInfo}>
                <div>Please insert cash and enter the amount</div>
              </div>
              <div style={styles.amountInput}>
                <div style={styles.amountDisplay}>
                  ${amount || '0.00'}
                </div>
              </div>
              {message && <div style={styles.message}>{message}</div>}
              <div style={styles.operationButtons}>
                <button 
                  onClick={handleDeposit} 
                  style={styles.confirmButton}
                  disabled={isLoading || !amount}
                >
                  {isLoading ? 'Processing...' : 'Confirm Deposit'}
                </button>
                <button onClick={() => setCurrentStep('menu')} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div style={styles.screenContent}>
            <div style={styles.operationContainer}>
              <h2 style={styles.operationTitle}>Transaction History</h2>
              <div style={styles.transactionList}>
                {transactionHistory.length > 0 ? (
                  transactionHistory.map((transaction) => (
                    <div key={transaction.id} style={styles.transactionItem}>
                      <div style={styles.transactionInfo}>
                        <div style={styles.transactionType}>
                          {transaction.type.toUpperCase()}
                        </div>
                        <div style={styles.transactionDate}>
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={styles.transactionAmount}>
                        ${parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={styles.noTransactions}>No recent transactions</div>
                )}
              </div>
              <div style={styles.operationButtons}>
                <button onClick={() => setCurrentStep('menu')} style={styles.backButton}>
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderNumberPad = () => (
    <div style={styles.numberPad}>
      <div style={styles.numberGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleNumberPad(num.toString())} 
            style={styles.numberButton}
          >
            {num}
          </button>
        ))}
        <button onClick={handleClear} style={styles.numberButton}>Clear</button>
        <button onClick={() => handleNumberPad('0')} style={styles.numberButton}>0</button>
        <button onClick={handleBackspace} style={styles.numberButton}>⌫</button>
      </div>
      {(currentStep === 'operation' && (operationType === 'withdrawal' || operationType === 'deposit')) && (
        <div style={styles.quickAmountButtons}>
          {[20, 40, 60, 100, 200].map(quickAmount => (
            <button 
              key={quickAmount}
              onClick={() => setAmount(quickAmount.toString())}
              style={styles.quickAmountButton}
            >
              ${quickAmount}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Head>
        <title>ATM - Oakline Bank</title>
        <meta name="description" content="Secure ATM services - withdraw, deposit, check balance and view transaction history" />
      </Head>

      {/* Professional ATM Gallery Section */}
      <section style={styles.atmGallerySection}>
        <div style={styles.galleryContainer}>
          <h2 style={styles.galleryTitle}>{bankDetails?.name || 'Oakline Bank'} ATM Network</h2>
          <p style={styles.gallerySubtitle}>
            Access your accounts 24/7 at our modern, secure ATM locations nationwide
          </p>
          <div style={styles.imageGrid}>
            <div style={styles.galleryImageContainer} className="gallery-image-container">
              <img 
                src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt={`People using ${bankDetails?.name || 'Oakline Bank'} ATM`} 
                style={styles.galleryImage}
                onError={(e) => {
                  e.target.src = '/images/atm-with-people.png';
                }}
              />
              <div style={styles.imageOverlay} className="image-overlay">
                <h3 style={styles.overlayTitle}>Convenient Locations</h3>
                <p style={styles.overlayText}>Find ATMs in convenient locations near you</p>
              </div>
            </div>
            <div style={styles.galleryImageContainer} className="gallery-image-container">
              <img 
                src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="ATM transaction screen" 
                style={styles.galleryImage}
                onError={(e) => {
                  e.target.src = '/images/atm-transaction.png';
                }}
              />
              <div style={styles.imageOverlay} className="image-overlay">
                <h3 style={styles.overlayTitle}>Secure Transactions</h3>
                <p style={styles.overlayText}>Advanced security for all your banking needs</p>
              </div>
            </div>
            <div style={styles.galleryImageContainer} className="gallery-image-container">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Modern bank interior with ATM" 
                style={styles.galleryImage}
                onError={(e) => {
                  e.target.src = '/images/Modern_bank_lobby_interior_d535acc7.png';
                }}
              />
              <div style={styles.imageOverlay} className="image-overlay">
                <h3 style={styles.overlayTitle}>Modern Banking</h3>
                <p style={styles.overlayText}>State-of-the-art banking technology</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={styles.container}>
        <div style={styles.atmMachine}>
          <div style={styles.atmHeader}>
            <div style={styles.atmBrand}>{(bankDetails?.name || 'OAKLINE BANK').toUpperCase()} ATM</div>
            <div style={styles.atmStatus}>● ONLINE</div>
          </div>
          
          <div style={styles.atmScreen}>
            {currentStep === 'welcome' && renderWelcomeScreen()}
            {currentStep === 'pin' && renderPinScreen()}
            {currentStep === 'menu' && renderMenuScreen()}
            {currentStep === 'operation' && renderOperationScreen()}
          </div>

          {(currentStep === 'pin' || (currentStep === 'operation' && (operationType === 'withdrawal' || operationType === 'deposit'))) && renderNumberPad()}
          
          <div style={styles.atmFooter}>
            <div style={styles.cardSlot}>💳 CARD SLOT</div>
            <div style={styles.cashSlot}>💵 CASH DISPENSER</div>
          </div>
        </div>

        <div style={styles.exitButton}>
          <Link href="/dashboard" style={styles.exitLink}>
            Exit ATM
          </Link>
        </div>
      </div>
    </>
  );
}

const styles = {
  // ATM Gallery Section
  atmGallerySection: {
    padding: '4rem 2rem',
    backgroundColor: 'var(--neutral-gray, #F5F6F8)',
    borderBottom: '1px solid #e2e8f0'
  },
  galleryContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    textAlign: 'center'
  },
  galleryTitle: {
    fontSize: 'clamp(2rem, 4vw, 2.5rem)',
    fontWeight: '900',
    color: 'var(--primary-navy, #1A3E6F)',
    marginBottom: '1rem',
    letterSpacing: '-0.01em'
  },
  gallerySubtitle: {
    fontSize: '1.1rem',
    color: 'var(--secondary-text, #4A4A4A)',
    marginBottom: '3rem',
    maxWidth: '600px',
    margin: '0 auto 3rem'
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  },
  galleryImageContainer: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 8px 25px rgba(26, 54, 93, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    backgroundColor: 'white'
  },
  galleryImage: {
    width: '100%',
    height: '250px',
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(26, 54, 93, 0.9))',
    color: 'white',
    padding: '2rem 1.5rem 1.5rem',
    transform: 'translateY(20px)',
    opacity: 0,
    transition: 'all 0.3s ease'
  },
  overlayTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  overlayText: {
    fontSize: '0.9rem',
    opacity: 0.9
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#1a365d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  atmMachine: {
    width: '400px',
    backgroundColor: '#2d3748',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    border: '4px solid #4a5568'
  },
  atmHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#1a365d',
    borderRadius: '8px',
    color: 'white'
  },
  atmBrand: {
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  atmStatus: {
    fontSize: '0.8rem',
    color: '#48bb78'
  },
  atmScreen: {
    height: '350px',
    backgroundColor: '#000',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    overflow: 'auto'
  },
  screenContent: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  welcomeContainer: {
    textAlign: 'center',
    padding: '2rem'
  },
  atmLogo: {
    height: '40px',
    marginBottom: '1rem'
  },
  welcomeTitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#FFC857'
  },
  welcomeText: {
    fontSize: '1rem',
    marginBottom: '2rem',
    opacity: 0.8
  },
  welcomeButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#FFC857',
    color: '#1a365d',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  pinContainer: {
    textAlign: 'center',
    padding: '2rem'
  },
  pinTitle: {
    fontSize: '1.3rem',
    marginBottom: '2rem',
    color: '#FFC857'
  },
  pinDisplay: {
    fontSize: '2rem',
    letterSpacing: '1rem',
    marginBottom: '1rem',
    fontFamily: 'monospace',
    color: 'white'
  },
  continueButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  menuContainer: {
    padding: '1rem',
    width: '100%'
  },
  menuTitle: {
    fontSize: '1.3rem',
    marginBottom: '1.5rem',
    color: '#FFC857',
    textAlign: 'center'
  },
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  menuButton: {
    padding: '1rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  menuButtonIcon: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  operationContainer: {
    padding: '1rem',
    width: '100%',
    textAlign: 'center'
  },
  operationTitle: {
    fontSize: '1.3rem',
    marginBottom: '1rem',
    color: '#FFC857'
  },
  balanceDisplay: {
    marginBottom: '1.5rem'
  },
  accountInfo: {
    fontSize: '0.9rem',
    marginBottom: '1rem',
    opacity: 0.8
  },
  balanceAmount: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#48bb78'
  },
  accountBalance: {
    fontSize: '1rem',
    marginBottom: '1rem',
    color: '#48bb78'
  },
  amountInput: {
    marginBottom: '1rem'
  },
  amountDisplay: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#FFC857',
    backgroundColor: '#1a365d',
    padding: '0.5rem',
    borderRadius: '6px'
  },
  operationButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  confirmButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  backButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  transactionList: {
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '1rem'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem',
    borderBottom: '1px solid #4a5568'
  },
  transactionInfo: {
    textAlign: 'left'
  },
  transactionType: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  transactionDate: {
    fontSize: '0.8rem',
    opacity: 0.7
  },
  transactionAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#48bb78'
  },
  noTransactions: {
    padding: '2rem',
    opacity: 0.7
  },
  numberPad: {
    marginTop: '1rem'
  },
  numberGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  numberButton: {
    padding: '1rem',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'all 0.2s'
  },
  quickAmountButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.25rem'
  },
  quickAmountButton: {
    padding: '0.5rem',
    backgroundColor: '#FFC857',
    color: '#1a365d',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 'bold'
  },
  atmFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#1a365d',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.8rem'
  },
  cardSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cashSlot: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  exitButton: {
    position: 'absolute',
    top: '2rem',
    right: '2rem'
  },
  exitLink: {
    padding: '0.75rem 1rem',
    backgroundColor: '#e53e3e',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold'
  },
  message: {
    padding: '0.5rem',
    marginBottom: '1rem',
    backgroundColor: '#48bb78',
    borderRadius: '4px',
    fontSize: '0.9rem'
  },
  errorMessage: {
    padding: '0.5rem',
    marginBottom: '1rem',
    backgroundColor: '#e53e3e',
    borderRadius: '4px',
    fontSize: '0.9rem'
  },
  depositInfo: {
    fontSize: '0.9rem',
    marginBottom: '1rem',
    opacity: 0.8
  },
  accountSelector: {
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  accountSelect: {
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #4a5568',
    backgroundColor: '#2d3748',
    color: 'white',
    fontSize: '0.9rem',
    marginLeft: '0.5rem'
  },
  noAccountsMessage: {
    textAlign: 'center',
    padding: '2rem',
    color: '#FFC857'
  }
};

// Add interactive effects
if (typeof document !== 'undefined') {
  const galleryStyles = document.createElement('style');
  galleryStyles.textContent = `
    .gallery-image-container:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(26, 54, 93, 0.2) !important;
    }
    
    .gallery-image-container:hover img {
      transform: scale(1.05);
    }
    
    .gallery-image-container:hover .image-overlay {
      opacity: 1;
      transform: translateY(0);
    }
    
    @media (max-width: 768px) {
      .image-overlay {
        opacity: 1;
        transform: translateY(0);
        background: linear-gradient(transparent, rgba(26, 54, 93, 0.8));
      }
    }
  `;
  document.head.appendChild(galleryStyles);
}
