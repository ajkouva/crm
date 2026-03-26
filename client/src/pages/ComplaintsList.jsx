import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import useAuthStore from '../store/useAuthStore';
import CustomSelect from '../components/CustomSelect';
import { SkeletonTable, EmptyState, ErrorState } from '../components/Skeleton';

const STATUS_OPTS = ['','new','assigned','in_progress','pending_escalation','escalated','resolved','closed'];
const PRIORITY_OPTS = ['','P1','P2','P3'];

function slaColor(s) {
  return { ok:'var(--green-india, #008221)', warning:'var(--saffron)', critical:'var(--red)', breached:'var(--red)', met:'var(--text-mist)' }[s] || 'var(--text-mist)';
}
function slaLabel(s) {
  return { ok:' On Track', warning:' Due Soon', critical:' Critical', breached:' Breached', met:' Met' }[s] || s;
}
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

export default function ComplaintsList() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: searchParams.get('status')||'', priority:'', search:'' });
  const [page, setPage] = useState(1);

  useEffect(() => { load(); }, [filters, page]);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ page, limit:15, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) });
      const data = await api.getComplaints(p.toString());
      setComplaints(data.complaints); setTotal(data.total);
    } catch (err) {
      setError(err?.message || 'Could not load complaints.');
    } finally { setLoading(false); }
  };

  const setF = k => e => { setFilters(f=>({...f,[k]:e.target.value})); setPage(1); };

  const isOfficer = user?.role !== 'citizen';

  return (
    <div>
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1>{isOfficer ? t('list.title', { defaultValue: 'All Complaints' }) : t('list.title', { defaultValue: 'My Complaints' })}</h1>
          <p>{total} {t('list.title').toLowerCase()}</p>
        </div>
        {!isOfficer && (
          <button className="btn btn-saffron" onClick={() => navigate('/submit')}>+ {t('nav.file_complaint')}</button>
        )}
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="filters-container">
          <div className="filters-search">
            <input className="input" style={{ width: '100%' }} placeholder={t('list.search')} value={filters.search} onChange={setF('search')} />
          </div>
          <div className="filters-selects">
            <CustomSelect 
              className="input" 
              style={{ flex: 1, minWidth: 0 }} 
              value={filters.status} 
              onChange={setF('status')}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'New', value: 'new' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'In Progress', value: 'in_progress' },
                { label: 'Pending Escalation', value: 'pending_escalation' },
                { label: 'Escalated', value: 'escalated' },
                { label: 'Resolved', value: 'resolved' },
                { label: 'Closed', value: 'closed' }
              ]}
            />

            <CustomSelect 
              className="input" 
              style={{ flex: 1, minWidth: 0 }} 
              value={filters.priority} 
              onChange={setF('priority')}
              options={[
                { label: 'All Priorities', value: '' },
                { label: 'P1 (Urgent)', value: 'P1' },
                { label: 'P2 (High)', value: 'P2' },
                { label: 'P3 (Normal)', value: 'P3' }
              ]}
            />
          </div>
        </div>

        {/* Table */}
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : complaints.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No complaints found"
            subtitle="Try adjusting your filters, or file a new complaint if you're a citizen."
          />
        ) : (
          <div className="card" style={{ overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-body)', borderBottom:'2px solid var(--border-color)' }}>
                  {['Ticket ID','Title','Category','Priority','Status','SLA','Submitted',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.75rem', fontWeight:700, color:'var(--text-mist)', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom:'1px solid var(--border-color)', background: i%2===0?'var(--bg-card)':'var(--bg-body)', cursor:'pointer' }}
                    onClick={() => navigate(`/complaints/${c.id}`)}>
                    <td style={{ padding:'12px 14px', fontWeight:700, fontSize:'0.8rem', color:'var(--text-main)', whiteSpace:'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.ticketId}
                        {c.duplicateCount > 0 && (
                          <span title={`Cluster of ${c.duplicateCount + 1}`} style={{ fontSize: '0.65rem', background: 'var(--saffron)', color: 'var(--navy)', padding: '2px 5px', borderRadius: '10px' }}>
                            +{c.duplicateCount}
                          </span>
                        )}
                        {c.parentId && (
                          <span title="Duplicate Ticket" style={{ fontSize: '0.65rem', background: 'var(--border-color)', color: 'var(--text-mist)', padding: '2px 5px', borderRadius: '4px' }}>
                            DUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:'0.875rem', maxWidth:'220px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</td>
                    <td style={{ padding:'12px 14px', fontSize:'0.8rem', color:'var(--text-dim)' }}>{c.category}</td>
                    <td style={{ padding:'12px 14px' }}><span className={`badge badge-${c.priority?.toLowerCase()}`}>{c.priority}</span></td>
                    <td style={{ padding:'12px 14px' }}><span className={`badge badge-${c.status}`}>{t(`list.${c.status}`, { defaultValue: c.status?.replace('_',' ') })}</span></td>
                    <td style={{ padding:'12px 14px', fontSize:'0.8rem', color:slaColor(c.slaStatus), fontWeight:600, whiteSpace:'nowrap' }}>{slaLabel(c.slaStatus)}</td>
                    <td style={{ padding:'12px 14px', fontSize:'0.75rem', color:'var(--text-mist)', whiteSpace:'nowrap' }}>{timeAgo(c.createdAt)}</td>
                    <td style={{ padding:'12px 14px' }}><button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();navigate(`/complaints/${c.id}`)}}>{t('common.view')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 15 && (
          <div style={{ display:'flex', gap:'8px', justifyContent:'center', marginTop:'20px' }}>
            <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
            <span style={{ fontSize:'0.875rem', color:'var(--text-mist)', padding:'6px 12px' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={page*15>=total} onClick={()=>setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}


