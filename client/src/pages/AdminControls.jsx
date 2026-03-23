import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';

const ROLE_BADGE = {
  super_admin: { label: 'Super Admin', color: 'var(--red)', bg: 'rgba(192,57,43,0.1)', border: 'rgba(192,57,43,0.3)' },
  collector: { label: 'Collector', color: 'var(--saffron)', bg: 'rgba(255,153,51,0.1)', border: 'rgba(255,153,51,0.3)' },
  dept_head: { label: 'Dept Head', color: '#138808', bg: 'rgba(19,136,8,0.1)', border: 'rgba(19,136,8,0.3)' },
  field_officer: { label: 'Officer', color: 'var(--blue)', bg: 'rgba(52,152,219,0.1)', border: 'rgba(52,152,219,0.3)' },
  citizen: { label: 'Citizen', color: 'var(--text-mist)', bg: 'var(--bg-body)', border: 'var(--border-color)' }
};

const UsersIcon = ({ size=24, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const PendingIcon = ({ size=24, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const ShieldIcon = ({ size=24, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const BuildingIcon = ({ size=24, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const SearchIcon = ({ size=18, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const DownloadIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const CheckIcon = ({ size=16, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

export default function AdminControls() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('users');

  // Users State
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState(new Set()); // For bulk operations

  // Dept State
  const [deptForm, setDeptForm] = useState({ id: '', name: '', code: '' });
  const [isEditingDept, setIsEditingDept] = useState(false);

  useEffect(() => {
    if (['super_admin', 'collector'].includes(user?.role)) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [uRes, dRes] = await Promise.all([api.adminUsers(), api.getDepartments()]);
      setUsers(uRes);
      setDepartments(dRes);
      setSelectedUsers(new Set());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleUserUpdate = async (userId, updates) => {
    try {
      await api.adminUpdateUser(userId, updates);
      loadData();
    } catch (e) { setError('Error updating user: ' + e.message); }
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`Are you sure you want to approve ${selectedUsers.size} users?`)) return;
    try {
      setLoading(true);
      const promises = Array.from(selectedUsers).map(id => api.adminUpdateUser(id, { active: true }));
      await Promise.all(promises);
      loadData();
    } catch (e) { 
      setError('Error approving users. Some may have failed.'); 
      loadData();
    }
  };

  const toggleSelectUser = (id) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
    else setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
  };

  const saveDept = async (e) => {
    e.preventDefault();
    try {
      if (isEditingDept) {
        await api.adminUpdateDept(deptForm.id, { name: deptForm.name, code: deptForm.code });
      } else {
        await api.adminCreateDept(deptForm);
      }
      setDeptForm({ id: '', name: '', code: '' });
      setIsEditingDept(false);
      loadData();
    } catch (e) { setError('Error saving department: ' + e.message); }
  };

  const deleteDept = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.adminDeleteDept(id);
      loadData();
    } catch (e) { setError('Error deleting department: ' + e.message); }
  };

  const startEditDept = (d) => {
    setDeptForm({ id: d.id, name: d.name, code: d.code });
    setIsEditingDept(true);
  };

  const cancelEditDept = () => {
    setDeptForm({ id: '', name: '', code: '' });
    setIsEditingDept(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (userFilter === 'officers') return ['field_officer', 'dept_head'].includes(u.role);
      if (userFilter === 'admins') return ['super_admin', 'collector'].includes(u.role);
      if (userFilter === 'pending') return u.active === false;
      if (userFilter === 'citizens') return u.role === 'citizen';
      return true;
    });
  }, [users, searchQuery, userFilter]);

  if (loading && users.length === 0) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-mist)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--saffron)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        Loading advanced control panel...
      </div>
    </div>
  );

  if (!['super_admin', 'collector'].includes(user?.role)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--red-dim)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 'var(--radius)' }}>
          <ShieldIcon size={48} color="var(--red)" />
          <h2 style={{ color: 'var(--red)', marginTop: '16px', fontFamily: 'Rajdhani,sans-serif' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-mist)', margin: 0 }}>This panel is classified for Super Admins and Collectors only.</p>
        </div>
      </div>
    );
  }

  const activeOfficersCount = users.filter(u => ['field_officer', 'dept_head'].includes(u.role) && u.active).length;
  const pendingCount = users.filter(u => !u.active).length;

  return (
    <div className="fade-up">
      {/* Neo-Gov Header Summary */}
      <div className="admin-header-container" style={{ 
        background: 'linear-gradient(145deg, var(--bg-card) 0%, var(--bg-body) 100%)', 
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background accent */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--saffron-dim) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        
        <div className="admin-header-flex">
          <div style={{ flex: '1 1 min-content' }}>
            <h1 className="admin-page-title" style={{ color: 'var(--text-main)', margin: 0, fontWeight: 800, letterSpacing: '0.02em' }}>CONTROL_PANEL</h1>
            <p style={{ color: 'var(--text-mist)', margin: '8px 0 0 0', fontSize: '0.9rem', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <ShieldIcon size={14} /> Advanced User & Operations Management
            </p>
          </div>
          
          <div className="admin-stats-flex">
            <div className="admin-stat-card">
              <div style={{ color: 'var(--blue)' }}><UsersIcon /></div>
              <div>
                <div className="admin-stat-label">Total Users</div>
                <div className="admin-stat-value">{users.length}</div>
              </div>
            </div>
            
            <div className={`admin-stat-card ${pendingCount > 0 ? 'pending-active' : ''}`}>
              <div style={{ color: pendingCount > 0 ? 'var(--red)' : 'var(--text-mist)' }}><PendingIcon /></div>
              <div>
                <div className="admin-stat-label" style={{ color: pendingCount > 0 ? 'var(--red)' : 'var(--text-mist)' }}>Pending Auth</div>
                <div className="admin-stat-value" style={{ color: pendingCount > 0 ? 'var(--red)' : 'var(--text-main)' }}>{pendingCount}</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div style={{ color: 'var(--green-india)' }}><ShieldIcon /></div>
              <div>
                <div className="admin-stat-label">Active Officers</div>
                <div className="admin-stat-value">{activeOfficersCount}</div>
              </div>
            </div>

            <div className="admin-stat-card">
              <div style={{ color: 'var(--saffron)' }}><BuildingIcon /></div>
              <div>
                <div className="admin-stat-label">Departments</div>
                <div className="admin-stat-value">{departments.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body admin-page-body">
        {error && (
          <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '16px 20px', borderRadius: 'var(--radius)', marginBottom: '24px', border: '1px solid rgba(192,57,43,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--text-mist)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
        )}

        {/* Neo-Gov Segmented Tabs */}
        <div className="admin-tabs-container">
          <button 
            onClick={() => setActiveTab('users')}
            style={{ 
              padding: '12px 32px', 
              background: activeTab === 'users' ? 'var(--bg-card)' : 'transparent', 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              cursor: 'pointer', 
              fontFamily: 'Rajdhani,sans-serif',
              color: activeTab === 'users' ? 'var(--text-main)' : 'var(--text-mist)',
              borderRadius: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'users' ? 'var(--shadow-sm)' : 'none',
              border: activeTab === 'users' ? '1px solid var(--border-color)' : '1px solid transparent'
            }}
          >
            User Matrix &nbsp;<span style={{ color: activeTab === 'users' ? 'var(--saffron)' : 'inherit' }}>({users.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            style={{ 
              padding: '12px 32px', 
              background: activeTab === 'departments' ? 'var(--bg-card)' : 'transparent', 
              fontSize: '0.9rem', 
              fontWeight: 700, 
              cursor: 'pointer', 
              fontFamily: 'Rajdhani,sans-serif',
              color: activeTab === 'departments' ? 'var(--text-main)' : 'var(--text-mist)',
              borderRadius: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'departments' ? 'var(--shadow-sm)' : 'none',
              border: activeTab === 'departments' ? '1px solid var(--border-color)' : '1px solid transparent'
            }}
          >
            Department Control &nbsp;<span style={{ color: activeTab === 'departments' ? 'var(--saffron)' : 'inherit' }}>({departments.length})</span>
          </button>
        </div>

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="admin-filter-bar">
              
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '150px' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mist)' }}>
                    <SearchIcon />
                  </div>
                  <input 
                    className="input" 
                    placeholder="Search identity..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', height: '44px', paddingLeft: '44px' }}
                  />
                </div>
                
              <div style={{ display: 'flex', gap: '8px', flex: '1 1 auto', minWidth: '200px' }}>
                <CustomSelect
                  className="input"
                  style={{ flex: 1, height: '44px' }} 
                  value={userFilter} 
                  onChange={e => { setUserFilter(e.target.value); setSelectedUsers(new Set()); }}
                  options={[
                    { label: 'Filter: All Users', value: 'all' },
                    { label: 'Filter: Pending', value: 'pending' },
                    { label: 'Filter: Officers', value: 'officers' },
                    { label: 'Filter: Admins', value: 'admins' },
                    { label: 'Filter: Citizens', value: 'citizens' }
                  ]}
                />
                
                <button
                  onClick={() => {
                    const csv = "Name,Email,Role,Status,Department\n" + filteredUsers.map(u => `${u.name},${u.email},${u.role},${u.active ? 'Active' : 'Pending'},${departments.find(d => d.id === u.departmentId)?.name || 'N/A'}`).join("\n");
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = 'ps_crm_users.csv'; a.click();
                  }}
                  className="btn btn-ghost"
                  title="Export Data"
                  style={{ height: '44px', width: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', flexShrink: 0 }}
                >
                  <DownloadIcon size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                {selectedUsers.size > 0 && (
                  <button 
                    onClick={handleBulkApprove}
                    className="btn"
                    style={{ background: 'var(--green-india)', color: 'var(--white)', padding: '0 16px', height: '44px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
                  >
                    <CheckIcon /> Approve ({selectedUsers.size})
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '16px 24px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                        onChange={toggleSelectAll}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--saffron)' }}
                      />
                    </th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auth Status</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Identity</th>
                    <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role Provisioning</th>
                    <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department Routing</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-mist)', fontSize: '0.95rem' }}>No users found matching current filters.</td></tr>
                  ) : filteredUsers.map(u => {
                    const badge = ROLE_BADGE[u.role] || ROLE_BADGE.citizen;
                    const isSelected = selectedUsers.has(u.id);
                    return (
                      <tr key={u.id} style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        background: !u.active ? 'rgba(192,57,43,0.05)' : isSelected ? 'rgba(255,153,51,0.05)' : 'transparent',
                        transition: 'background 0.2s'
                      }}>
                        <td style={{ padding: '16px 24px' }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectUser(u.id)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--saffron)' }}
                          />
                        </td>
                        <td style={{ padding: '16px', width: '140px' }}>
                          <button
                            onClick={() => handleUserUpdate(u.id, { active: !u.active })}
                            title={u.active ? "Revoke Access" : "Approve User"}
                            style={{
                              padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, width: '100px',
                              background: u.active ? 'var(--green-dim)' : 'var(--red-dim)', 
                              color: u.active ? 'var(--green-india)' : 'var(--red)',
                              border: u.active ? '1px solid rgba(19,136,8,0.3)' : '1px solid rgba(192,57,43,0.5)',
                              transition: 'all 0.2s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            {u.active ? <><CheckIcon size={12}/> ACTIVE</> : 'PENDING'}
                          </button>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: badge.bg, border: `1px solid ${badge.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: badge.color, fontWeight: 700, fontSize: '1.2rem', fontFamily: 'Rajdhani' }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{u.name}</div>
                              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{u.email}</div>
                              {u.phone && <div style={{ color: 'var(--text-mist)', fontSize: '0.75rem', marginTop: '2px' }}>☎ {u.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CustomSelect 
                              className="input" 
                              style={{ padding: '0px 12px', height: '36px', fontSize: '0.85rem', width: '160px', background: 'var(--bg-input)' }}
                              value={u.role}
                              onChange={(e) => handleUserUpdate(u.id, { role: e.target.value })}
                              options={[
                                { label: 'Citizen', value: 'citizen' },
                                { label: 'Field Officer', value: 'field_officer' },
                                { label: 'Dept Head', value: 'dept_head' },
                                { label: 'Collector', value: 'collector' },
                                { label: 'Super Admin', value: 'super_admin' }
                              ]}
                            />
                            <span style={{ background: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${badge.border}` }}>
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          {['field_officer', 'dept_head'].includes(u.role) ? (
                            <CustomSelect 
                              className="input" 
                              style={{ padding: '0px 12px', height: '36px', fontSize: '0.85rem', width: '200px', background: 'var(--bg-input)' }}
                              value={u.departmentId || ''}
                              onChange={(e) => handleUserUpdate(u.id, { departmentId: e.target.value || null })}
                              options={[
                                { label: '-- Unassigned --', value: '' },
                                ...departments.map(d => ({ label: d.name, value: d.id }))
                              ]}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-mist)', fontSize: '0.85rem', fontStyle: 'italic', paddingLeft: '12px' }}>Not applicable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '1.4rem', color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <BuildingIcon size={20} color="var(--saffron)" />
                {isEditingDept ? 'Edit Department Details' : 'Initialize New Department'}
              </h3>
              <form onSubmit={saveDept} className="dept-form-horizontal">
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label className="form-label">Sector ID</label>
                  <input 
                    className="input" 
                    placeholder="e.g. d9" 
                    value={deptForm.id} 
                    onChange={e => setDeptForm({...deptForm, id: e.target.value})} 
                    required 
                    readOnly={isEditingDept}
                    style={{ background: isEditingDept ? 'var(--bg-body)' : 'var(--bg-input)', height: '44px', border: '1px solid var(--border-color)', fontWeight: 600 }}
                  />
                  {isEditingDept && <div style={{ fontSize: '0.65rem', color: 'var(--saffron)', marginTop: '4px' }}>Immutable</div>}
                </div>
                <div className="form-group" style={{ flex: '2 1 200px' }}>
                  <label className="form-label">Display Name</label>
                  <input 
                    className="input" 
                    placeholder="e.g. Parks & Recreation" 
                    value={deptForm.name} 
                    onChange={e => setDeptForm({...deptForm, name: e.target.value})} 
                    required 
                    style={{ height: '44px', background: 'var(--bg-input)' }}
                  />
                </div>
                <div className="form-group" style={{ flex: '1 1 120px' }}>
                  <label className="form-label">Routing Code</label>
                  <input 
                    className="input" 
                    placeholder="e.g. PARKS" 
                    value={deptForm.code} 
                    onChange={e => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})} 
                    required 
                    style={{ fontFamily: 'monospace', letterSpacing: '1px', textTransform: 'uppercase', height: '44px', background: 'var(--bg-input)' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', paddingTop: '22px' }} className="form-actions">
                  <button className="btn btn-primary" type="submit" style={{ height: '44px', background: 'var(--saffron)', color: 'var(--navy)', fontWeight: 800, padding: '0 24px', flexShrink: 0 }}>
                    {isEditingDept ? 'SAVE' : 'CREATE'}
                  </button>
                  {isEditingDept && (
                     <button className="btn btn-ghost" type="button" onClick={cancelEditDept} style={{ height: '44px', padding: '0 16px', fontWeight: 700, border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>CANCEL</button>
                  )}
                </div>
              </form>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                      <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department Name</th>
                      <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routing Code</th>
                      <th style={{ padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Staffing</th>
                      <th style={{ padding: '16px 24px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-mist)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-mist)' }}>No departments configured.</td></tr>
                    ) : departments.map(d => {
                      const officerCount = users.filter(u => u.departmentId === d.id && ['field_officer','dept_head'].includes(u.role)).length;
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 24px', fontSize: '0.9rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{d.id}</td>
                          <td style={{ padding: '16px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)' }}>
                              <BuildingIcon size={16} />
                            </div>
                            {d.name}
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ background: 'rgba(255,153,51,0.05)', border: '1px solid rgba(255,153,51,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--saffron)', fontWeight: 700, letterSpacing: '1px' }}>
                              {d.code}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <UsersIcon size={14} color="var(--text-mist)" />
                              <span style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>{officerCount}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEditDept(d)} style={{ color: 'var(--blue)', border: '1px solid rgba(52,152,219,0.3)', padding: '4px 12px' }}>Edit</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => deleteDept(d.id)} style={{ color: 'var(--red)', border: '1px solid rgba(192,57,43,0.3)', padding: '4px 12px' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .admin-header-container { padding: 32px 24px; }
          .admin-page-body { padding: 32px 40px; }
          .admin-tabs-container {
            display: inline-flex;
            background: var(--bg-input);
            padding: 4px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            margin-bottom: 24px;
            flex-wrap: wrap;
          }
          .admin-filter-bar {
            padding: 20px 24px; 
            border-bottom: 1px solid var(--border-color); 
            display: flex; 
            gap: 12px; 
            flex-wrap: wrap; 
            align-items: center; 
            background: var(--bg-card);
          }
          .dept-form-horizontal {
            display: flex;
            gap: 16px;
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .form-label {
            font-size: 0.75rem; 
            font-weight: 700; 
            color: var(--text-mist); 
            margin-bottom: 8px; 
            display: block; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
          }
          .admin-header-flex { display: flex; gap: 40px; flex-wrap: wrap; align-items: center; position: relative; z-index: 1; }
          .admin-page-title { font-family: 'Rajdhani', sans-serif; font-size: 2.8rem; text-shadow: 0 2px 10px var(--shadow-color); }
          .admin-stats-flex { display: flex; gap: 16px; flex-wrap: wrap; }
          .admin-stat-card {
            background: var(--bg-card);
            padding: 16px 24px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 16px;
            min-width: 180px;
            box-shadow: var(--shadow-sm);
            flex: 1;
            transition: all 0.3s ease;
          }
          .admin-stat-card.pending-active {
            border: 1px solid rgba(192,57,43,0.4);
            background: var(--red-dim);
          }
          .admin-stat-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-mist);
            letter-spacing: 0.05em;
          }
          .admin-stat-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--text-main);
          }
          @media (max-width: 768px) {
            .admin-header-container { padding: 90px 16px 20px 16px !important; }
            .admin-header-flex { gap: 16px; }
            .admin-page-body { padding: 20px 16px; }
            .admin-tabs-container { display: flex; width: 100%; border-radius: 8px; flex-direction: column; }
            .admin-tabs-container > button { width: 100%; padding: 12px !important; font-size: 0.85rem !important; }
            .admin-filter-bar { padding: 16px; }
            .dept-form-horizontal { flex-direction: column; gap: 12px; }
            .dept-form-horizontal > .form-group { width: 100%; flex: auto !important; }
            .dept-form-horizontal > .form-actions { width: 100%; padding-top: 8px !important; }
            .dept-form-horizontal > .form-actions button { flex: 1; }
            .admin-page-title { font-size: 2.5rem; }
            .admin-stat-card { min-width: 140px; padding: 12px 16px; flex: 1 1 45%; }
            .hide-mobile { display: none; }
          }
        `}</style>
      </div>
    </div>
  );
}
