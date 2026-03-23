import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  new: 'var(--text-main)',
  assigned: 'var(--saffron)',
  in_progress: '#2196f3',
  resolved: 'var(--green-india, #008221)',
  closed: 'var(--text-mist)',
  escalated: 'var(--red)'
};

export default function TrackComplaint() {
  const { user } = useAuth();
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
      setError(err.message || 'Complaint not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <Link to={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', textDecoration: 'none', marginBottom: '32px', fontWeight: 600 }}>
          ← Back to {user ? 'Dashboard' : 'Home'}
        </Link>

        <div className="card" style={{ padding: '40px', textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="PS-CRM" style={{ height: '72px' }} />
          <h1 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '2rem', color: 'var(--text-main)', marginBottom: '8px' }}>Track Your Complaint</h1>
          <p style={{ color: 'var(--text-mist)', marginBottom: '32px' }}>Enter your ticket ID (e.g., CMP-XXXX) to view current status and history.</p>

          <form onSubmit={handleTrack} style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              placeholder={t('track.placeholder', { defaultValue: 'Enter Ticket ID...' })}
              value={ticketId}
              onChange={e => setTicketId(e.target.value)}
              style={{ flex: '1 1 200px', textTransform: 'uppercase' }}
              disabled={loading}
            />
            <button className="btn btn-primary" disabled={loading || !ticketId.trim()} style={{ flex: '1 1 100px', justifyContent: 'center' }}>
              {loading ? t('common.searching', { defaultValue: 'Searching...' }) : t('track.btn', { defaultValue: 'Track' })}
            </button>
          </form>
          {error && <p style={{ color: 'var(--red)', marginTop: '16px', fontSize: '0.9rem' }}>{error}</p>}
        </div>

        {complaint && (
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontFamily: 'Rajdhani,sans-serif', margin: 0, color: 'var(--text-main)' }}>{complaint.ticketId}</h2>
                <div style={{ color: 'var(--text-mist)', fontSize: '0.9rem' }}>{complaint.category} • {complaint.departmentName}</div>
              </div>
              <div style={{ 
                background: STATUS_COLORS[complaint.status] || 'var(--navy)', 
                color: '#fff', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                {complaint.status.replace('_', ' ')}
              </div>
            </div>

            <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', marginBottom: '24px' }}>Timeline History</h3>
            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '0', width: '2px', background: 'var(--fog)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {complaint.history?.map((h, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      left: '-32px', 
                      top: '4px', 
                      width: '16px', 
                      height: '16px', 
                      borderRadius: '50%', 
                      background: i === 0 ? 'var(--navy)' : '#fff', 
                      border: `2px solid ${STATUS_COLORS[h.status] || 'var(--navy)'}`,
                      zIndex: 1
                    }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {h.status.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-mist)', marginBottom: '8px' }}>
                      {new Date(h.createdAt).toLocaleString()}
                    </div>
                    {h.note && (
                      <div style={{ background: 'var(--bg-body)', padding: '12px', borderRadius: 'var(--radius)', fontSize: '0.85rem', color: 'var(--text-dim)', border: '1px solid var(--border-color)' }}>
                        {h.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {complaint.status === 'resolved' && complaint.resolvedMediaUrls?.length > 0 && (
              <div style={{ marginTop: '40px', padding: '24px', background: 'var(--green-dim)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ color: 'var(--green-india)', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 700 }}>RESOLUTION EVIDENCE</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                   {complaint.resolvedMediaUrls.map((url, idx) => {
                     const host = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
                     return (
                       <img key={idx} src={`${host}${url}`} alt="Resolution" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '2px solid white' }} />
                     )
                   })}
                </div>
              </div>
            )}

            {/* Citizen satisfaction rating — shown publicly once submitted */}
            {complaint.rating && (
              <div style={{ marginTop: '32px', padding: '20px', background: 'linear-gradient(135deg, #fffbf2, #fff)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--mist)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Citizen Satisfaction
                </div>
                <div style={{ fontSize: '1.8rem', letterSpacing: '4px', color: 'var(--saffron)', lineHeight: 1 }}>
                  {'★'.repeat(complaint.rating)}{'☆'.repeat(5 - complaint.rating)}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-2)', marginTop: '6px' }}>
                  {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][complaint.rating]}
                </div>
                {complaint.ratingFeedback && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--snow)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--ink-2)', fontStyle: 'italic', border: '1px solid var(--fog)' }}>
                    "{complaint.ratingFeedback}"
                  </div>
                )}
              </div>
            )}

            {/* Appeal Status — public view */}
            {complaint.isAppealed && (
              <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--red)', marginTop: '2px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    Citizen Appeal Filed — Escalated
                  </div>
                  {complaint.appealReason && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      "{complaint.appealReason}"
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
