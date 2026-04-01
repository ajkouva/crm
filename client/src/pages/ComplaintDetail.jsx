import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CustomSelect from '../components/CustomSelect';
import { api } from '../utils/api';
import useAuthStore from '../store/useAuthStore';

const AlertIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const ClipboardIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>;
const ZapIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>;
const UserIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CheckCircleIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>;
const PlayIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="teal" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const ClockIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const NEXT_STATUS = {
  new:                ['assigned', 'in_progress'],
  assigned:           ['in_progress', 'pending_escalation'],
  in_progress:        ['resolved', 'pending_escalation', 'escalated'],
  pending_escalation: ['escalated', 'in_progress'],
  escalated:          ['in_progress', 'resolved'],
};

const STATUS_LABELS = {
  new: 'New', assigned: 'Assigned', in_progress: 'In Progress',
  pending_escalation: 'Pending Escalation', escalated: 'Escalated',
  resolved: 'Resolved', closed: 'Closed'
};

const SLA_COLORS = {
  ok: 'var(--green-india)', warning: '#e65100', critical: 'var(--red)',
  breached: 'var(--red)', met: 'var(--mist)'
};

const SLA_LABELS = {
  ok: ' On Track', warning: ' Due Soon', critical: ' Critical',
  breached: ' SLA Breached', met: ' Met'
};

function timeAgo(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function MetaField({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-mist)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: color || 'var(--text-main)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

/**
 * StarRating — shown only to the complaint owner after resolution.
 * Shows a 5-star interactive widget before rating, and a thank-you
 * message with the submitted stars after rating.
 */
function StarRating({ complaintId, existingRating, onRated }) {
  const [hovered, setHovered]   = useState(0);
  const [selected, setSelected] = useState(existingRating || 0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [submitted, setSubmitted] = useState(!!existingRating);

  async function submitRating() {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      await api.rateComplaint(complaintId, { rating: selected, feedback });
      setSubmitted(true);
      onRated && onRated(selected);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Already rated — show read-only stars
  if (submitted) {
    return (
      <div style={{ padding: '16px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Your Rating
        </div>
        <div style={{ fontSize: '1.5rem', letterSpacing: '2px', color: 'var(--saffron)' }}>
          {'★'.repeat(selected)}{'☆'.repeat(5 - selected)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--green-india)', fontWeight: 600, marginTop: '6px' }}>
          Thank you for your feedback!
        </div>
      </div>
    );
  }

  const LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

  return (
    <div style={{ padding: '20px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
        Rate Resolution Quality
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => setSelected(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              fontSize: '2rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: star <= (hovered || selected) ? 'var(--saffron)' : 'var(--border-color)',
              transform: star <= (hovered || selected) ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.15s, color 0.15s',
              padding: '0',
              lineHeight: 1,
            }}
          >
            ★
          </button>
        ))}
      </div>

      {/* Label */}
      {(hovered || selected) > 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--ink-2)', marginBottom: '10px', fontWeight: 500 }}>
          {LABELS[hovered || selected]}
        </div>
      )}

      {/* Optional feedback */}
      {selected > 0 && (
        <>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Optional: Tell us more about your experience..."
            maxLength={500}
            rows={2}
            style={{
              width: '100%', resize: 'vertical', padding: '8px 12px',
              borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
              fontFamily: 'Noto Sans, sans-serif', fontSize: '0.82rem',
              color: 'var(--text-main)', background: 'var(--bg-card)', marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={submitRating}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{ width: '100%' }}
          >
            {loading ? 'Submitting…' : 'Submit Rating'}
          </button>
        </>
      )}
      {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem', marginTop: '6px' }}>{error}</div>}
    </div>
  );
}

/**
 * AppealPanel — shown to the complaint owner after resolution.
 * Allows one appeal per complaint; auto-escalates to P1.
 */
function AppealPanel({ complaintId, isAppealed, appealReason, onAppealed }) {
  const [open, setOpen]     = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) { setError('Please describe why you are unsatisfied.'); return; }
    setLoading(true); setError('');
    try {
      await api.appealComplaint(complaintId, { reason });
      setOpen(false);
      onAppealed && onAppealed();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  // Already appealed — show read-only info
  if (isAppealed) {
    return (
      <div style={{ padding: '16px 20px', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Appeal Filed — Re-escalated to P1
          </div>
          {appealReason && (
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-2)', fontStyle: 'italic' }}>
              "{appealReason}"
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '100%', padding: '12px 20px',
            background: 'rgba(192,57,43,0.06)', border: '1px dashed rgba(192,57,43,0.3)',
            borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--red)',
            fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center',
            gap: '8px', justifyContent: 'center', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
        >
          <AlertIcon size={16} color="var(--red)" />
          <span style={{ marginLeft: '6px' }}>Not satisfied with this resolution? File an Appeal</span>
        </button>
      )}

      {/* Inline appeal form */}
      {open && (
        <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardIcon size={18} color="var(--text-main)" /> File an Appeal
            </div>
            <button onClick={() => { setOpen(false); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-mist)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-mist)', marginBottom: '14px', lineHeight: 1.5 }}>
            Your appeal will <strong>re-escalate</strong> this complaint to <strong>Priority 1</strong> and notify the department head. You can only appeal once.
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why you are unsatisfied with the resolution..."
              maxLength={1000}
              rows={4}
              required
              style={{
                width: '100%', resize: 'vertical', padding: '10px 14px',
                borderRadius: 'var(--radius)', border: '1px solid var(--border-color)',
                fontFamily: 'Noto Sans, sans-serif', fontSize: '0.85rem',
                color: 'var(--text-main)', background: 'var(--bg-body)',
                boxSizing: 'border-box',
              }}
            />
            {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: '#fff', fontWeight: 700, flex: 1, justifyContent: 'center' }}
              >
                {loading ? 'Submitting…' : 'Submit Appeal'}
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(''); }}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [complaint, setComplaint] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [statusNote, setStatusNote] = useState('');
  const [resolvedFile, setResolvedFile] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const refresh = useCallback(() => {
    return api.getComplaint(id).then(setComplaint);
  }, [id]);

  useEffect(() => {
    api.getComplaint(id)
      .then(c => {
        setComplaint(c);
        if (['dept_head', 'collector', 'super_admin'].includes(user?.role)) {
          setSelectedDept(c.departmentId);
          api.getDepartments().then(setDepartments).catch(() => {});
        }
      })
      .catch(() => setError('Complaint not found or access denied'))
      .finally(() => setLoading(false));
  }, [id, user?.role]);

  useEffect(() => {
    if (selectedDept && ['dept_head', 'collector', 'super_admin'].includes(user?.role)) {
      api.getDeptOfficers(selectedDept).then(setOfficers).catch(() => setOfficers([]));
      setSelectedOfficer('');
    }
  }, [selectedDept, user?.role]);

  const updateStatus = async (status) => {
    setStatusError(''); setStatusLoading(true);
    try {
      await api.updateStatus(id, { status, note: statusNote, file: resolvedFile });
      await refresh(); setStatusNote(''); setResolvedFile(null);
    } catch (e) {
      setStatusError(e.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      await api.addComment(id, { text: comment });
      await refresh();
      setComment('');
    } catch (e) {
      alert(e.message);
    } finally {
      setCommentLoading(false);
    }
  };

  const assign = async () => {
    if (!selectedOfficer) return;
    setAssigning(true);
    try {
      await api.assignComplaint(id, { officerId: selectedOfficer });
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setAssigning(false);
    }
  };

  const loadAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const data = await api.getAiSummary(id);
      setAiSummary(data.summary);
    } catch {
      setAiSummary('Unable to generate summary at this time.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--mist)' }}>Loading complaint…</div>;
  if (error || !complaint) return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <div style={{ color: 'var(--red)', marginBottom: '12px', fontSize: '1.1rem' }}>{error || 'Complaint not found'}</div>
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go back</button>
    </div>
  );

  const isOfficer = user?.role !== 'citizen';
  const canUpdate = isOfficer && !['resolved', 'closed'].includes(complaint.status);
  const nextStatuses = NEXT_STATUS[complaint.status] || [];
  const slaColor = SLA_COLORS[complaint.slaStatus] || 'var(--mist)';
  const canAssign = ['dept_head', 'collector', 'super_admin'].includes(user?.role);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← {t('submit.back', { defaultValue: 'Back' })}</button>
          <h1 style={{ fontSize: '1.5rem' }}>{complaint.ticketId}</h1>
          <span className={`badge badge-${complaint.status}`}>{STATUS_LABELS[complaint.status] || complaint.status}</span>
          <span className={`badge badge-${complaint.priority?.toLowerCase()}`}>{complaint.priority}</span>
          {complaint.slaStatus === 'breached' && <span className="badge badge-p1">🚨 SLA Breached</span>}
          {complaint.duplicateCount > 0 && (
            <span className="badge" style={{ background: 'var(--navy-3)', color: 'white' }}>
              +{complaint.duplicateCount} Duplicates Clustered
            </span>
          )}
          {complaint.parentId && (
            <button className="badge" onClick={() => navigate(`/complaints/${complaint.parentId}`)} style={{ background: 'var(--fog)', color: 'var(--ink-2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Merged with original 🔗
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-dim)' }}>{complaint.category} · {complaint.location || 'No location specified'}</p>
      </div>

      {/* Success banner on submission */}
      {sp.get('submitted') === '1' && (
        <div style={{ margin: '0 32px 16px', padding: '14px 18px', background: 'var(--green-dim)', border: '1px solid rgba(19,136,8,0.2)', borderRadius: 'var(--radius)', color: 'var(--green-india)', fontWeight: 500 }}>
          ✅ Complaint submitted successfully! Track it with ID: <strong>{complaint.ticketId}</strong>
        </div>
      )}

      <div className="page-body">
        <div className="detail-grid">

          {/* ── Main column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Description card */}
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '10px' }}>{complaint.title}</h2>

              {/* AI Summary — officer-only, on demand */}
              {isOfficer && (
                <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: aiSummary ? '6px' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: 'var(--navy)', borderRadius: '4px' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13.5c-.83 0-1.5.67-1.5 1.5S6.67 16.5 7.5 16.5 9 15.83 9 15s-.67-1.5-1.5-1.5m9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5Z"/></svg></div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Officer Summary</span>
                    {!aiSummary && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        onClick={loadAiSummary}
                        disabled={aiSummaryLoading}
                      >
                        {aiSummaryLoading ? 'Generating…' : 'Generate'}
                      </button>
                    )}
                  </div>
                  {aiSummary && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{aiSummary}</p>
                  )}
                  {!aiSummary && !aiSummaryLoading && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-mist)', margin: 0 }}>Click Generate to get an AI-written one-liner for this complaint.</p>
                  )}
                </div>
              )}

              <p style={{ color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: '18px', whiteSpace: 'pre-wrap' }}>{complaint.description}</p>

              {complaint.resolvedMediaUrls && complaint.resolvedMediaUrls.length > 0 && (
                <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--green-dim)', borderRadius: 'var(--radius)', border: '1px solid rgba(19,136,8,0.1)' }}>
                  <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--green-india)', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircleIcon size={18} color="var(--green-india)" />
                    <span>RESOLUTION EVIDENCE</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {complaint.resolvedMediaUrls.map((url, i) => {
                      const hostUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '').replace(/\/api$/, '');
                      const fullUrl = url.startsWith('http') ? url : `${hostUrl}${url}`;
                      return (
                        <a key={i} href={fullUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 'var(--radius)', overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                          <img src={fullUrl} alt="Resolution" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {complaint.mediaUrls && complaint.mediaUrls.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '12px', fontSize: '1rem' }}>Evidence Attached</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                    {complaint.mediaUrls.map((url, i) => {
                      const isVideo = url.match(/\.(mp4|mov)$/i);
                      const hostUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '').replace(/\/api$/, '');
                      const fullUrl = url.startsWith('http') ? url : `${hostUrl}${url}`;
                      
                      return (
                        <a key={i} href={fullUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--fog)', textDecoration: 'none' }}>
                          {isVideo ? (
                            <div style={{ width: '100%', height: '80px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><PlayIcon size={32} color="#fff" /></div>
                          ) : (
                            <img src={fullUrl} alt="evidence" style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ padding: '6px', fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)' }}>
                            {isVideo ? 'View Video' : 'View Photo'}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: '10px' }}>
                <MetaField label={t('complaint.department')} value={complaint.category} />
                <MetaField label={t('complaint.location')} value={complaint.location} />
                <MetaField label="Language" value={complaint.language?.toUpperCase()} />
                <MetaField label="Citizen" value={complaint.citizenName} />
                <MetaField label="Submitted" value={new Date(complaint.createdAt).toLocaleString('en-IN')} />
                <MetaField label="SLA Deadline" value={new Date(complaint.slaDeadline).toLocaleString('en-IN')} color={slaColor} />
                {complaint.resolvedAt && (
                  <MetaField label="Resolved At" value={new Date(complaint.resolvedAt).toLocaleString('en-IN')} color="var(--green-india)" />
                )}
              </div>

              {/* Location Map */}
              {complaint.lat && complaint.lng && (
                <div style={{ marginTop: '20px', height: '220px', width: '100%', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', zIndex: 1 }}>
                  <MapContainer center={[parseFloat(complaint.lat), parseFloat(complaint.lng)]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <Marker position={[parseFloat(complaint.lat), parseFloat(complaint.lng)]} />
                  </MapContainer>
                </div>
              )}

              {/* SLA pill */}
              <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: complaint.slaStatus === 'breached' ? 'var(--red-dim)' : 'var(--snow)', borderRadius: '20px', border: `1px solid ${slaColor}40` }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: slaColor }}>{SLA_LABELS[complaint.slaStatus] || complaint.slaStatus}</span>
              </div>
            </div>

            {/* F1: Star Rating — visible to the citizen who filed the complaint after resolution */}
            {['resolved', 'closed'].includes(complaint.status) && user?.id === complaint.userId && (
              <div className="card" style={{ padding: '20px' }}>
                <StarRating
                  complaintId={complaint.id}
                  existingRating={complaint.rating}
                  onRated={() => refresh()}
                />
                
                {/* F3: Appeal Flow — Citizen can appeal once */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--fog)' }}>
                  <AppealPanel
                    complaintId={complaint.id}
                    isAppealed={complaint.isAppealed}
                    appealReason={complaint.appealReason}
                    onAppealed={() => refresh()}
                  />
                </div>
              </div>
            )}

            {/* Read-only appeal badge — visible to officers/admins */}
            {complaint.isAppealed && user?.id !== complaint.userId && (
              <div className="card" style={{ padding: '20px', background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }}>
                <div style={{ float: 'left', marginRight: '12px', marginTop: '2px' }}><ClipboardIcon size={24} color="var(--red)" /></div>
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
                <div style={{ clear: 'both' }}></div>
              </div>
            )}


            {/* Read-only rating badge — visible to officers/admins once citizen has rated */}
            {complaint.rating && user?.id !== complaint.userId && (
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  Citizen Satisfaction Rating
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Stars */}
                  <div style={{ fontSize: '1.4rem', letterSpacing: '2px', color: 'var(--saffron)' }}>
                    {'★'.repeat(complaint.rating)}{'☆'.repeat(5 - complaint.rating)}
                  </div>
                  {/* Label */}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][complaint.rating]}
                  </span>
                  {/* Date rated */}
                  {complaint.ratedAt && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-mist)' }}>
                      — rated {new Date(complaint.ratedAt).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
                {/* Feedback text if provided */}
                {complaint.ratingFeedback && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-body)', borderRadius: 'var(--radius)', fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic', border: '1px solid var(--border-color)' }}>
                    "{complaint.ratingFeedback}"
                  </div>
                )}
              </div>
            )}

            {/* AI Classification card */}
            {complaint.aiClassification && (
              <div className="card" style={{ padding: '20px' }}>
                <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: 'var(--navy)', borderRadius: '4px' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF9933" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13.5c-.83 0-1.5.67-1.5 1.5S6.67 16.5 7.5 16.5 9 15.83 9 15s-.67-1.5-1.5-1.5m9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5Z"/></svg></span>
                  AI Classification
                  <span style={{ marginLeft: '4px', fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-mist)', textTransform: 'uppercase' }}>via {complaint.aiClassification.method}</span>
                </h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {complaint.aiClassification.categories?.map((c, i) => (
                    <div key={i} style={{
                      background: i === 0 ? 'var(--bg-body)' : 'var(--bg-card)',
                      border: i === 0 ? '1px solid rgba(255,153,51,0.3)' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: '0.8rem'
                    }}>
                      <strong style={{ color: 'var(--text-main)' }}>{c.department}</strong>
                      <span style={{ color: 'var(--text-mist)', marginLeft: '6px' }}>{Math.round((c.confidence || 0) * 100)}%</span>
                    </div>
                  ))}
                  {complaint.aiClassification.isUrgent && (
                    <span className="badge badge-p1" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertIcon size={12} color="var(--red)" /> Urgent Flag
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '14px', fontSize: '1rem' }}>
                {t('complaint.comments')}
                {complaint.comments?.length > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-mist)', fontWeight: 400 }}>({complaint.comments.length})</span>
                )}
              </h3>

              {complaint.comments?.length === 0 && (
                <p style={{ color: 'var(--text-mist)', fontSize: '0.875rem', marginBottom: '12px' }}>No comments yet.</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {complaint.comments?.map(c => (
                  <div key={c.id} style={{
                    padding: '12px', background: 'var(--bg-body)',
                    borderRadius: 'var(--radius)',
                    borderLeft: c.role !== 'citizen' ? '3px solid var(--saffron)' : '3px solid var(--border-color)',
                    border: '1px solid var(--border-color)', borderLeftWidth: '3px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{c.userName}</strong>
                      <span className={`badge badge-${c.role}`} style={{ fontSize: '0.65rem' }}>{c.role?.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-mist)', marginLeft: 'auto' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{c.text}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Add a comment or note…"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(); } }}
                  style={{ flex: 1, minHeight: '40px' }}
                  maxLength={2000}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={addComment}
                  disabled={!comment.trim() || commentLoading}
                  style={{ minWidth: '70px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}
                >
                  {commentLoading ? '…' : 'Post'}
                </button>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-mist)', marginTop: '4px', textAlign: 'right' }}>{comment.length}/2000</div>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Update Status */}
            {canUpdate && (
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ZapIcon size={18} color="var(--saffron)" /> Update Status
                </h3>
                <input
                  className="input"
                  placeholder="Note (optional)"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  maxLength={500}
                  style={{ marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {nextStatuses.map(s => (
                    <div key={s} style={{ borderBottom: '1px solid var(--snow)', paddingBottom: '8px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateStatus(s)}
                        disabled={statusLoading || (s === 'resolved' && !resolvedFile)}
                        style={{ justifyContent: 'flex-start', width: '100%', marginBottom: s === 'resolved' ? '8px' : '0' }}
                      >
                        → {STATUS_LABELS[s] || s}
                      </button>
                      {s === 'resolved' && (
                        <div style={{ padding: '0 10px' }}>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>UPLOAD RESOLUTION PHOTO (REQUIRED)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={e => setResolvedFile(e.target.files[0])}
                            style={{ fontSize: '0.75rem' }} 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {statusError && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--red)', padding: '6px 10px', background: 'var(--red-dim)', borderRadius: 'var(--radius)' }}>
                    {statusError}
                  </div>
                )}
              </div>
            )}

            {/* Assign Officer */}
            {canAssign && (
              <div className="card" style={{ padding: '18px' }}>
                <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserIcon size={18} color="var(--text-main)" /> {complaint.assignedTo ? 'Re-assign' : 'Assign Officer'}
                </h3>
                {complaint.assignedTo && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-2)', marginBottom: '12px', padding: '8px 10px', background: 'var(--snow)', borderRadius: 'var(--radius)' }}>
                    Currently Assigned To: <strong>{complaint.officerName || complaint.assignedToName || 'Unknown Officer'}</strong>
                  </div>
                )}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Department</label>
                  <CustomSelect
                    className="input"
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    options={[
                      { label: 'Select department...', value: '' },
                      ...departments.map(d => ({ label: d.name, value: d.id }))
                    ]}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Officer</label>
                  <CustomSelect
                    className="input"
                    value={selectedOfficer}
                    onChange={e => setSelectedOfficer(e.target.value)}
                    options={[
                      { label: officers.length === 0 ? 'No officers available' : 'Select officer...', value: '' },
                      ...officers.map(o => ({
                        label: `${o.name}${o.id === complaint.assignedTo ? ' (current)' : ''}`,
                        value: o.id
                      }))
                    ]}
                    disabled={officers.length === 0}
                  />
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={assign}
                  disabled={assigning || !selectedOfficer}
                >
                  {assigning ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            )}

            {/* Timeline */}
            <div className="card" style={{ padding: '18px' }}>
              <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '14px', fontSize: '1rem' }}>{t('complaint.timeline')}</h3>
              <div>
                {[...( complaint.history || [])].reverse().map((h, i, arr) => (
                  <div key={h.id} style={{ display: 'flex', gap: '10px', marginBottom: i < arr.length - 1 ? '0' : '0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '3px',
                        background: h.status === 'resolved' ? 'var(--green-india)' : h.status === 'escalated' ? 'var(--red)' : 'var(--saffron)'
                      }} />
                      {i < arr.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--fog)', margin: '3px 0', minHeight: '16px' }} />}
                    </div>
                    <div style={{ paddingBottom: i < arr.length - 1 ? '14px' : 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {STATUS_LABELS[h.status] || h.status}
                      </div>
                      {h.note && <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', marginTop: '2px' }}>{h.note}</div>}
                      <div style={{ fontSize: '0.7rem', color: 'var(--mist)', marginTop: '2px' }}>{timeAgo(h.createdAt || h.created_at || h.timestamp)}</div>
                    </div>
                  </div>
                ))}
                {(!complaint.history || complaint.history.length === 0) && (
                  <p style={{ color: 'var(--mist)', fontSize: '0.8rem' }}>No history yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


