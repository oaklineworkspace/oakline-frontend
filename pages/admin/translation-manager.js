
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { SUPPORTED_LANGUAGES } from '../../lib/i18n';

export default function TranslationManager() {
  const [stats, setStats] = useState([]);
  const [cache, setCache] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingOverride, setEditingOverride] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, cacheRes, overridesRes] = await Promise.all([
        supabase.from('translation_stats').select('*').order('total_translations', { ascending: false }),
        supabase.from('translation_cache').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('translation_overrides').select('*').order('created_at', { ascending: false })
      ]);

      setStats(statsRes.data || []);
      setCache(cacheRes.data || []);
      setOverrides(overridesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveOverride = async (override) => {
    try {
      const { error } = await supabase.from('translation_overrides').upsert(override);
      if (error) throw error;
      
      setEditingOverride(null);
      loadData();
      alert('Override saved successfully!');
    } catch (error) {
      console.error('Error saving override:', error);
      alert('Failed to save override');
    }
  };

  const deleteOverride = async (id) => {
    if (!confirm('Are you sure you want to delete this override?')) return;
    
    try {
      await supabase.from('translation_overrides').delete().eq('id', id);
      loadData();
    } catch (error) {
      console.error('Error deleting override:', error);
    }
  };

  const filteredCache = cache.filter(item =>
    item.source_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.translated_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Translation Manager</h1>
          <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
        </div>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{ ...styles.tab, ...(activeTab === 'stats' ? styles.activeTab : {}) }}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('cache')}
          style={{ ...styles.tab, ...(activeTab === 'cache' ? styles.activeTab : {}) }}
        >
          Translation Cache
        </button>
        <button
          onClick={() => setActiveTab('overrides')}
          style={{ ...styles.tab, ...(activeTab === 'overrides' ? styles.activeTab : {}) }}
        >
          Manual Overrides
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'stats' && (
          <div style={styles.statsGrid}>
            <h2 style={styles.sectionTitle}>Translation Statistics by Language</h2>
            {stats.map(stat => (
              <div key={stat.id} style={styles.statCard}>
                <div style={styles.statHeader}>
                  <h3>{stat.language_name}</h3>
                  <span style={styles.statCode}>{stat.language_code}</span>
                </div>
                <div style={styles.statCount}>{stat.total_translations.toLocaleString()} translations</div>
                <div style={styles.statDate}>Last updated: {new Date(stat.last_updated).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cache' && (
          <div>
            <div style={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search translations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Source Text</th>
                    <th>Translated Text</th>
                    <th>Source Lang</th>
                    <th>Target Lang</th>
                    <th>Provider</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCache.map(item => (
                    <tr key={item.id}>
                      <td style={styles.textCell}>{item.source_text}</td>
                      <td style={styles.textCell}>{item.translated_text}</td>
                      <td>{item.source_language}</td>
                      <td>{item.target_language}</td>
                      <td>{item.provider}</td>
                      <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'overrides' && (
          <div>
            <button
              onClick={() => setEditingOverride({ source_text: '', source_language: 'en', target_language: '', override_text: '' })}
              style={styles.addButton}
            >
              + Add New Override
            </button>
            
            {editingOverride && (
              <div style={styles.modal}>
                <div style={styles.modalContent}>
                  <h3>Translation Override</h3>
                  <input
                    type="text"
                    placeholder="Source Text"
                    value={editingOverride.source_text}
                    onChange={(e) => setEditingOverride({ ...editingOverride, source_text: e.target.value })}
                    style={styles.input}
                  />
                  <select
                    value={editingOverride.target_language}
                    onChange={(e) => setEditingOverride({ ...editingOverride, target_language: e.target.value })}
                    style={styles.input}
                  >
                    <option value="">Select Target Language</option>
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
                      <option key={code} value={code}>{info.name}</option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Override Translation"
                    value={editingOverride.override_text}
                    onChange={(e) => setEditingOverride({ ...editingOverride, override_text: e.target.value })}
                    style={{ ...styles.input, minHeight: '100px' }}
                  />
                  <div style={styles.modalButtons}>
                    <button onClick={() => saveOverride(editingOverride)} style={styles.saveButton}>Save</button>
                    <button onClick={() => setEditingOverride(null)} style={styles.cancelButton}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            
            <div style={styles.overridesList}>
              {overrides.map(override => (
                <div key={override.id} style={styles.overrideCard}>
                  <div style={styles.overrideHeader}>
                    <strong>{override.source_language} → {override.target_language}</strong>
                    <button onClick={() => deleteOverride(override.id)} style={styles.deleteButton}>Delete</button>
                  </div>
                  <div style={styles.overrideText}>
                    <div>Source: {override.source_text}</div>
                    <div>Override: {override.override_text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: '#1a365d',
    padding: '2rem',
    color: 'white'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '2rem',
    margin: 0
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '6px'
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem 2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  },
  tab: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#64748b'
  },
  activeTab: {
    color: '#1e40af',
    borderBottomColor: '#1e40af'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem'
  },
  sectionTitle: {
    gridColumn: '1 / -1',
    fontSize: '1.5rem',
    marginBottom: '1rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  statCode: {
    fontSize: '0.8rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px'
  },
  statCount: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '0.5rem'
  },
  statDate: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  searchContainer: {
    marginBottom: '1rem'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  textCell: {
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '1rem'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '1rem'
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  saveButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#e2e8f0',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  overridesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  overrideCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  overrideHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem'
  },
  overrideText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.6'
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  }
};
