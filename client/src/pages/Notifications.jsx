import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

import React from 'react';

const TYPE_CONFIG = {
  created: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    color: '#3498db', bgColor: 'rgba(52, 152, 219, 0.15)'
  },
  assigned: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    color: '#9b59b6', bgColor: 'rgba(155, 89, 182, 0.15)'
  },
  update: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
    color: '#f39c12', bgColor: 'rgba(243, 156, 18, 0.15)'
  },
  resolved: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    color: '#2ecc71', bgColor: 'rgba(46, 204, 113, 0.15)'
  },
  escalated: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    color: '#e74c3c', bgColor: 'rgba(231, 76, 60, 0.15)'
  },
  escalation: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    color: '#e74c3c', bgColor: 'rgba(231, 76, 60, 0.15)'
  },
  closed: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    color: '#95a5a6', bgColor: 'rgba(149, 165, 166, 0.15)'
  },
  default: {
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
    color: '#3498db', bgColor: 'rgba(52, 152, 219, 0.15)'
  }
};

function timeAgo(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notifications({ onRead }) {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.notifications().then(setNotifs).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await api.markRead(id).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    onRead?.();
  };

  const markAll = async () => {
    await api.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    onRead?.();
  };

  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    if (n.complaintId) navigate(`/complaints/${n.complaintId}`);
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'All caught up'}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAll} style={{ marginTop: '4px' }}>Mark all as read</button>
        )}
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: '720px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-mist)' }}>Loading…</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-mist)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
              </div>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)', fontSize: '1.1rem' }}>No notifications yet</div>
              <div style={{ fontSize: '0.9rem' }}>You'll be notified when something needs your attention.</div>
            </div>
          ) : notifs.map(n => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
            return (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                cursor: n.complaintId ? 'pointer' : 'default',
                background: n.read ? 'transparent' : 'var(--bg-card-hover)',
                transition: 'all 0.2s ease',
                opacity: n.read ? 0.75 : 1
              }}
              onClick={() => handleClick(n)}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? 'transparent' : 'var(--bg-card-hover)'; }}
            >
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '50%',
                background: config.bgColor, color: config.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {React.cloneElement(config.icon, { width: 20, height: 20 })}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4, fontWeight: n.read ? 400 : 500 }}>
                  {n.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-mist)', marginTop: '4px', fontWeight: 500 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--saffron)', flexShrink: 0, boxShadow: '0 0 8px var(--saffron)', marginTop: '2px' }} />}
            </div>
          )})}
        </div>
      </div>
    </div>
  );
}
