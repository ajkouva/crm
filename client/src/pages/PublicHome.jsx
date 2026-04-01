import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useTheme } from '../context/ThemeContext';
import { SubmitIcon, TrackIcon, AnalyticsIcon, InfoIcon } from '../components/Icons';
import PublicHeader from '../components/PublicHeader';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function PublicHome() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total: 0, resolved: 0, avgResolutionHours: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const desktopImages = ['/img1.jpeg', '/img2.jpg', '/img3.jpg', '/img4.jpeg', '/img5.jpeg'];
  const mobileImages = ['/mobile1.jpeg', '/mobile2.jpeg', '/mobile3.jpeg', '/mobile4.jpeg'];
  const bgImages = isMobile ? mobileImages : desktopImages;
  const [bgIndex, setBgIndex] = useState(0);


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setBgIndex(p => (p + 1) % bgImages.length), 5000);
    return () => clearInterval(timer);
  }, [bgImages.length]);

  useEffect(() => {
    const hostUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');
    fetch(`${hostUrl}/api/analytics/public/stats`)
      .then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  // ── GSAP: hero entrance animation (runs after header anim ~1.3s) ──────────
  useGSAP(() => {
    const tl = gsap.timeline();
    // div (h1) from top, p from bottom — both at same time
    tl.from('.hero-content-div', { y: -40, opacity: 0, delay: 1 }, 'together')
      .from('.hero-content-p',   { y:  40, opacity: 0, delay: 1 }, 'together')
      // buttons: primary to opacity 1/x 0, ghost to opacity 1/x 0 — same time
      .to('.btn-primary-hero', { x: 0, opacity: 1 }, 'btns')
      .to('.btn-ghost-hero',   { x: 0, opacity: 1 }, 'btns');
  });

  // ── GSAP: scroll-triggered feature cards + stats ───────────────────────────
  useGSAP(() => {
    gsap.from(".HeadingPage2",{
      y:-40,
      opacity:0,
      scrollTrigger:{
        trigger:".HeadingPage2",
        start:"top 50%",
        // markers:true,
        toggleActions:"play none none reverse",
      }
    })
    gsap.from(".feature-grid",{
      y:-40,
      opacity:0,
      scrollTrigger:{
        trigger:".feature-grid",
        start:"top 65%",
        // markers:true,
        toggleActions:"play none none reverse",
      }
    })
    gsap.from('.feature-card', {
      y: -20,
       opacity: 0,
        stagger: 0.1,
      scrollTrigger: {
        trigger: '.feature-grid',
        start: 'top 65%',
        toggleActions: 'play none none reverse',
      },
    });
      gsap.from('.Page2-lilte-Header', {
      y: -20,
       opacity: 0,
        stagger: 0.1,
      scrollTrigger: {
        trigger: '.Page2-lilte-Header',
        start: 'top 50%',
        toggleActions: 'play none none reverse',
      },
    });
    gsap.from('.stats-grid', {
      opacity: 0, 
      scale: 0.5,
      scrollTrigger: {
        trigger: '.stats-grid',
        start: 'top 70%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', color: 'var(--text-main)' }}>
      <PublicHeader />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero-section" style={{
        position: 'relative', width: '100%',
        height: '100svh', minHeight: '580px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a192f', overflow: 'hidden',
        paddingTop: '56px',   /* clears fixed header (3px stripe + ~53px bar) */
        boxSizing: 'border-box',
      }}>
        {bgImages.map((src, i) => (
          <img key={src} src={src} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: i === bgIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out', zIndex: 0,
          }} />
        ))}
        {/* Multi-stop gradient for depth */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(180deg, rgba(10,25,47,0.92) 0%, rgba(10,25,47,0.45) 45%, rgba(10,25,47,0.92) 100%)',
        }} />
        {/* Saffron accent bar at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', zIndex: 2,
          background: 'linear-gradient(90deg, #FF9933, #FFFFFF, #138808)',
        }} />

        <div className="hero-content" style={{
          position: 'relative', zIndex: 2, textAlign: 'center',
          padding: '0 20px', maxWidth: '860px', width: '100%',
        }}>
          <h1 className="hero-title hero-content-div" style={{
            fontSize: 'clamp(1.7rem, 5.5vw, 4.5rem)', color: '#fff', fontWeight: 950,
            fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.05,
            textShadow: '0 4px 24px rgba(0,0,0,0.7)', letterSpacing: '-0.5px',
            marginBottom: '16px',
          }}>
            {t('home.hero_title_1')}<br />
            <span style={{ color: 'var(--saffron)' }}>{t('home.hero_title_2')}</span>
          </h1>

          <p className="hero-subtitle hero-content-p" style={{
            fontSize: 'clamp(0.82rem, 2vw, 1.1rem)', color: 'rgba(255,255,255,0.88)',
            maxWidth: '600px', margin: '0 auto 28px', lineHeight: 1.6, fontWeight: 400,
          }}>
            {t('home.hero_subtitle')}
          </p>

          <div className="hero-buttons" style={{
            display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'nowrap',
          }}>
            <Link to={user ? '/submit' : '/auth'} className="btn-primary-hero"
              style={{
                padding: '12px 28px', fontSize: '0.9rem', fontWeight: 800,
                background: 'var(--saffron)', color: '#0a192f',
                borderRadius: '50px', textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(255,153,51,0.4)',
                transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                opacity: 0, transform: 'translateX(-40px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(255,153,51,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,153,51,0.4)'; }}
            >
              📋 {t('home.file_now')}
            </Link>
            <Link to="/transparency" className="btn-ghost-hero"
              style={{
                padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600,
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                borderRadius: '50px', textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.35)',
                backdropFilter: 'blur(12px)', transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                opacity: 0, transform: 'translateX(40px)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'none'; }}
            >
              🔍 Transparency Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-body)', padding: '80px 20px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section label */}
          <div className='HeadingPage2' style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--saffron)' }}>
              Core Capabilities
            </span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--text-main)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, marginTop: '12px' }}>
              Built for Every Indian Citizen
            </h2>
          </div>

          <div className="feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {[
              { icon: <SubmitIcon size={28} />, title: 'Instant Filing', desc: 'Upload photos, videos and descriptions. Receive a tracking ID in seconds.' },
              { icon: <AnalyticsIcon size={28} />, title: 'AI Routing', desc: 'Gemini AI ensures your complaint reaches exactly the right department.' },
              { icon: <TrackIcon size={28} />, title: 'Live Tracking', desc: 'Step-by-step updates via SMS and email at every resolution milestone.' },
              { icon: <InfoIcon size={28} />, title: '24/7 Support', desc: 'Digital assistance and toll-free helpline available for all citizens.' },
            ].map((f, i) => (
              <div key={i} className="feature-card card" style={{
                padding: '36px 28px',
                borderTop: '3px solid var(--saffron)',
              }}>
                <div style={{ color: 'var(--saffron)', marginBottom: '20px', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,153,51,0.1)', borderRadius: '12px' }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'Rajdhani, sans-serif', fontWeight: 800 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-dim)', lineHeight: 1.7, fontSize: '0.875rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ───────────────────────────────────── */}
      <section style={{ background: 'var(--navy)', padding: '72px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className='Page2-lilte-Header' style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,153,51,0.9)' }}>Live Data</span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#fff', fontFamily: 'Rajdhani, sans-serif', fontWeight: 800, marginTop: '12px' }}>
              National Grievance Dashboard
            </h2>
          </div>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            {[
              { val: stats.total?.toLocaleString() || '—', label: 'Total Filed', suffix: '' },
              { val: stats.resolved?.toLocaleString() || '—', label: 'Resolved', suffix: '' },
              { val: stats.avgResolutionHours || '—', label: 'Avg. Resolution', suffix: 'h' },
              { val: '94', label: 'Satisfaction', suffix: '%' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', fontFamily: 'Rajdhani, sans-serif', lineHeight: 1 }}>
                  {s.val}<span style={{ color: 'var(--saffron)', fontSize: '0.6em' }}>{s.suffix}</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────── */}
      <section style={{ background: 'var(--saffron)', padding: '56px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#0a192f', fontFamily: 'Rajdhani, sans-serif', fontWeight: 900, marginBottom: '12px' }}>
            Your Grievance Deserves Attention
          </h2>
          <p style={{ color: 'rgba(10,25,47,0.75)', marginBottom: '28px', fontSize: '0.95rem' }}>
            File online, via WhatsApp or by visiting your nearest e-Mitra kiosk.
          </p>
          <Link to={user ? '/submit' : '/auth'} style={{
            background: '#0a192f', color: '#fff', padding: '12px 36px',
            borderRadius: '50px', fontWeight: 800, textDecoration: 'none',
            fontSize: '0.95rem', display: 'inline-block',
          }}>
            File a Complaint Now →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ padding: '60px 24px 40px', background: '#0a192f', color: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '40px', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '6px', fontFamily: 'Rajdhani, sans-serif' }}>PS-CRM</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Government of India · Digital India</div>
            </div>
            <nav style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
              {[['About', '/about'], ['Process', '/process'], ['FAQ', '/faq'], ['Track', '/track'], ['Transparency', '/transparency']].map(([label, path]) => (
                <Link key={path} to={path} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>{label}</Link>
              ))}
            </nav>
          </div>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '28px' }} />
          {/* Tricolour stripe */}
          <div style={{ height: '3px', borderRadius: '2px', background: 'linear-gradient(90deg, #FF9933 33%, #fff 33%, #fff 66%, #138808 66%)', marginBottom: '24px', opacity: 0.6 }} />
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            © 2026 Smart Public Service CRM · Government of India Initiative · Powered by AI
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.4; }
        }
        /* ── RESPONSIVE ─────────────────────────── */
        @media (max-width: 1024px) {
          .feature-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stats-grid   { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 768px) {
          .hero-section  { padding-top: 56px !important; }
          .hero-content  { padding: 0 16px !important; }
          .hero-title    { font-size: clamp(1.8em, 8vw, 2.5rem) !important; margin-bottom: 14px !important; }
          .hero-subtitle { font-size: 0.95rem !important; margin-bottom: 24px !important; }
          .hero-buttons  { gap: 12px !important; flex-wrap: nowrap !important; }
          .hero-buttons a{ padding: 12px 24px !important; font-size: 0.85rem !important; }
          .feature-grid  { grid-template-columns: 1fr !important; gap: 14px !important; }
          .feature-card  { padding: 22px 18px !important; }
          .stats-grid    { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 400px) {
          .hero-title    { font-size: 1.6rem !important; }
          .hero-buttons a{ padding: 10px 18px !important; font-size: 0.78rem !important; }
        }
      `}</style>
    </div>
  );
}


