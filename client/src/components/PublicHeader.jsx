import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import { GlobeIcon, MoonIcon, SunIcon } from './Icons';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const IndiaFlag = ({ size = 28 }) => (
  <svg width={size * 1.43} height={size} viewBox="0 0 600 420" style={{ borderRadius: '2px', flexShrink: 0 }}>
    <rect width="600" height="140" fill="#FF9933" />
    <rect y="140" width="600" height="140" fill="#FFFFFF" />
    <rect y="280" width="600" height="140" fill="#138808" />
    <circle cx="300" cy="210" r="42" fill="#000080" />
    <circle cx="300" cy="210" r="28" fill="white" />
    {[...Array(24)].map((_, i) => {
      const angle = (i * 15 * Math.PI) / 180;
      return <line key={i} x1="300" y1="210" x2={300 + 42 * Math.cos(angle)} y2={210 + 42 * Math.sin(angle)} stroke="#000080" strokeWidth="2" />;
    })}
  </svg>
);

export default function PublicHeader() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.45, ease: 'power3.out' } });
    tl.from('.ph-header',   { y: -40, opacity: 0 })
      .from('.ph-flag',     { y: -40, opacity: 0 }, '-=0.25')
      .from('.ph-title',    { y: -40, opacity: 0 }, '-=0.25')
      .from('.ph-subtitle', { y: -40, opacity: 0 }, '-=0.25')
      .from('.ph-nav-link', { y: -40, opacity: 0, stagger: 0.1 }, '-=0.2')
      .from('.ph-controls', { y: -40, opacity: 0 }, '-=0.2');
  }, []);

  return (
    <>
      {/* Tricolour accent line at very top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 1001, background: 'linear-gradient(90deg, #FF9933 33%, #fff 33%, #fff 66%, #138808 66%)' }} />

      <header className="ph-header" style={{
        position: 'fixed', top: '3px', left: 0, right: 0, zIndex: 1000,
        background: theme === 'dark' ? 'rgba(10,25,47,0.97)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: theme === 'dark' ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}>
        {/* Left: Flag + Branding */}
        <Link to={user ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
          <span className="ph-flag"><IndiaFlag size={26} /></span>
          <div style={{ borderLeft: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`, paddingLeft: '12px' }}>
            <div className="ph-title" style={{ fontSize: '1.05rem', fontWeight: 900, color: theme === 'dark' ? '#fff' : 'var(--navy)', letterSpacing: '0.5px', lineHeight: 1.1 }}>PS-CRM</div>
            <div className="ph-subtitle gov-text" style={{ fontSize: '0.6rem', fontWeight: 700, color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'var(--text-mist)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '2px' }}>
              Government of India
            </div>
          </div>
        </Link>

        {/* Right: Nav + Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav className="header-nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link className="ph-nav-link" to="/about"   style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)', textDecoration: 'none', fontWeight: 600, fontSize: '0.78rem', transition: 'color 0.2s' }}>About</Link>
            <Link className="ph-nav-link" to="/process" style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)', textDecoration: 'none', fontWeight: 600, fontSize: '0.78rem', transition: 'color 0.2s' }}>Process</Link>
            <Link className="ph-nav-link" to="/faq"     style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'var(--text-dim)', textDecoration: 'none', fontWeight: 600, fontSize: '0.78rem', transition: 'color 0.2s' }}>FAQ</Link>
            <Link className="ph-nav-link" to="/track"   style={{ color: 'var(--saffron)', textDecoration: 'none', fontWeight: 700, fontSize: '0.78rem' }}>Track</Link>
          </nav>

          <div className="ph-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="lang-toggle"
              onClick={() => {
                const lang = typeof i18n?.language === 'string' ? i18n.language : 'en';
                i18n.changeLanguage(lang.startsWith('en') ? 'hi' : 'en');
              }}
              style={{ color: 'var(--saffron)', fontWeight: 800, background: 'rgba(255,255,255,0.07)', border: 'none', cursor: 'pointer', fontSize: '0.65rem', padding: '5px 9px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <GlobeIcon size={11} />
              <span>{(typeof i18n?.language === 'string' ? i18n.language : 'en').startsWith('en') ? 'HI' : 'EN'}</span>
            </button>

            <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: theme === 'dark' ? '#fff' : 'var(--text-main)', cursor: 'pointer', transition: 'background 0.2s' }}>
              {theme === 'light' ? <MoonIcon size={13} /> : <SunIcon size={13} />}
            </button>

            <Link to={user ? '/dashboard' : '/auth'} style={{ background: 'var(--saffron)', color: '#0a192f', padding: '7px 16px', borderRadius: '50px', fontWeight: 800, textDecoration: 'none', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {user ? 'Panel' : 'Login'}
            </Link>
          </div>
        </div>
      </header>

      <style>{`
        @media (max-width: 768px) {
          .header-nav-links { display: none !important; }
          .gov-text { font-size: 0.5rem !important; }
        }
        @media (max-width: 480px) {
          .gov-text { display: none !important; }
        }
      `}</style>
    </>
  );
}


