import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  SubmitIcon, TrackIcon, 
  AnalyticsIcon, InfoIcon, SunIcon, MoonIcon 
} from '../components/Icons';

const IndiaFlag = () => (
  <svg width="24" height="16" viewBox="0 0 900 600" style={{ borderRadius: '2px' }}>
    <rect width="900" height="200" fill="#FF9933"/>
    <rect width="900" height="200" y="200" fill="#FFFFFF"/>
    <rect width="900" height="200" y="400" fill="#138808"/>
    <circle cx="450" cy="300" r="40" fill="none" stroke="#000080" strokeWidth="2"/>
    {[...Array(24)].map((_, i) => (
      <line key={i} x1="450" y1="300" x2={450 + 40 * Math.sin(i * Math.PI / 12)} y2={300 - 40 * Math.cos(i * Math.PI / 12)} stroke="#000080" strokeWidth="1"/>
    ))}
  </svg>
);

const GlobeIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
);

export default function PublicHome() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({ total: 0, resolved: 0, avgResolutionHours: 0 });

  useEffect(() => {
    fetch('http://localhost:3001/api/analytics/public/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => { });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', color: 'var(--text-main)', transition: 'background 0.3s' }}>
      {/* Top Bar */}
      <div className="top-bar" style={{ 
        background: 'var(--bg-sidebar)', color: '#fff', padding: '10px 24px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem',
        flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IndiaFlag />
          <span style={{ fontWeight: 600, letterSpacing: '0.5px', fontSize: '0.7rem' }}>GOVERNMENT OF INDIA</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              const currentLang = typeof i18n?.language === 'string' ? i18n.language : 'en';
              i18n.changeLanguage(currentLang.startsWith('en') ? 'hi' : 'en');
            }}
            style={{ color: 'var(--saffron)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <GlobeIcon size={16} />
            <span className="mobile-hide">{(typeof i18n?.language === 'string' ? i18n.language : 'en').startsWith('en') ? 'A/अ Hindi' : 'A/अ English'}</span>
            <span className="mobile-only">{(typeof i18n?.language === 'string' ? i18n.language : 'en').startsWith('en') ? 'HI' : 'EN'}</span>
          </button>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }}></div>
          <button 
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.1)', border: 'none',
              width: '32px', height: '32px', borderRadius: '50%', color: '#fff',
              cursor: 'pointer', transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <span className="mobile-hide" style={{ marginLeft: '8px', opacity: 0.8 }}>1800-XXX-XXXX</span>
        </div>
      </div>

      {/* Sticky Navbar */}
      <nav className="public-nav" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '15px 24px', background: 'var(--bg-card)', 
        borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(10px)', flexWrap: 'wrap', gap: '15px'
      }}>
        <Link to={user ? "/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '32px' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.5px' }}>PS-CRM</span>
        </Link>
        <div className="nav-links" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/about" className="mobile-hide" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>About</Link>
          <Link to="/process" className="mobile-hide" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>Process</Link>
          <Link to="/faq" className="mobile-hide" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>FAQ</Link>
          <Link to={user ? "/dashboard" : "/auth"} style={{ 
            background: 'var(--saffron)', color: 'var(--navy)', 
            padding: '8px 18px', borderRadius: 'var(--radius)', 
            fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--shadow)',
            fontSize: '0.85rem'
          }}>
            {user ? 'Dashboard →' : 'Login →'}
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }} className="home-main">
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 className="hero-title" style={{ fontSize: '4rem', color: 'var(--text-main)', marginBottom: '20px', fontWeight: 900, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1 }}>
            {t('home.hero_title_1')} <br className="mobile-hide" /> <span style={{ color: 'var(--saffron)' }}>{t('home.hero_title_2')}</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-dim)', maxWidth: '750px', margin: '0 auto 40px', lineHeight: 1.6 }}>
            {t('home.hero_subtitle')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/auth" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem', background: 'var(--navy)', color: '#fff' }}>{t('home.file_now')}</Link>
            <Link to="/transparency" className="btn btn-ghost" style={{ padding: '14px 28px', fontSize: '1rem' }}>{t('home.track_status')}</Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px', marginBottom: '100px' }}>
          {[
            { icon: <SubmitIcon size={32} />, title: "Instant Filing", desc: "Easily upload photos, videos, and descriptions. Get a tracking ID instantly." },
            { icon: <AnalyticsIcon size={32} />, title: "AI Routing", desc: "Advanced Gemini analysis ensures your complaint reaches the right department immediately." },
            { icon: <TrackIcon size={32} />, title: "Live Tracking", desc: "Step-by-step resolution status with SMS and email notifications at every milestone." },
            { icon: <InfoIcon size={32} />, title: "24/7 Helpline", desc: "Integrated digital assistance and toll-free helpline for remote or elderly citizens." }
          ].map((feature, i) => (
            <div key={i} className="card fade-up" style={{ padding: '48px 40px', textAlign: 'left', animationDelay: `${i * 0.15}s` }}>
              <div style={{ color: 'var(--saffron)', marginBottom: '24px' }}>{feature.icon}</div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '16px', fontFamily: 'Rajdhani, sans-serif' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.6, fontSize: '0.95rem' }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Live Stats */}
        <div className="stats-section" style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '24px', background: 'var(--bg-card)', padding: '60px 40px', 
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {[
            { label: t('list.title', { defaultValue: 'Total Complaints' }), val: stats.total?.toLocaleString() || "..." },
            { label: t('home.stats_resolved'), val: stats.resolved?.toLocaleString() || "..." },
            { label: t('home.stats_avg_time'), val: `${stats.avgResolutionHours}h` },
            { label: "Citizen Satisfaction", val: "94%" }
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'Rajdhani, sans-serif' }}>{s.val}</div>
              <div style={{ color: 'var(--text-mist)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* WhatsApp Integration Section */}
      <section className="whatsapp-section" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '100px 24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--text-main)', marginBottom: '24px', fontFamily: 'Rajdhani, sans-serif', display: 'flex', alignItems: 'center', gap: '12px' }}>
              फाइल करें व्हाट्सएप पर 
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-dim)', marginBottom: '32px', lineHeight: 1.6 }}>
              Prefer chatting? Just text our bilingual WhatsApp assistant to file or track grievances in seconds. 
              Upload photos and get live updates directly on your phone.
            </p>
            <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '12px',
              background: '#25D366', color: '#fff', padding: '14px 32px', borderRadius: '50px',
              fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(37,211,102,0.3)'
            }}>
               Chat with PS-CRM BOT
            </a>
          </div>
          <div style={{ background: 'var(--bg-body)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
              <blockquote style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontStyle: 'italic', marginBottom: '20px' }}>
                "The system is surprisingly fast. I filed a road issue on Monday and it was fixed by Wednesday!"
              </blockquote>
              <div style={{ fontWeight: 700, color: 'var(--saffron)' }}>— Rakesh Kumar, Ranchi</div>
          </div>
        </div>
      </section>

      <footer style={{ padding: '80px 24px', background: 'var(--bg-sidebar)', color: '#fff', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '40px', flexWrap: 'wrap' }}>
            <Link to="/about" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 600 }}>About Us</Link>
            <Link to="/process" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 600 }}>Resolution Process</Link>
            <Link to="/faq" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 600 }}>Help / FAQ</Link>
            <Link to="/transparency" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: 600 }}>Transparency Dashboard</Link>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '40px' }}></div>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, letterSpacing: '0.5px' }}>© 2026 Smart Public Service CRM • Government of India Initiative</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '8px' }}>Designed for Digital India • Powered by Advanced Generative AI</p>
        </div>
      </footer>

      <style>{`
        .mobile-hide { display: inline; }
        @media (max-width: 1024px) {
          .feature-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .stats-section { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .mobile-hide { display: none !important; }
          .mobile-only { display: inline !important; }
          .feature-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
          .hero-title { font-size: 2.5rem !important; }
          .home-main { padding: 40px 16px !important; }
          .card { padding: 32px 24px !important; }
          .public-nav { padding: 12px 16px !important; justify-content: center !important; }
          .top-bar { justify-content: space-between !important; text-align: left; padding: 12px 16px !important; }
          .stats-section { padding: 40px 20px !important; grid-template-columns: 1fr !important; }
          .whatsapp-section { padding: 60px 16px !important; }
        }
      `}</style>
    </div>
  );
}
