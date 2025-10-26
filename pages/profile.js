
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await Promise.all([
        fetchUserProfile(user.id),
        fetchUserAccounts(user.id),
        fetchApplicationData(user.id)
      ]);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      // Fetch from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      if (profileData) {
        setUserProfile(profileData);
        setEditData(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserAccounts = async (userId) => {
    try {
      // Try multiple approaches to find user accounts
      let accountsData = [];
      
      // Method 1: Direct user_id match
      const { data: directAccounts, error: directError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (directAccounts && directAccounts.length > 0) {
        accountsData = directAccounts;
      } else {
        // Method 2: Try by email
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: emailAccounts, error: emailError } = await supabase
            .from('accounts')
            .select('*')
            .or(`user_email.eq.${user.email},email.eq.${user.email}`)
            .order('created_at', { ascending: false });

          if (emailAccounts && emailAccounts.length > 0) {
            accountsData = emailAccounts;
          } else {
            // Method 3: Try through application_id
            const { data: applications, error: appError } = await supabase
              .from('applications')
              .select('id')
              .eq('email', user.email);

            if (applications && applications.length > 0) {
              const { data: appAccounts, error: appAccountsError } = await supabase
                .from('accounts')
                .select('*')
                .in('application_id', applications.map(app => app.id))
                .order('created_at', { ascending: false });

              if (appAccounts) {
                accountsData = appAccounts;
              }
            }
          }
        }
      }

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  const fetchApplicationData = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('application_id')
        .eq('id', userId)
        .single();

      if (profile?.application_id) {
        const { data: appData, error } = await supabase
          .from('applications')
          .select('*')
          .eq('id', profile.application_id)
          .single();

        if (appData && !error) {
          setApplication(appData);
        }
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      let profilePictureUrl = null;
      
      // Upload profile picture if selected
      if (profilePicture) {
        profilePictureUrl = await uploadProfilePicture();
      }

      if (userProfile?.id) {
        const updateData = {
          phone: editData.phone,
          address: editData.address,
          city: editData.city,
          state: editData.state,
          zip_code: editData.zip_code,
          updated_at: new Date().toISOString()
        };

        if (profilePictureUrl) {
          updateData.profile_picture = profilePictureUrl;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userProfile.id);

        if (error) throw error;
        
        setUserProfile({ ...userProfile, ...updateData });
        setEditMode(false);
        setProfilePicture(null);
        setMessage('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => total + parseFloat(account.balance || 0), 0);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setProfilePicture(file);
    } else {
      setMessage('Please select a valid image file');
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) return null;

    setUploadingPicture(true);
    try {
      const fileExt = profilePicture.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, profilePicture, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessage('Failed to upload profile picture');
      return null;
    } finally {
      setUploadingPicture(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Mobile-optimized header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>My Profile</h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <div style={styles.headerActions}>
          <button 
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {message && (
        <div style={styles.message}>{message}</div>
      )}

      {/* Personal Information Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Personal Information</h2>
          {!editMode && userProfile && (
            <button 
              style={styles.editButton}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleUpdateProfile} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Profile Picture</label>
                <div style={styles.profilePictureSection}>
                  {(userProfile?.profile_picture || profilePicture) && (
                    <div style={styles.currentPicture}>
                      <img 
                        src={profilePicture ? URL.createObjectURL(profilePicture) : userProfile.profile_picture} 
                        alt="Profile" 
                        style={styles.profileImage}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    style={styles.fileInput}
                  />
                  {uploadingPicture && <p style={styles.uploadingText}>Uploading...</p>}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  style={styles.input}
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({...editData, phone: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  style={styles.input}
                  value={editData.address || ''}
                  onChange={(e) => setEditData({...editData, address: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>City</label>
                <input
                  type="text"
                  style={styles.input}
                  value={editData.city || ''}
                  onChange={(e) => setEditData({...editData, city: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>State</label>
                <input
                  type="text"
                  style={styles.input}
                  value={editData.state || ''}
                  onChange={(e) => setEditData({...editData, state: e.target.value})}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ZIP Code</label>
                <input
                  type="text"
                  style={styles.input}
                  value={editData.zip_code || ''}
                  onChange={(e) => setEditData({...editData, zip_code: e.target.value})}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton}>Save</button>
              <button 
                type="button" 
                style={styles.cancelButton}
                onClick={() => {
                  setEditMode(false);
                  setEditData(userProfile || {});
                  setProfilePicture(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.infoGrid}>
            {userProfile?.profile_picture && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Profile Picture</span>
                <div style={styles.profilePictureDisplay}>
                  <img 
                    src={userProfile.profile_picture} 
                    alt="Profile" 
                    style={styles.profileImageDisplay}
                  />
                </div>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Full Name</span>
              <span style={styles.infoValue}>
                {userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() : 'N/A'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{userProfile?.email || user?.email || 'N/A'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Phone</span>
              <span style={styles.infoValue}>{userProfile?.phone || 'N/A'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Date of Birth</span>
              <span style={styles.infoValue}>{formatDate(userProfile?.date_of_birth)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Address</span>
              <span style={styles.infoValue}>
                {userProfile?.address ? 
                  `${userProfile.address}, ${userProfile.city}, ${userProfile.state} ${userProfile.zip_code}` : 
                  'N/A'
                }
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Member Since</span>
              <span style={styles.infoValue}>{formatDate(userProfile?.created_at)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Account Status</span>
              <span style={{...styles.infoValue, color: userProfile?.status === 'active' ? '#10b981' : '#f59e0b'}}>
                {userProfile?.status ? userProfile.status.charAt(0).toUpperCase() + userProfile.status.slice(1) : 'Pending'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Country</span>
              <span style={styles.infoValue}>{userProfile?.country || 'N/A'}</span>
            </div>
            {userProfile?.middle_name && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Middle Name</span>
                <span style={styles.infoValue}>{userProfile.middle_name}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Summary Card */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Account Summary</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Accounts</span>
            <span style={styles.summaryValue}>{accounts.length}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Balance</span>
            <span style={styles.summaryValueLarge}>{formatCurrency(getTotalBalance())}</span>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>My Accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <div style={styles.noAccounts}>
            <p>No accounts found. Please contact support.</p>
          </div>
        ) : (
          <div style={styles.accountsList}>
            {accounts.map(account => (
              <div key={account.id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <h3 style={styles.accountTitle}>
                    {account.account_name || `${account.account_type} Account`}
                  </h3>
                  <span style={styles.accountType}>{account.account_type}</span>
                </div>
                <div style={styles.accountDetails}>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Account Number:</span>
                    <span style={styles.accountValue}>****{account.account_number?.slice(-4)}</span>
                  </div>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Balance:</span>
                    <span style={styles.accountBalance}>
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                  <div style={styles.accountRow}>
                    <span style={styles.accountLabel}>Status:</span>
                    <span style={{
                      ...styles.accountValue,
                      color: account.status === 'active' ? '#10b981' : '#ef4444',
                      fontWeight: 'bold'
                    }}>
                      {account.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Security & Settings</h2>
        <div style={styles.securityGrid}>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/security')}
          >
            🔐 Change Password
          </button>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/mfa-setup')}
          >
            🛡️ Two-Factor Auth
          </button>
          <button 
            style={styles.securityButton}
            onClick={() => router.push('/security')}
          >
            🔒 Security Settings
          </button>
          <button 
            style={styles.logoutButton}
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/');
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '0',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '15px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  error: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  message: {
    backgroundColor: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 15px',
    borderRadius: '8px',
    margin: '15px',
    fontSize: '14px'
  },
  card: {
    backgroundColor: 'white',
    margin: '15px',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formGrid: {
    display: 'grid',
    gap: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    width: '100%',
    boxSizing: 'border-box'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px'
  },
  saveButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  infoGrid: {
    display: 'grid',
    gap: '15px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    padding: '15px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '500'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  summaryItem: {
    textAlign: 'center',
    padding: '20px 10px',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px'
  },
  summaryLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '8px',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b'
  },
  summaryValueLarge: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#059669'
  },
  noAccounts: {
    textAlign: 'center',
    padding: '30px',
    color: '#64748b'
  },
  accountsList: {
    display: 'grid',
    gap: '15px'
  },
  accountCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '15px',
    backgroundColor: '#fafafa'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '8px'
  },
  accountTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  accountType: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  accountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #e2e8f0'
  },
  accountLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500'
  },
  accountValue: {
    fontSize: '13px',
    color: '#1e293b',
    fontWeight: '500'
  },
  accountBalance: {
    fontSize: '14px',
    color: '#059669',
    fontWeight: 'bold'
  },
  securityGrid: {
    display: 'grid',
    gap: '10px'
  },
  securityButton: {
    padding: '15px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left'
  },
  logoutButton: {
    padding: '15px',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'white',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s'
  },
  profilePictureSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  currentPicture: {
    alignSelf: 'flex-start'
  },
  profileImage: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0'
  },
  fileInput: {
    padding: '8px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  uploadingText: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  profilePictureDisplay: {
    marginTop: '5px'
  },
  profileImageDisplay: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e2e8f0'
  }
};
