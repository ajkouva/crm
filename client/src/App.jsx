import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ComplaintsList from './pages/ComplaintsList';
import ComplaintDetail from './pages/ComplaintDetail';
import SubmitComplaint from './pages/SubmitComplaint';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import PublicHome from './pages/PublicHome';
import TransparencyDashboard from './pages/TransparencyDashboard';
import AdminControls from './pages/AdminControls';
import TrackComplaint from './pages/TrackComplaint';
import PendingApproval from './pages/PendingApproval';
import { AboutPage, FAQPage, ProcessPage } from './pages/InfoPages';
import { api } from './utils/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

const MenuIcon = ({ size=24, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);

function Layout({ children }) {
  const { user } = useAuth();
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

    // Real-time notifications via Socket.io — no more polling
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
      
      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      <main className="main-content">
        {children || (
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/complaints" element={<ComplaintsList />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/submit" element={<SubmitComplaint />} />
            <Route path="/notifications" element={<Notifications onRead={refreshCount} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/admin" element={<AdminControls />} />
            <Route path="/track" element={<ComplaintsList />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Rajdhani,sans-serif', fontSize: '1.5rem', color: 'var(--mist)' }}>
      Loading PS-CRM…
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  // Restrict inactive users from entering the main app
  if (!user.active) return <Navigate to="/pending-approval" replace />;
  
  return children;
}

function PendingGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Rajdhani,sans-serif', fontSize: '1.5rem', color: 'var(--mist)' }}>
      Loading Verification status…
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  // If they are active, they shouldn't be on the pending screen
  if (user.active) return <Navigate to="/dashboard" replace />;
  
  return children;
}

function AppContent() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
