import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';

const STATUS_META = {
  new:                { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'New',           icon: '🆕' },
  assigned:           { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Assigned',       icon: '👤' },
  in_progress:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'In Progress',    icon: '⚙️' },
  pending_escalation: { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  label: 'Pending Review', icon: '⏳' },
  escalated:          { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Escalated',      icon: '🚨' },
  resolved:           { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Resolved',       icon: '✅' },
  closed:             { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Closed',         icon: '🔒' },
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

export default function TrackComplaint() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [ticketId, setTicketId] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setLoading(true); setError(''); setComplaint(null);
    try {
      const resp = await api.trackPublicComplaint(ticketId.trim());
      setComplaint(resp);
    } catch (err) {
      setError(err.message || 'Complaint not found. Check the ticket ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  const meta = complaint ? (STATUS_META[complaint.status] || STATUS_META.new) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Decorative top strip */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #FF9933 33%, #fff 33%, #fff 66%, #138808 66%)' }} />

      {/* Header bar */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)',
        padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Link to={user ? '/dashboard' : '/'} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-dim)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem',
          transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--saffron)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          {user ? 'Back to Dashboard' : 'Back to Home'}
        </Link>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-mist)' }}>
          Public Tracking Portal
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 20px' }}>

        {/* Search card */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)',
          marginBottom: '32px',
        }}>
          {/* Card header gradient */}
          <div style={{
            background: 'linear-gradient(135deg, #0a2240 0%, #1a4a80 50%, #0a2240 100%)',
            padding: '40px 40px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {/* Decorative orbs */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,153,51,0.08)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(19,136,8,0.08)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Icon */}
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(255,153,51,0.15)', border: '2px solid rgba(255,153,51,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                Track Your Complaint
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Enter your Ticket ID (e.g., <span style={{ color: '#FF9933', fontWeight: 700 }}>CMP-XXXX</span>) to view live status and history
              </p>
            </div>
          </div>

          {/* Search form */}
          <div style={{ padding: '32px 40px 40px' }}>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-mist)', pointerEvents: 'none',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g. CMP-2025-001234"
                  value={ticketId}
                  onChange={e => setTicketId(e.target.value.toUpperCase())}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '14px 16px 14px 44px',
                    fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '1rem',
                    letterSpacing: '1px', textTransform: 'uppercase',
                    background: 'var(--bg-body)', color: 'var(--text-main)',
                    border: '2px solid var(--border-color)', borderRadius: '12px',
                    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#FF9933'; e.target.style.boxShadow = '0 0 0 4px rgba(255,153,51,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !ticketId.trim()}
                style={{
                  padding: '14px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: loading || !ticketId.trim() ? 'var(--border-color)' : 'var(--saffron)',
                  color: loading || !ticketId.trim() ? 'var(--text-mist)' : '#0a192f',
                  fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap',
                  transition: 'all 0.2s', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.5px',
                }}
                onMouseEnter={e => { if (!loading && ticketId.trim()) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(255,153,51,0.4)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Searching
                  </span>
                ) : 'Track →'}
              </button>
            </form>

            {error && (
              <div style={{
                marginTop: '16px', padding: '14px 18px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: '0.875rem', display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Result card */}
        {complaint && meta && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid var(--border-color)',
            animation: 'fadeSlideUp 0.4s ease-out',
          }}>
            {/* Status banner */}
            <div style={{
              padding: '24px 32px', background: meta.bg,
              borderBottom: `3px solid ${meta.color}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: meta.color, marginBottom: '4px' }}>
                  Current Status
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', fontWeight: 900, color: meta.color, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{meta.icon}</span> {meta.label}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Ticket ID</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)', letterSpacing: '1px' }}>{complaint.ticketId}</div>
              </div>
            </div>

            {/* Info strip */}
            <div style={{ padding: '16px 32px', background: 'var(--bg-body)', display: 'flex', gap: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)' }}>
              {[
                { label: 'Category', value: complaint.category },
                { label: 'Department', value: complaint.departmentName },
                { label: 'Priority', value: complaint.priority },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-mist)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{item.value || '—'}</div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ padding: '28px 32px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-mist)', marginBottom: '24px' }}>
                Timeline History
              </div>
              <div style={{ position: 'relative', paddingLeft: '36px' }}>
                <div style={{ position: 'absolute', left: '10px', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(180deg, var(--saffron) 0%, var(--border-color) 100%)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {complaint.history?.map((h, i) => {
                    const hMeta = STATUS_META[h.status] || STATUS_META.new;
                    return (
                      <div key={i} style={{ position: 'relative', animation: `fadeSlideUp 0.3s ease-out ${i * 0.08}s both` }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: '-36px', top: '4px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: i === 0 ? hMeta.color : 'var(--bg-card)',
                          border: `3px solid ${hMeta.color}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: i === 0 ? `0 0 12px ${hMeta.color}66` : 'none',
                          fontSize: '8px',
                        }}>
                          {i === 0 && <span style={{ color: '#fff' }}>●</span>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: h.note ? '10px' : 0, flexWrap: 'wrap' }}>
                          <div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', background: hMeta.bg, color: hMeta.color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {hMeta.icon} {hMeta.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-mist)', whiteSpace: 'nowrap' }}>
                            {timeAgo(h.createdAt)} · {new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        {h.note && (
                          <div style={{
                            padding: '12px 16px', borderRadius: '10px',
                            background: 'var(--bg-body)', border: '1px solid var(--border-color)',
                            fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.6,
                          }}>
                            {h.note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Resolution Evidence */}
            {complaint.status === 'resolved' && complaint.resolvedMediaUrls?.length > 0 && (
              <div style={{ margin: '0 32px 28px', padding: '20px', background: 'rgba(34,197,94,0.06)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: '#22c55e', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✅ Resolution Evidence
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {complaint.resolvedMediaUrls.map((url, idx) => {
                    const host = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '').replace(/\/api$/, '');
                    const fullUrl = url.startsWith('http') ? url : `${host}${url}`;
                    return <img key={idx} src={fullUrl} alt="Resolution" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid rgba(34,197,94,0.3)' }} />;
                  })}
                </div>
              </div>
            )}

            {/* Rating */}
            {complaint.rating && (
              <div style={{ margin: '0 32px 28px', padding: '20px', background: 'var(--saffron-dim)', borderRadius: '12px', border: '1px solid rgba(255,153,51,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-mist)', marginBottom: '10px' }}>Citizen Satisfaction</div>
                <div style={{ fontSize: '2rem', letterSpacing: '6px', color: 'var(--saffron)' }}>
                  {'★'.repeat(complaint.rating)}{'☆'.repeat(5 - complaint.rating)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '6px', fontWeight: 600 }}>
                  {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][complaint.rating]}
                </div>
                {complaint.ratingFeedback && (
                  <div style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-mist)' }}>"{complaint.ratingFeedback}"</div>
                )}
              </div>
            )}

            {/* Appeal */}
            {complaint.isAppealed && (
              <div style={{ margin: '0 32px 28px', padding: '16px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', fontSize: '1.2rem', flexShrink: 0 }}>🚨</span>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Appeal Filed · Escalated</div>
                  {complaint.appealReason && <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>"{complaint.appealReason}"</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
