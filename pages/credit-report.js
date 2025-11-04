import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { getCreditScoreTier, getCreditScoreMessage, formatCreditScoreDate } from '../lib/creditScoreUtils';

export default function CreditReport() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creditScore, setCreditScore] = useState(null);
  const [creditScoreData, setCreditScoreData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);
      await fetchCreditData(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/sign-in');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditData = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const { data: creditScoreRecord, error: creditScoreError } = await supabase
        .from('credit_scores')
        .select(`
          id,
          user_id,
          score,
          score_source,
          score_reason,
          updated_by,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (creditScoreError && creditScoreError.code !== 'PGRST116') {
        console.error('Error fetching credit score:', creditScoreError);
      }

      if (creditScoreRecord && creditScoreRecord.score) {
        setCreditScore(creditScoreRecord.score);
        setCreditScoreData(creditScoreRecord);
      } else {
        setCreditScore(null);
        setCreditScoreData(null);
      }

      const sampleReportData = {
        personalInfo: {
          name: profile?.full_name || 'User',
          ssn: '***-**-****',
          dateOfBirth: '**/**/****',
          addresses: [
            { type: 'Current', address: '123 Main St, Anytown, ST 12345', since: '2020' },
            { type: 'Previous', address: '456 Oak Ave, Oldtown, ST 67890', since: '2018' }
          ]
        },
        creditAccounts: [
          {
            creditor: 'Oakline Bank Credit Card',
            accountType: 'Credit Card',
            balance: '$2,450',
            creditLimit: '$5,000',
            status: 'Open',
            opened: '01/2022',
            lastPayment: '12/2023'
          },
          {
            creditor: 'Auto Loan - First National',
            accountType: 'Auto Loan',
            balance: '$18,500',
            originalAmount: '$25,000',
            status: 'Open',
            opened: '06/2021',
            lastPayment: '12/2023'
          },
          {
            creditor: 'Student Loan Services',
            accountType: 'Student Loan',
            balance: '$12,300',
            originalAmount: '$20,000',
            status: 'Open',
            opened: '09/2019',
            lastPayment: '12/2023'
          }
        ],
        paymentHistory: {
          onTimePayments: 98,
          totalPayments: 100,
          latePayments: 2,
          missedPayments: 0
        },
        creditInquiries: [
          { date: '11/2023', creditor: 'Oakline Bank', type: 'Soft' },
          { date: '08/2023', creditor: 'Auto Dealer Financing', type: 'Hard' },
          { date: '03/2023', creditor: 'Credit Monitoring Service', type: 'Soft' }
        ]
      };

      setReportData(sampleReportData);
    } catch (error) {
      console.error('Error fetching credit data:', error);
    }
  };

  const getCreditScoreColor = (score) => {
    if (!score || score < 300) return '#94a3b8';
    if (score >= 750) return '#10b981';
    if (score >= 700) return '#3b82f6';
    if (score >= 650) return '#f59e0b';
    if (score >= 600) return '#f97316';
    return '#ef4444';
  };

  const getCreditScoreLabel = (score) => {
    if (!score || score < 300) return 'No Score Available';
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Loading your credit report...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/" style={styles.logoContainer}>
          <div style={styles.logoPlaceholder}>🏦</div>
          <span style={styles.logoText}>Oakline Bank</span>
        </Link>
        <div style={styles.headerInfo}>
          <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Credit Report</h1>
          <p style={styles.subtitle}>Your comprehensive credit overview</p>
        </div>

        <div style={styles.scoreSection}>
          <div style={styles.scoreCard}>
            <div style={styles.scoreHeader}>
              <h2>Credit Score</h2>
              <div style={styles.scoreDate}>
                Updated: {creditScoreData ? formatCreditScoreDate(creditScoreData.updated_at) : 'Never'}
                {creditScoreData && creditScoreData.score_source && (
                  <span style={{ marginLeft: '8px', fontSize: '0.85rem', opacity: 0.8 }}>
                    • Source: {creditScoreData.score_source}
                  </span>
                )}
              </div>
            </div>
            <div style={styles.scoreDisplay}>
              {creditScore ? (
                <>
                  <div 
                    style={{
                      ...styles.scoreNumber,
                      color: getCreditScoreColor(creditScore)
                    }}
                  >
                    {creditScore}
                  </div>
                  <div style={styles.scoreLabel}>
                    {getCreditScoreLabel(creditScore)}
                  </div>
                  <div style={styles.scoreMessage}>
                    {creditScoreData && creditScoreData.score_reason 
                      ? creditScoreData.score_reason 
                      : getCreditScoreMessage(creditScore)}
                  </div>
                </>
              ) : (
                <>
                  <div style={{...styles.scoreNumber, color: '#94a3b8'}}>
                    --
                  </div>
                  <div style={styles.scoreLabel}>
                    No Score Available
                  </div>
                  <div style={styles.scoreMessage}>
                    Your credit score will be available once approved by our admin team. Please check back later.
                  </div>
                </>
              )}
            </div>
            {creditScore && (
              <div style={styles.scoreRange}>
                <span>300</span>
                <div style={styles.scoreBar}>
                  <div 
                    style={{
                      ...styles.scoreProgress,
                      width: `${((creditScore - 300) / (850 - 300)) * 100}%`,
                      backgroundColor: getCreditScoreColor(creditScore)
                    }}
                  />
                </div>
                <span>850</span>
              </div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Factors Affecting Your Score</h3>
          <div style={styles.factorsGrid}>
            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>💳</div>
              <div style={styles.factorInfo}>
                <div style={styles.factorTitle}>Credit Utilization</div>
                <div style={styles.factorValue}>49%</div>
                <div style={styles.factorImpact}>High Impact</div>
              </div>
            </div>
            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>📅</div>
              <div style={styles.factorInfo}>
                <div style={styles.factorTitle}>Payment History</div>
                <div style={styles.factorValue}>98%</div>
                <div style={styles.factorImpact}>Positive</div>
              </div>
            </div>
            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>⏱️</div>
              <div style={styles.factorInfo}>
                <div style={styles.factorTitle}>Credit Age</div>
                <div style={styles.factorValue}>4.2 years</div>
                <div style={styles.factorImpact}>Good</div>
              </div>
            </div>
            <div style={styles.factorCard}>
              <div style={styles.factorIcon}>🔍</div>
              <div style={styles.factorInfo}>
                <div style={styles.factorTitle}>Hard Inquiries</div>
                <div style={styles.factorValue}>1</div>
                <div style={styles.factorImpact}>Low Impact</div>
              </div>
            </div>
          </div>
        </div>

        {reportData && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Credit Accounts</h3>
            <div style={styles.accountsList}>
              {reportData.creditAccounts.map((account, index) => (
                <div key={index} style={styles.accountCard}>
                  <div style={styles.accountHeader}>
                    <div style={styles.accountName}>{account.creditor}</div>
                    <div style={styles.accountStatus}>{account.status}</div>
                  </div>
                  <div style={styles.accountDetails}>
                    <div style={styles.accountRow}>
                      <span>Account Type:</span>
                      <span>{account.accountType}</span>
                    </div>
                    <div style={styles.accountRow}>
                      <span>Balance:</span>
                      <span>{account.balance}</span>
                    </div>
                    {account.creditLimit && (
                      <div style={styles.accountRow}>
                        <span>Credit Limit:</span>
                        <span>{account.creditLimit}</span>
                      </div>
                    )}
                    <div style={styles.accountRow}>
                      <span>Opened:</span>
                      <span>{account.opened}</span>
                    </div>
                    <div style={styles.accountRow}>
                      <span>Last Payment:</span>
                      <span>{account.lastPayment}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reportData && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Payment History</h3>
            <div style={styles.paymentHistoryCard}>
              <div style={styles.paymentStats}>
                <div style={styles.statItem}>
                  <div style={styles.statValue}>{reportData.paymentHistory.onTimePayments}</div>
                  <div style={styles.statLabel}>On-Time Payments</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statValue}>{reportData.paymentHistory.latePayments}</div>
                  <div style={styles.statLabel}>Late Payments</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statValue}>{reportData.paymentHistory.missedPayments}</div>
                  <div style={styles.statLabel}>Missed Payments</div>
                </div>
                <div style={styles.statItem}>
                  <div style={styles.statValue}>
                    {Math.round((reportData.paymentHistory.onTimePayments / reportData.paymentHistory.totalPayments) * 100)}%
                  </div>
                  <div style={styles.statLabel}>On-Time Rate</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {reportData && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Recent Credit Inquiries</h3>
            <div style={styles.inquiriesList}>
              {reportData.creditInquiries.map((inquiry, index) => (
                <div key={index} style={styles.inquiryItem}>
                  <div style={styles.inquiryDate}>{inquiry.date}</div>
                  <div style={styles.inquiryCreditor}>{inquiry.creditor}</div>
                  <div style={styles.inquiryType}>{inquiry.type} Inquiry</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Ways to Improve Your Score</h3>
          <div style={styles.tipsList}>
            <div style={styles.tip}>
              <div style={styles.tipIcon}>💡</div>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Lower Your Credit Utilization</div>
                <div style={styles.tipDescription}>
                  Keep your credit card balances below 30% of your credit limits
                </div>
              </div>
            </div>
            <div style={styles.tip}>
              <div style={styles.tipIcon}>📅</div>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Make All Payments On Time</div>
                <div style={styles.tipDescription}>
                  Payment history is the most important factor in your credit score
                </div>
              </div>
            </div>
            <div style={styles.tip}>
              <div style={styles.tipIcon}>⏳</div>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Keep Old Accounts Open</div>
                <div style={styles.tipDescription}>
                  Longer credit history helps improve your credit score
                </div>
              </div>
            </div>
            <div style={styles.tip}>
              <div style={styles.tipIcon}>🎯</div>
              <div style={styles.tipContent}>
                <div style={styles.tipTitle}>Limit New Credit Applications</div>
                <div style={styles.tipDescription}>
                  Too many hard inquiries can temporarily lower your score
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.disclaimer}>
          <h4 style={styles.disclaimerTitle}>Important Notice</h4>
          <p style={styles.disclaimerText}>
            Credit scores displayed are based on your banking activity and loan repayment history with Oakline Bank. 
            All credit scores are reviewed and approved by our admin team before being displayed. 
            This is a simulated credit report for demonstration purposes. In a real banking application, 
            credit data would be obtained from authorized credit bureaus such as Experian, Equifax, or TransUnion. 
            Always obtain your official credit report from annualcreditreport.com or directly from the credit bureaus.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'inherit'
  },
  logoPlaceholder: {
    fontSize: '2rem',
    marginRight: '0.5rem'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  backButton: {
    color: '#6366f1',
    textDecoration: 'none',
    fontSize: '0.9rem'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2.5rem',
    color: '#1e293b',
    marginBottom: '0.5rem',
    fontWeight: '700'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  scoreSection: {
    marginBottom: '3rem'
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  scoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  scoreDate: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  scoreDisplay: {
    marginBottom: '2rem'
  },
  scoreNumber: {
    fontSize: '4rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  scoreLabel: {
    fontSize: '1.2rem',
    color: '#64748b',
    fontWeight: '500'
  },
  scoreMessage: {
    fontSize: '0.95rem',
    color: '#475569',
    marginTop: '1rem',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '1rem auto 0'
  },
  scoreRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: '#64748b'
  },
  scoreBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden'
  },
  scoreProgress: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease'
  },
  section: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '1.5rem',
    fontWeight: '600'
  },
  factorsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  factorCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  factorIcon: {
    fontSize: '2rem'
  },
  factorInfo: {
    flex: 1
  },
  factorTitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  factorValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  factorImpact: {
    fontSize: '0.8rem',
    color: '#059669',
    fontWeight: '500'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  accountName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  accountStatus: {
    fontSize: '0.9rem',
    color: '#059669',
    fontWeight: '500'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#64748b'
  },
  paymentHistoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  paymentStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '2rem',
    textAlign: 'center'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  statLabel: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  inquiriesList: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  inquiryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.9rem'
  },
  inquiryDate: {
    color: '#64748b',
    fontWeight: '500'
  },
  inquiryCreditor: {
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center'
  },
  inquiryType: {
    color: '#6366f1',
    fontWeight: '500'
  },
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  tip: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  tipIcon: {
    fontSize: '1.5rem'
  },
  tipContent: {
    flex: 1
  },
  tipTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  tipDescription: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  disclaimer: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '1.5rem',
    marginTop: '2rem'
  },
  disclaimerTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '0.5rem'
  },
  disclaimerText: {
    fontSize: '0.9rem',
    color: '#92400e',
    lineHeight: '1.6',
    margin: 0
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  loading: {
    fontSize: '1.2rem',
    color: '#64748b'
  }
};
