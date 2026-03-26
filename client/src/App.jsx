import { lazy, Suspense, useEffect, useState, useCallback, memo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import useAuthStore from './store/useAuthStore';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import GlobalLoader from './components/GlobalLoader';
import { api } from './utils/api';

// ── Code Split: All major pages are lazy-loaded ────────────────────────────
const AuthPage              = lazy(() => import('./pages/AuthPage'));
const Dashboard             = lazy(() => import('./pages/Dashboard'));
const ComplaintsList        = lazy(() => import('./pages/ComplaintsList'));
const ComplaintDetail       = lazy(() => import('./pages/ComplaintDetail'));
const SubmitComplaint       = lazy(() => import('./pages/SubmitComplaint'));
const Notifications         = lazy(() => import('./pages/Notifications'));
const Analytics             = lazy(() => import('./pages/Analytics'));
const PublicHome            = lazy(() => import('./pages/PublicHome'));
const TransparencyDashboard = lazy(() => import('./pages/TransparencyDashboard'));
const AdminControls         = lazy(() => import('./pages/AdminControls'));
const TrackComplaint        = lazy(() => import('./pages/TrackComplaint'));
const PendingApproval       = lazy(() => import('./pages/PendingApproval'));
const { AboutPage, FAQPage, ProcessPage } = {
  AboutPage:   lazy(() => import('./pages/InfoPages').then(m => ({ default: m.AboutPage }))),
  FAQPage:     lazy(() => import('./pages/InfoPages').then(m => ({ default: m.FAQPage }))),
  ProcessPage: lazy(() => import('./pages/InfoPages').then(m => ({ default: m.ProcessPage }))),
};

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

// ── Icons ──────────────────────────────────────────────────────────────────
const MenuIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// ── Layout ─────────────────────────────────────────────────────────────────
function Layout({ children }) {
  const { user } = useAuthStore();
  const [notifCount, setNotifCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const refreshCount = useCallback(() => {
    api.notifications()
      .then(ns => setNotifCount(ns.filter(n => !n.read).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshCount();
    const socket = io(SOCKET_URL, { withCredentials: true });
    socket.emit('join', user.id);
    socket.on('notification', () => setNotifCount(prev => prev + 1));
    return () => socket.disconnect();
  }, [user, refreshCount]);

  return (
    <div className={`page-layout ${desktopCollapsed ? 'layout-collapsed' : ''}`}>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button className="menu-btn" style={{ padding: '8px', display: 'flex', color: '#fff', border: 'none', background: 'none' }} onClick={() => setMobileMenuOpen(prev => !prev)}>
          <MenuIcon size={24} color="#fff" />
        </button>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.png" alt="PS-CRM" style={{ height: '32px' }} />
        </Link>
        <div style={{ width: '40px' }} />
      </div>

      <Sidebar
        notifCount={notifCount}
        onNotifRead={refreshCount}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isCollapsed={desktopCollapsed}
        onToggleCollapse={() => setDesktopCollapsed(prev => !prev)}
      />

      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      <main className="main-content">
        {children || (
          <Suspense fallback={<GlobalLoader />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/complaints" element={<ComplaintsList />} />
              <Route path="/complaints/:id" element={<ComplaintDetail />} />
              <Route path="/submit" element={<SubmitComplaint />} />
              <Route path="/notifications" element={<Notifications onRead={refreshCount} />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/admin" element={<AdminControls />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>
    </div>
  );
}

// ── Auth Guards ────────────────────────────────────────────────────────────
function Guard({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.active) return <Navigate to="/pending-approval" replace />;
  return children;
}

function PendingGuard({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.active) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── App Bootstrap ──────────────────────────────────────────────────────────
function AppContent() {
  const { user, bootstrap } = useAuthStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/transparency" element={<TransparencyDashboard />} />
          <Route path="/track" element={<TrackComplaint />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Walled-Garden for unapproved users */}
          <Route path="/pending-approval" element={<PendingGuard><PendingApproval /></PendingGuard>} />

          {/* Info Pages (Hybrid: Sidebar if logged in, Navbar if public) */}
          <Route path="/about" element={user ? <Guard><Layout><AboutPage hideNavbar /></Layout></Guard> : <AboutPage />} />
          <Route path="/faq" element={user ? <Guard><Layout><FAQPage hideNavbar /></Layout></Guard> : <FAQPage />} />
          <Route path="/process" element={user ? <Guard><Layout><ProcessPage hideNavbar /></Layout></Guard> : <ProcessPage />} />

          <Route path="/*" element={<Guard><Layout /></Guard>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}


