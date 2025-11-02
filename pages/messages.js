
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Messages() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('chat_threads_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_threads',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchThreads(user);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      await fetchThreads(session.user);

    } catch (error) {
      console.error('Error in checkUserAndFetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreads = async (user) => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        setThreads(data);
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadSubject.trim() || !newThreadMessage.trim() || creating) return;

    setCreating(true);
    try {
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .insert({
          user_id: user.id,
          subject: newThreadSubject,
          status: 'open',
          last_message: newThreadMessage,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (threadError) throw threadError;

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: thread.id,
          sender_id: user.id,
          message: newThreadMessage
        });

      if (messageError) throw messageError;

      setNewThreadSubject('');
      setNewThreadMessage('');
      setShowNewThread(false);

      router.push(`/messages/${thread.id}`);

    } catch (error) {
      console.error('Error creating thread:', error);
      alert('Failed to create conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'resolved': return '#3b82f6';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading messages...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.content}>
          <div style={styles.loginPrompt}>
            <h1 style={styles.loginTitle}>Please Log In</h1>
            <p style={styles.loginMessage}>You need to be logged in to view messages</p>
            <a href="/sign-in" style={styles.loginButton}>Go to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Messages - Oakline Bank</title>
        <meta name="description" content="Chat with Oakline Bank support" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <Header />

        <main style={styles.main}>
          <div style={styles.header}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Messages</h1>
              {threads.filter(t => t.status === 'open').length > 0 && (
                <span style={styles.unreadBadge}>
                  {threads.filter(t => t.status === 'open').length}
                </span>
              )}
            </div>
            <button 
              onClick={() => setShowNewThread(!showNewThread)}
              style={styles.newButton}
              disabled={creating}
            >
              {showNewThread ? '✕ Cancel' : '✉ New Conversation'}
            </button>
          </div>

          {showNewThread && (
            <div style={styles.newThreadSection}>
              <div style={styles.newThreadHeader}>
                <h3 style={styles.newThreadTitle}>Start New Conversation</h3>
                <span style={styles.secureIndicator}>🔒 Secure</span>
              </div>
              <input
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
                placeholder="Subject"
                style={styles.input}
                disabled={creating}
              />
              <textarea
                value={newThreadMessage}
                onChange={(e) => setNewThreadMessage(e.target.value)}
                placeholder="Type your message here..."
                style={styles.textarea}
                rows="4"
                disabled={creating}
              />
              <div style={styles.newThreadActions}>
                <button 
                  onClick={handleCreateThread} 
                  style={{
                    ...styles.sendButton,
                    ...(creating ? styles.sendingButton : {})
                  }}
                  disabled={!newThreadSubject.trim() || !newThreadMessage.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Start Conversation'}
                </button>
              </div>
            </div>
          )}

          <div style={styles.threadsContainer}>
            {threads.length > 0 ? (
              <div style={styles.threadsList}>
                {threads.map((thread) => (
                  <div 
                    key={thread.id} 
                    style={styles.threadItem}
                    onClick={() => router.push(`/messages/${thread.id}`)}
                  >
                    <div style={styles.threadHeader}>
                      <div style={styles.threadSubject}>{thread.subject || 'No Subject'}</div>
                      <div style={styles.threadDate}>
                        {new Date(thread.last_message_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={styles.threadPreview}>
                      {thread.last_message?.substring(0, 100)}...
                    </div>
                    <div style={styles.threadFooter}>
                      <span 
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(thread.status) + '20',
                          color: getStatusColor(thread.status)
                        }}
                      >
                        {getStatusLabel(thread.status)}
                      </span>
                      {thread.admin_id && (
                        <span style={styles.assignedLabel}>Assigned to Admin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💬</div>
                <h3 style={styles.emptyTitle}>No Conversations Yet</h3>
                <p style={styles.emptyMessage}>Start a conversation with our support team</p>
                <button 
                  onClick={() => setShowNewThread(true)}
                  style={styles.emptyButton}
                >
                  Start Your First Conversation
                </button>
              </div>
            )}
          </div>
        </main>
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
  content: {
    padding: '2rem 1rem'
  },
  main: {
    padding: '1rem',
    maxWidth: '100%',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 6vw, 2rem)',
    color: '#1e293b',
    margin: 0,
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center'
  },
  newButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem'
  },
  newThreadSection: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  newThreadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  newThreadTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  secureIndicator: {
    fontSize: '0.8rem',
    color: '#059669',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    marginBottom: '0.75rem',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    marginBottom: '0.75rem',
    resize: 'vertical',
    minHeight: '100px',
    lineHeight: '1.5',
    boxSizing: 'border-box'
  },
  newThreadActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  sendButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.85rem',
    flex: '1'
  },
  sendingButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  threadsContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  threadsList: {
    maxHeight: '70vh',
    overflow: 'auto'
  },
  threadItem: {
    padding: '1rem',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  threadHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
    gap: '0.25rem'
  },
  threadSubject: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '0.9rem'
  },
  threadDate: {
    color: '#64748b',
    fontSize: '0.8rem'
  },
  threadPreview: {
    color: '#64748b',
    fontSize: '0.85rem',
    lineHeight: '1.3',
    marginBottom: '0.5rem'
  },
  threadFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  assignedLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    fontStyle: 'italic'
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
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyMessage: {
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  emptyButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem'
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
