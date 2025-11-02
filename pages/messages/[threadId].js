
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Header from '../../components/Header';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function ChatThread() {
  const router = useRouter();
  const { threadId } = router.query;
  const [user, setUser] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (threadId) {
      checkUserAndFetchData();
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !user) return;

    // Subscribe to new messages
    const subscription = supabase
      .channel(`chat_messages_${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
        markMessagesAsRead();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_threads',
        filter: `id=eq.${threadId}`
      }, (payload) => {
        setThread(payload.new);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [threadId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        router.push('/sign-in');
        return;
      }

      setUser(session.user);

      await fetchThread(session.user);
      await fetchMessages();
      await markMessagesAsRead();

    } catch (error) {
      console.error('Error in checkUserAndFetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (user) => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Thread not found:', error);
        router.push('/messages');
        return;
      }

      setThread(data);
    } catch (error) {
      console.error('Error fetching thread:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('thread_id', threadId)
        .neq('sender_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user.id,
          message: newMessage
        });

      if (messageError) throw messageError;

      // Update thread's last message
      await supabase
        .from('chat_threads')
        .update({
          last_message: newMessage,
          last_message_at: new Date().toISOString(),
          status: 'open'
        })
        .eq('id', threadId);

      setNewMessage('');

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading conversation...</p>
      </div>
    );
  }

  if (!thread) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{thread.subject} - Messages - Oakline Bank</title>
        <meta name="description" content="Chat with Oakline Bank support" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <Header />
        
        <main style={styles.main}>
          <div style={styles.header}>
            <button 
              onClick={() => router.push('/messages')}
              style={styles.backButton}
            >
              ← Back to Messages
            </button>
          </div>

          <div style={styles.threadHeader}>
            <div>
              <h1 style={styles.threadTitle}>{thread.subject || 'No Subject'}</h1>
              <p style={styles.threadMeta}>
                Started {new Date(thread.created_at).toLocaleDateString()}
              </p>
            </div>
            <span 
              style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(thread.status) + '20',
                color: getStatusColor(thread.status)
              }}
            >
              {thread.status.charAt(0).toUpperCase() + thread.status.slice(1)}
            </span>
          </div>

          <div style={styles.messagesContainer}>
            <div style={styles.messagesList}>
              {messages.map((message) => (
                <div 
                  key={message.id}
                  style={{
                    ...styles.messageWrapper,
                    justifyContent: message.sender_id === user.id ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      ...styles.message,
                      ...(message.sender_id === user.id ? styles.userMessage : styles.adminMessage)
                    }}
                  >
                    <div style={styles.messageText}>{message.message}</div>
                    <div style={styles.messageTime}>
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div style={styles.inputContainer}>
            <div style={styles.inputWrapper}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message... (Press Enter to send)"
                style={styles.messageInput}
                disabled={sending || thread.status === 'closed'}
                rows="3"
              />
              <button 
                onClick={handleSendMessage} 
                style={{
                  ...styles.sendButton,
                  opacity: newMessage.trim() && thread.status !== 'closed' ? 1 : 0.5,
                  cursor: newMessage.trim() && thread.status !== 'closed' ? 'pointer' : 'default'
                }}
                disabled={!newMessage.trim() || sending || thread.status === 'closed'}
              >
                {sending ? '⏳' : '➤'}
              </button>
            </div>
            {thread.status === 'closed' && (
              <p style={styles.closedNotice}>
                This conversation has been closed. Please start a new conversation if you need further assistance.
              </p>
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
  main: {
    padding: '1rem',
    maxWidth: '900px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 80px)'
  },
  header: {
    marginBottom: '1rem'
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: '#1e40af',
    fontWeight: '500',
    padding: '0.5rem 0'
  },
  threadHeader: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem'
  },
  threadTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  threadMeta: {
    margin: 0,
    fontSize: '0.85rem',
    color: '#64748b'
  },
  statusBadge: {
    padding: '0.3rem 0.7rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column'
  },
  messagesList: {
    flex: 1,
    padding: '1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end'
  },
  message: {
    maxWidth: '70%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: '1.4'
  },
  userMessage: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderBottomRightRadius: '4px'
  },
  adminMessage: {
    backgroundColor: '#f1f5f9',
    color: '#1e293b',
    borderBottomLeftRadius: '4px'
  },
  messageText: {
    marginBottom: '0.25rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },
  messageTime: {
    fontSize: '0.7rem',
    opacity: 0.7,
    textAlign: 'right'
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  inputWrapper: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end'
  },
  messageInput: {
    flex: 1,
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '0.75rem',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'none',
    minHeight: '60px',
    maxHeight: '120px'
  },
  sendButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    width: '48px',
    height: '48px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  closedNotice: {
    marginTop: '0.75rem',
    fontSize: '0.85rem',
    color: '#dc2626',
    textAlign: 'center',
    margin: '0.75rem 0 0 0'
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
  }
};
