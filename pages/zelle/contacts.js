
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleContacts() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      setUser(session.user);
      await fetchContacts(session.user.id);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!newContact.name || (!newContact.email && !newContact.phone)) {
        setMessage('Please provide a name and either email or phone number');
        setLoading(false);
        return;
      }

      // Validate email if provided
      if (newContact.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newContact.email)) {
          setMessage('Please enter a valid email address');
          setLoading(false);
          return;
        }
      }

      // Validate phone if provided
      if (newContact.phone) {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(newContact.phone)) {
          setMessage('Please enter a valid phone number');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('zelle_contacts')
        .insert([{
          user_id: user.id,
          name: newContact.name,
          email: newContact.email || null,
          phone: newContact.phone || null
        }]);

      if (error) throw error;

      setMessage('✅ Contact added successfully!');
      setNewContact({ name: '', email: '', phone: '' });
      setShowAddForm(false);
      await fetchContacts(user.id);

    } catch (error) {
      console.error('Error adding contact:', error);
      setMessage('Error adding contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('zelle_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setMessage('✅ Contact deleted successfully!');
      await fetchContacts(user.id);
    } catch (error) {
      console.error('Error deleting contact:', error);
      setMessage('Error deleting contact. Please try again.');
    }
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle Contacts...</p>
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
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to manage Zelle contacts</p>
          <Link href="/sign-in" style={styles.loginButton}>Go to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Manage Contacts - Zelle - Oakline Bank</title>
        <meta name="description" content="Manage your Zelle contacts for quick money transfers" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <Link href="/zelle" style={styles.backButton}>← Back to Zelle</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Manage Contacts</h1>
                <p style={styles.subtitle}>Your trusted Zelle® recipients</p>
              </div>
            </div>
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

          {/* Add Contact Button */}
          <div style={styles.addContactSection}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={styles.addContactButton}
            >
              <span style={styles.addIcon}>+</span>
              Add New Contact
            </button>
          </div>

          {/* Add Contact Form */}
          {showAddForm && (
            <div style={styles.addFormContainer}>
              <form onSubmit={handleAddContact} style={styles.addForm}>
                <h3 style={styles.addFormTitle}>Add New Contact</h3>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter contact name"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div style={styles.formButtons}>
                  <button
                    type="submit"
                    style={styles.saveButton}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Contact'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Contacts List */}
          <div style={styles.contactsSection}>
            <h3 style={styles.contactsTitle}>Your Contacts ({contacts.length})</h3>
            
            {contacts.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>👥</div>
                <h3>No Contacts Yet</h3>
                <p>Add contacts to make Zelle transfers quick and easy</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  style={styles.emptyButton}
                >
                  Add Your First Contact
                </button>
              </div>
            ) : (
              <div style={styles.contactsList}>
                {contacts.map((contact) => (
                  <div key={contact.id} style={styles.contactCard}>
                    <div style={styles.contactAvatar}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.contactInfo}>
                      <h4 style={styles.contactName}>{contact.name}</h4>
                      {contact.email && (
                        <p style={styles.contactDetail}>📧 {contact.email}</p>
                      )}
                      {contact.phone && (
                        <p style={styles.contactDetail}>📱 {contact.phone}</p>
                      )}
                    </div>
                    <div style={styles.contactActions}>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        style={styles.deleteButton}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <Link href="/zelle/send" style={styles.actionButton}>
              <span style={styles.actionIcon}>💸</span>
              Send Money
            </Link>
            <Link href="/zelle/request" style={styles.actionButton}>
              <span style={styles.actionIcon}>💰</span>
              Request Money
            </Link>
            <Link href="/zelle/history" style={styles.actionButton}>
              <span style={styles.actionIcon}>📋</span>
              View History
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)',
    borderBottom: '3px solid #059669'
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
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  content: {
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  addContactSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  addContactButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 2rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: '0 auto',
    boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)'
  },
  addIcon: {
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  addFormContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  addFormTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease'
  },
  formButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  saveButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  contactsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  contactsTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  contactCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  contactAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  contactDetail: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '0.25rem 0'
  },
  contactActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  deleteButton: {
    padding: '0.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  emptyButton: {
    padding: '1rem 2rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#1e293b',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0'
  },
  actionIcon: {
    fontSize: '1.2rem'
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
    borderTop: '3px solid #1A3E6F',
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
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
