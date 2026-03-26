import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { api } from '../utils/api';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import { AnalyticsIcon, NotificationIcon } from '../components/Icons';
import HeatmapWidget from '../components/HeatmapWidget';
import { SkeletonCard, EmptyState, ErrorState } from '../components/Skeleton';

const BuildingIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const CheckCircleIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>;
const AlertIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const ClockIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : {}}>{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function SLABar({ name, rate }) {
  const color = rate >= 80 ? 'var(--green-india)' : rate >= 60 ? 'var(--saffron)' : 'var(--red)';
  return (
    <div style={{ marginBottom:'10px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', marginBottom:'4px' }}>
        <span style={{ color:'var(--text-dim)', fontWeight:500 }}>{name}</span>
        <span style={{ color, fontWeight:700 }}>{rate}%</span>
      </div>
      <div style={{ height:'6px', background: 'var(--border-color)', borderRadius:'3px' }}>
        <div style={{ height:'100%', width:`${rate}%`, background:color, borderRadius:'3px', transition:'width 0.6s ease' }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [depts, setDepts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [escalated, setEscalated] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [officerLoad, setOfficerLoad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user?.role === 'collector' || user?.role === 'super_admin';
  const isOfficer = user?.role !== 'citizen';

  const load = () => {
    setLoading(true); setError(null);
    Promise.all([
      api.overview(), api.trends(), api.departments(), api.categories(), api.escalated(),
      api.getComplaints('limit=500')
    ]).then(([ov, tr, dp, ca, es, cp]) => {
      setOverview(ov); setTrends(tr); setDepts(dp); setCategories(ca); setEscalated(es);
      if (cp && cp.complaints) setHeatmapData(cp.complaints);
    })
    .then(() => isAdmin ? api.officerLoad().then(setOfficerLoad) : null)
    .catch(err => setError(err?.message || 'Failed to load dashboard data.'))
    .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isAdmin]);

  if (loading) return (
    <div className="page-body">
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="stats-grid">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={load} />;

  const trendSlice = trends?.slice(-14) || []; // last 14 days on chart

  return (
    <div>
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
        <p>{t('dashboard.subtitle')} · {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>
      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard label={t('dashboard.recent_activity')} value={overview?.total} sub="All time" />
          <StatCard label={t('dashboard.pending')} value={overview?.todayReceived} sub="New today" />
          <StatCard label={t('dashboard.resolved')} value={overview?.todayResolved} sub="Closed today" color="var(--green-india)" />
          <StatCard label={t('dashboard.escalated')} value={overview?.escalated} sub="Action Required" color={overview?.escalated > 0 ? 'var(--red)' : undefined} />
          {isOfficer && <>
            <StatCard label={t('dashboard.sla')} value={`${overview?.slaCompliance}%`} sub="Active complaints" color={overview?.slaCompliance >= 80 ? 'var(--green-india)' : 'var(--red)'} />
            <StatCard label={t('home.stats_avg_time')} value={`${overview?.avgResolutionHours}h`} sub="Hours to resolve" />
          </>}
          {user?.role === 'field_officer' && overview?.deptStats && (
            <>
              <StatCard label="Dept Total" value={overview.deptStats.total} sub="My Department" color="var(--text-main)" />
              <StatCard label="Dept Resolved" value={overview.deptStats.resolved} sub="My Department" color="var(--green-india)" />
            </>
          )}
        </div>

        {/* Charts row */}
        {isOfficer && (
          <div className="dashboard-grid" style={{ marginBottom:'24px' }}>
            {/* Trend chart */}
            <div className="card" style={{ padding:'20px' }}>
              <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', marginBottom:'16px' }}>
                {t('dashboard.trends')}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendSlice}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-mist)' }} />
                  <YAxis tick={{ fontSize:11, fill:'var(--text-mist)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} itemStyle={{ color: 'var(--text-main)' }} />
                  <Legend wrapperStyle={{ color: 'var(--text-main)' }} />
                  <Line type="monotone" dataKey="received" stroke="var(--saffron)" strokeWidth={2} dot={false} name="Received" />
                  <Line type="monotone" dataKey="resolved" stroke="var(--green-india, #008221)" strokeWidth={2} dot={false} name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category chart — Hidden for Field Officers per request */}
            {user?.role !== 'field_officer' && (
              <div className="card" style={{ padding:'20px' }}>
                <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', marginBottom:'16px' }}>
                  Top 5 Complaint Categories
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" tick={{ fontSize:11, fill: 'var(--text-mist)' }} />
                    <YAxis dataKey="category" type="category" tick={{ fontSize:11, fill:'var(--text-mist)' }} width={100} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <Bar dataKey="count" fill="var(--saffron)" radius={[0,4,4,0]} name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {user?.role === 'field_officer' && (
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', background: 'var(--bg-body)' }}>
                 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                   <BuildingIcon size={32} color="var(--navy)" />
                 </div>
                 <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', marginBottom:'8px' }}>
                   {user.departmentName || 'Your Department'}
                 </h3>
                 <p style={{ fontSize: '0.875rem', color: 'var(--text-mist)', margin: 0 }}>
                   You are contributing to <strong>{Math.round((overview.resolved / (overview.deptStats?.resolved || 1)) * 100)}%</strong> of your department's resolutions.
                 </p>
              </div>
            )}
          </div>
        )}

        {/* Heatmap Section */}
        {isOfficer && (
          <div className="card" style={{ padding: 0, marginBottom: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideFadeIn 0.8s ease backwards', animationDelay: '0.3s' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--bg-card)', position: 'relative', zIndex: 10 }}>
              <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.2rem', color:'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center' }}>
                Geospatial Density Map
                <span style={{ marginLeft: '16px', padding: '4px 10px', background: 'rgba(255,153,51,0.1)', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--saffron)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regional Activity</span>
              </h3>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '400px', background: 'var(--bg-body)' }}>
              {heatmapData.length > 0 ? (
                <HeatmapWidget complaints={heatmapData} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-mist)' }}>No geospatial data available for heatmap.</div>
              )}
            </div>
          </div>
        )}

        {/* Bottom row */}
        <div className={isOfficer ? "dashboard-grid" : ""}>

          {/* SLA Heatmap */}
          {isAdmin && (
            <div className="card" style={{ padding:'20px' }}>
              <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', marginBottom:'16px' }}>
                Department SLA Compliance
              </h3>
              {depts.map(d => <SLABar key={d.id} name={d.name} rate={d.slaRate} />)}
            </div>
          )}

          {/* Officer Load (Admins Only) */}
          {isAdmin && (
            <div className="card" style={{ padding:'20px', overflow:'auto', maxHeight:'400px' }}>
              <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', marginBottom:'16px' }}>
                Active Field Officer Load
              </h3>
              {officerLoad.length === 0 ? (
                <div style={{ color:'var(--text-mist)', fontSize:'0.85rem' }}>No Active Officers</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign:'left', color: 'var(--text-mist)' }}>
                        <th style={{ padding:'12px 8px', fontWeight: 600 }}>Officer</th>
                        <th style={{ padding:'12px 8px', fontWeight: 600 }}>Dept</th>
                        <th style={{ padding:'12px 8px', fontWeight: 600 }}>Active</th>
                      </tr>
                    </thead>
                    <tbody style={{ display: 'table-row-group' }}>
                      {officerLoad.map((o, idx) => (
                        <tr key={o.id} style={{ background: idx % 2 === 0 ? 'var(--bg-body)' : 'transparent', borderRadius: '8px' }}>
                          <td style={{ padding:'14px 8px', fontWeight:600 }}>{o.name}</td>
                          <td style={{ padding:'14px 8px', color:'var(--text-dim)' }}>{o.department}</td>
                          <td style={{ padding:'14px 8px' }}>
                            <span style={{ fontWeight:700, color:o.activeCount>5?'var(--red)':'var(--green-india)' }}>{o.activeCount}</span> tickets
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Escalated complaints feed */}
          <div className="card" style={{ padding:'20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
              <h3 style={{ fontFamily:'Rajdhani,sans-serif', fontSize:'1.1rem', color:'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <NotificationIcon size={18} color="var(--red)" /> Escalated / Urgent
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/complaints?status=escalated')}>View all</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {escalated.length === 0
                ? <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-body)', borderRadius: '12px', color:'var(--text-mist)', fontSize:'0.875rem', display:'flex', alignItems:'center', justifyContent: 'center', gap:'8px' }}>
                    No escalated complaints. Great work! <CheckCircleIcon size={16} color="var(--green-india)" />
                  </div>
                : escalated.slice(0, 5).map(c => (
                  <div key={c.id} style={{ padding:'16px', background: 'var(--bg-body)', borderRadius: '12px', cursor:'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }} onClick={() => navigate(`/complaints/${c.id}`)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-main)', letterSpacing: '0.05em' }}>{c.ticketId}</span>
                      <span className={`badge badge-${c.priority?.toLowerCase()}`}>{c.priority}</span>
                    </div>
                    <div style={{ fontSize:'0.85rem', color:'var(--text-dim)', marginBottom:'8px', lineHeight: 1.4 }}>{c.title}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--red)', display:'flex', alignItems:'center', gap:'6px', fontWeight: 600 }}>
                      {c.slaStatus === 'breached' 
                        ? <><AlertIcon size={14} color="var(--red)" /> SLA Breached</> 
                        : <><ClockIcon size={14} color="var(--text-mist)" /> <span style={{color:'var(--text-mist)'}}>{c.category}</span></>
                      }
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


