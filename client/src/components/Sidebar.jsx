import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import {
  DashboardIcon, ComplaintsIcon, SubmitIcon, AnalyticsIcon,
  AdminIcon, NotificationIcon, TrackIcon, LogoutIcon,
  InfoIcon, HelpIcon, ProcessIcon, SunIcon, MoonIcon
} from './Icons';

const NAV = {
  citizen:      [
    { to: '/dashboard', Icon: DashboardIcon, label: 'My Complaints' },
    { to: '/submit',    Icon: SubmitIcon,    label: 'New Complaint' },
    { to: '/complaints',Icon: TrackIcon,     label: 'Track Status' },
  ],
  field_officer:[
    { to: '/dashboard', Icon: DashboardIcon,   label: 'My Tasks' },
    { to: '/complaints',Icon: ComplaintsIcon,  label: 'All Complaints' },
  ],
  dept_head:    [
    { to: '/dashboard', Icon: DashboardIcon,  label: 'Dashboard' },
    { to: '/complaints',Icon: ComplaintsIcon, label: 'Complaints' },
    { to: '/analytics', Icon: AnalyticsIcon,  label: 'Analytics' },
  ],
  collector:    [
    { to: '/dashboard', Icon: DashboardIcon,  label: 'Dashboard' },
    { to: '/complaints',Icon: ComplaintsIcon, label: 'All Complaints' },
    { to: '/analytics', Icon: AnalyticsIcon,  label: 'Analytics' },
    { to: '/admin',     Icon: AdminIcon,      label: 'Admin Controls' },
  ],
  super_admin:  [
    { to: '/dashboard', Icon: DashboardIcon,  label: 'Dashboard' },
    { to: '/complaints',Icon: ComplaintsIcon, label: 'All Complaints' },
    { to: '/analytics', Icon: AnalyticsIcon,  label: 'Analytics' },
    { to: '/admin',     Icon: AdminIcon,      label: 'Admin Controls' },
  ],
};

const ROLE_LABELS = {
  citizen: 'Citizen', field_officer: 'Field Officer', dept_head: 'Dept. Head',
  collector: 'Collector', super_admin: 'Super Admin'
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button 
      className="theme-toggle-btn"
      onClick={toggleTheme}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', 
        padding: '6px 12px', borderRadius: '20px', 
        background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)',
        fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)',
        transition: 'all 0.2s', width: '100%'
      }}
    >
      {theme === 'light' ? <MoonIcon size={14} /> : <SunIcon size={14} />}
      <span className="hide-collapsed">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  );
};

export default function Sidebar({ notifCount = 0, isOpen = false, onClose, isCollapsed, onToggleCollapse }) {
  const { user, logout } = useAuthStore();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const links = NAV[user?.role] || NAV.citizen;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={s.sidebar}>

      <div style={s.brand} className="brand">
        <button className="desktop-only" onClick={onToggleCollapse} aria-label="Toggle Sidebar" style={{ color: '#fff', padding: '4px', background:'none', border:'none', display:'flex', alignItems:'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <img src="/logo.png" alt="PS-CRM" style={{ height: '38px', marginRight: '6px' }} />
        <div className="hide-collapsed" style={{ flex: 1 }}>
          <div style={s.brandName}>PS-CRM</div>
          <div style={s.brandSub}>Public Service Portal</div>
        </div>
        <div className="mobile-only">
          <button onClick={onClose} aria-label="Close menu" style={{ color: '#fff', padding: '4px', background:'none', border:'none', display:'flex', alignItems:'center' }}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', justifyContent: 'flex-start' }}>
        <ThemeToggle />
      </div>


      {/* Nav */}
      <nav style={s.nav}>
        {links.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose} className="nav-link" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}>
            <Icon size={18} />
            <span className="hide-collapsed">{label}</span>
          </NavLink>
        ))}

        {/* Notifications — always last */}
        <NavLink to="/notifications" onClick={onClose} className="nav-link" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}>
          <NotificationIcon size={18} />
          <span className="hide-collapsed">Notifications</span>
          {notifCount > 0 && (
            <span style={s.badge} className="hide-collapsed">{notifCount > 99 ? '99+' : notifCount}</span>
          )}
        </NavLink>

        {/* Info Links */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="hide-collapsed" style={{ padding: '0 12px 8px', fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</div>
          <NavLink to="/about" onClick={onClose} className="nav-link" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}>
            <InfoIcon size={18} />
            <span className="hide-collapsed">About</span>
          </NavLink>
          <NavLink to="/process" onClick={onClose} className="nav-link" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}>
            <ProcessIcon size={18} />
            <span className="hide-collapsed">Process</span>
          </NavLink>
          <NavLink to="/faq" onClick={onClose} className="nav-link" style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}>
            <HelpIcon size={18} />
            <span className="hide-collapsed">FAQ</span>
          </NavLink>
        </div>
      </nav>

      {/* User info + sign out */}
      <div style={s.bottom} className="bottom">
        <button 
          className="btn btn-ghost btn-sm hide-collapsed"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--saffron)', borderColor: 'rgba(255,153,51,0.2)', marginBottom: '8px' }}
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('hi') ? 'en' : 'hi')}
        >
          {i18n.language.startsWith('hi') ? 'A/अ English' : 'A/अ हिन्दी'}
        </button>
        <div style={s.userRow} className="userRow">
          <div style={s.avatar} title={user?.name}>{user?.name?.[0]?.toUpperCase()}</div>
          <div className="hide-collapsed" style={{ flex: 1, minWidth: 0 }}>
            <div style={s.userName}>{user?.name}</div>
            <div style={s.userRole}>{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.12)' }}
          onClick={handleLogout}
        >
          <LogoutIcon size={15} />
          <span className="hide-collapsed">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

const s = {
  sidebar:   { position: 'fixed', top: 0, left: 0, height: '100svh', background: 'var(--navy)', display: 'flex', flexDirection: 'column', padding: 0, zIndex: 100 },
  brand:     { display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 },
  ashoka:    { fontSize: '1.75rem' },
  brandName: { fontFamily: 'Rajdhani,sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#fff', letterSpacing: '0.05em' },
  brandSub:  { fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  nav:       { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' },
  link:      { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.65)', transition: 'all 0.15s', position: 'relative' },
  linkActive:{ background: 'rgba(255,153,51,0.15)', color: 'var(--saffron)' },
  badge:     { marginLeft: 'auto', background: 'var(--red)', color: '#fff', borderRadius: '10px', fontSize: '0.7rem', padding: '1px 6px', fontWeight: 700, minWidth: '18px', textAlign: 'center' },
  bottom:    { padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' },
  userRow:   { display: 'flex', alignItems: 'center', gap: '10px', padding: '4px' },
  avatar:    { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--saffron)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 },
  userName:  { fontSize: '0.875rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole:  { fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' },
};


