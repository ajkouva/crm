import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const ShieldIcon = ({ size=48, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const LogoutIcon = ({ size=18, color="currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;

export default function PendingApproval() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-body)', padding: '20px' }}>
      <div className="card fade-up" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        textAlign: 'center', 
        padding: '60px 40px',
        border: '1px solid rgba(255,153,51,0.3)',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(255,153,51,0.05) 100%)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '90px', height: '90px', background: 'rgba(255,153,51,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)', border: '2px solid rgba(255,153,51,0.3)', animation: 'pulse 2s infinite' }}>
            <ShieldIcon />
          </div>
        </div>

        <h1 style={{ fontFamily: 'Rajdhani,sans-serif', fontSize: '2.4rem', color: 'var(--text-main)', margin: '0 0 16px 0', fontWeight: 800 }}>Clearance Pending</h1>
        
        <p style={{ color: 'var(--text-mist)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '24px' }}>
          Welcome, <strong style={{ color: 'var(--text-main)' }}>{user?.name}</strong>. Your account has been securely registered on the PS-CRM network. 
        </p>

        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
          <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Security Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-india)' }}></div>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Email Verified</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--saffron)', animation: 'pulse 1s infinite' }}></div>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>Awaiting Administrator Approval</span>
          </div>
        </div>

        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '40px' }}>
          As a designated <strong style={{ color: 'var(--saffron)' }}>{user?.role.replace('_', ' ')}</strong>, manual authorization from a Super Admin or Collector is required before network access is granted. Please contact your department head if this takes longer than expected.
        </p>

        <button 
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
        >
          <LogoutIcon /> SECURE LOGOUT
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,153,51,0.4); }
          70% { box-shadow: 0 0 0 15px rgba(255,153,51,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,153,51,0); }
        }
      `}</style>
    </div>
  );
}


