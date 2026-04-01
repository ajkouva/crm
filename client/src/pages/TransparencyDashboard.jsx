import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '../components/Icons';
import CustomSelect from '../components/CustomSelect';

const IndiaFlag = () => (
  <svg width="24" height="16" viewBox="0 0 900 600" style={{ borderRadius: '2px' }}>
    <rect width="900" height="200" fill="#FF9933"/>
    <rect width="900" height="200" y="200" fill="#FFFFFF"/>
    <rect width="900" height="200" y="400" fill="#138808"/>
    <circle cx="450" cy="300" r="40" fill="none" stroke="#000080" strokeWidth="2"/>
    {[...Array(24)].map((_, i) => (
      <line key={i} x1="450" y1="300" x2={450 + 40 * Math.sin(i * Math.PI / 12)} y2={300 - 40 * Math.cos(i * Math.PI / 12)} stroke="#000080" strokeWidth="1"/>
    ))}
  </svg>
);

export default function TransparencyDashboard() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all');

  const hostUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

  useEffect(() => {
    fetch(`${hostUrl}/api/analytics/public/complaints`)
      .then(r => r.json())
      .then(setComplaints)
      .catch(() => {});
  }, []);

  const filtered = complaints.filter(c => filter === 'all' || c.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', color: 'var(--text-main)', transition: 'background 0.3s' }}>
      {/* Top Bar */}
      <div className="top-bar" style={{ 
        background: 'var(--bg-sidebar)', color: '#fff', padding: '10px 24px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem',
        flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IndiaFlag />
          <span className="mobile-hide" style={{ fontWeight: 600, letterSpacing: '0.5px' }}>GOVERNMENT OF INDIA • TRANSPARENCY HUB</span>
          <span className="mobile-only" style={{ display: 'none', fontWeight: 600, letterSpacing: '0.5px', fontSize: '0.75rem' }}>TRANSPARENCY HUB</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)',
              width: '28px', height: '28px', borderRadius: '50%', color: '#fff',
              cursor: 'pointer', transition: 'all 0.2s ease', opacity: 0.9
            }}
          >
            {theme === 'light' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
          </button>
          <span className="mobile-hide" style={{ opacity: 0.8 }}>Public Disclosure Portal</span>
        </div>
      </div>

      {/* Sticky Navbar */}
      <nav className="public-nav" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '15px 24px', background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)', flexWrap: 'wrap', gap: '15px'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '32px' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.5px' }}>PS-CRM</span>
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>Home</Link>
          <Link to="/track" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>Track</Link>
          <Link to={user ? "/dashboard" : "/auth"} style={{ 
            background: 'var(--saffron)', color: 'var(--navy)', 
            padding: '8px 18px', borderRadius: 'var(--radius)', 
            fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow)',
            fontSize: '0.85rem'
          }}>
            {user ? 'Dashboard →' : 'Login →'}
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '2.8rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 800 }}>Recent Public Reports</h1>
            <p style={{ color: 'var(--text-mist)', fontSize: '1rem' }}>Open data feed of resolutions. Citizen privacy is strictly maintained.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-mist)' }}>Filter by State:</span>
            <CustomSelect 
              value={filter} 
              onChange={e => setFilter(e.target.value)}
              options={[
                { label: 'All Reports', value: 'all' },
                { label: 'Resolved Only', value: 'resolved' },
                { label: 'Under Review', value: 'in_progress' },
                { label: 'Newly Filed', value: 'new' }
              ]}
              style={{ minWidth: '180px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filtered.map(c => (
            <div key={c.id} className="card fade-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span className={`badge badge-${c.status}`} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.status.replace('_', ' ')}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-mist)', fontWeight: 500 }}>
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px', fontWeight: 700 }}>{c.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '20px', flex: 1, lineHeight: 1.5 }}>
                {c.location || 'Location details redacted'}
              </p>
              
              {/* Rating Section */}
              {c.rating && (
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '12px', background: 'rgba(255,153,51,0.08)', 
                  borderRadius: 'var(--radius)', border: '1px solid rgba(255,153,51,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: c.rating_feedback ? '6px' : '0' }}>
                    <div style={{ color: 'var(--saffron)', fontSize: '1.2rem', letterSpacing: '2px' }}>
                      {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                      {['', 'Poor', 'Fair', 'Average', 'Good', 'Excellent'][c.rating]}
                    </span>
                  </div>
                  {c.rating_feedback && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic', margin: 0, opacity: 0.9 }}>
                      "{c.rating_feedback}"
                    </p>
                  )}
                </div>
              )}
              
              {c.media_urls && c.media_urls.length > 0 && (
                <div style={{ marginBottom: '20px', borderRadius: 'var(--radius)', overflow: 'hidden', height: '160px', background: 'var(--bg-body)', border: '1px solid var(--border-color)' }}>
                  {c.media_urls[0].match(/\.(mp4|mov)$/i) ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontSize: '0.8rem' }}>Video Evidence Attached</div>
                  ) : (
                    <img src={`${hostUrl}${c.media_urls[0]}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Public Evidence" />
                  )}
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.category}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, opacity: 0.8 }}>Citizen #{c.id.toString().slice(-4)}</div>
              </div>
            </div>
          ))}
        </div>
        
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-mist)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
            <div style={{ marginBottom: '16px', color: 'var(--text-mist)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p style={{ fontWeight: 600 }}>No reports found matching this filter.</p>
          </div>
        )}
      </div>

      <footer style={{ padding: '60px 24px', background: 'var(--bg-sidebar)', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '80px' }}>
          <p style={{ fontSize: '0.8rem' }}>© 2026 Smart Public Service CRM • Transparency Initiative</p>
      </footer>
      <style>{`
        .mobile-hide { display: inline; }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-only { display: inline !important; }
          .public-nav { padding: 12px 16px !important; justify-content: center !important; }
          .top-bar { justify-content: space-between !important; text-align: left; }
        }
      `}</style>
    </div>
  );
}


