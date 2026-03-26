import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../utils/api';
import useAuthStore from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';

const COLORS = ['#FF9933','#0a2240','#138808','#1565c0','#6a1b9a','#e65100','#c0392b','#f57f17'];

function LoadBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 80 ? 'var(--red)' : pct >= 50 ? 'var(--saffron)' : 'var(--green-india)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '24px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [trends, setTrends]         = useState([]);
  const [depts, setDepts]           = useState([]);
  const [cats, setCats]             = useState([]);
  const [officerLoad, setOfficerLoad] = useState([]);
  const [loading, setLoading]       = useState(true);

  const isAdmin = ['dept_head', 'collector', 'super_admin'].includes(user?.role);

  useEffect(() => {
    const calls = [api.trends(), api.departments(), api.categories()];
    if (isAdmin) calls.push(api.officerLoad());
    Promise.all(calls)
      .then(([t, d, c, ol]) => {
        setTrends(t); setDepts(d); setCats(c);
        if (ol) setOfficerLoad(ol);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--mist)' }}>Loading analytics…</div>;

  const maxLoad = officerLoad.length ? Math.max(...officerLoad.map(o => o.activeCount || 0), 1) : 1;

  return (
    <div>
      <div className="page-header">
        <h1>{t('dashboard.title', { defaultValue: 'Analytics & Reports' })}</h1>
        <p>{t('dashboard.subtitle', { defaultValue: 'Complaint trends, department performance, and officer workload distribution' })}</p>
      </div>
      <div className="page-body">

        {/* 30-day trend */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '16px' }}>
            30-Day Complaint Trend
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-mist)' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-mist)' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="received" stroke="var(--navy-3)" strokeWidth={2} dot={false} name="Received" />
              <Line type="monotone" dataKey="resolved" stroke="var(--green-india)" strokeWidth={2} dot={false} name="Resolved" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-chart-grid" style={{ display: 'grid', gap: '20px', marginBottom: '20px' }}>
          {/* Dept avg resolution */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
              Dept. Avg. Resolution Time (hrs)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={depts} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-mist)' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--text-mist)' }} width={150} />
                <Tooltip />
                <Bar dataKey="avgResolutionHours" fill="var(--navy-3)" radius={[0, 4, 4, 0]} name="Avg Hrs" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category pie */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
              Top Complaint Categories
            </h3>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <Pie
                  data={cats} dataKey="count" nameKey="category"
                  cx="50%" cy="40%" outerRadius={75}
                  labelLine={false}
                >
                  {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name]} />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{value}</span>}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Officer workload — admin/head only */}
        {isAdmin && officerLoad.length > 0 && (
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', marginBottom: '16px', fontSize: '1rem' }}>
            🎯 Officer Workload Distribution
          </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-mist)' }}>
                Auto-assignment picks officer with lowest load
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {officerLoad.map(o => (
                <div key={o.id} style={{
                  padding: '12px 14px', background: 'var(--bg-card)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{o.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-mist)' }}>{o.department}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-mist)' }}>resolved</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--green-india)' }}>
                        {o.resolvedTotal || 0}
                      </div>
                    </div>
                  </div>
                  <LoadBar value={o.activeCount || 0} max={maxLoad} />
                  {o.lastAssigned && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-mist)', marginTop: '4px' }}>
                      Last assigned {new Date(o.lastAssigned).toLocaleDateString('en-IN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Department table */}
        <div className="card" style={{ overflow: 'auto' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Department Performance Summary
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-body)' }}>
                {['Department', 'Total', 'Resolved', 'Pending', 'SLA Breached', 'SLA Rate', 'Avg Resolution'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depts.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</td>
                  <td style={{ padding: '12px 16px' }}>{d.total}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--green-india)', fontWeight: 600 }}>{d.resolved}</td>
                  <td style={{ padding: '12px 16px' }}>{d.pending}</td>
                  <td style={{ padding: '12px 16px', color: d.breached > 0 ? 'var(--red)' : 'var(--mist)', fontWeight: d.breached > 0 ? 700 : 400 }}>
                    {d.breached}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: d.slaRate >= 80 ? 'var(--green-india)' : d.slaRate >= 60 ? 'var(--saffron)' : 'var(--red)' }}>
                    {d.slaRate}%
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-mist)' }}>{d.avgResolutionHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


