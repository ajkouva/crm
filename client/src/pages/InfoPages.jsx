import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from '../components/Icons';

const PageHero = ({ title, subtitle }) => (
  <div style={{ 
    background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a8a 100%)', 
    padding: '80px 20px', 
    textAlign: 'center',
    color: '#fff',
    borderBottom: '4px solid var(--saffron)'
  }}>
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '16px', fontFamily: 'Rajdhani, sans-serif' }}>{title}</h1>
      <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', fontWeight: 300 }}>{subtitle}</p>
    </div>
  </div>
);

const Section = ({ title, children, dark = false }) => (
  <div style={{ 
    padding: '60px 20px', 
    background: dark ? 'var(--bg-body)' : 'var(--bg-card)',
    borderBottom: '1px solid var(--border-color)'
  }}>
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {title && <h2 style={{ fontSize: '2rem', color: 'var(--text-main)', marginBottom: '32px', fontFamily: 'Rajdhani, sans-serif' }}>{title}</h2>}
      {children}
    </div>
  </div>
);

const Navbar = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <nav style={{ 
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '20px 40px', background: 'var(--bg-card)', 
      backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100,
      borderBottom: '1px solid var(--border-color)'
    }}>
      <Link to={user ? "/dashboard" : "/"} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="PS-CRM" style={{ height: '32px' }} />
        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.2rem', letterSpacing: '1px' }}>PS-CRM</span>
      </Link>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <Link to="/about" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>About</Link>
        <Link to="/process" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>Process</Link>
        <Link to="/faq" style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>FAQ</Link>
        
        <button 
          onClick={toggleTheme}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'var(--bg-body)', color: 'var(--text-main)',
            border: '1px solid var(--border-color)', transition: 'all 0.2s'
          }}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
        </button>

        {user ? (
          <Link to="/dashboard" style={{ color: 'var(--saffron)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard →</Link>
        ) : (
          <Link to="/auth" style={{ color: 'var(--saffron)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>Login →</Link>
        )}
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer style={{ padding: '60px 20px', background: 'var(--bg-sidebar)', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <img src="/logo.png" alt="PS-CRM" style={{ height: '40px' }} />
      <div style={{ margin: '24px 0', display: 'flex', justifyContent: 'center', gap: '32px' }}>
        <Link to="/about" style={{ color: '#fff', textDecoration: 'none' }}>About</Link>
        <Link to="/process" style={{ color: '#fff', textDecoration: 'none' }}>Process</Link>
        <Link to="/faq" style={{ color: '#fff', textDecoration: 'none' }}>FAQ</Link>
        <Link to="/transparency" style={{ color: '#fff', textDecoration: 'none' }}>Transparency</Link>
      </div>
      <p style={{ fontSize: '0.8rem' }}>© 2026 Smart Public Service CRM • Government of India Initiative</p>
    </div>
  </footer>
);

export const AboutPage = ({ hideNavbar = false }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
    {!hideNavbar && <Navbar />}
    <PageHero 
      title="Empowering the Citizen" 
      subtitle="Modernizing public service through AI-driven transparency and immediate accountability." 
    />
    <Section title="Our Mission">
      <p style={{ lineHeight: 1.8, fontSize: '1.1rem', color: 'var(--text-dim)' }}>
        Smart Public Service (SPS-CRM) was born from a simple vision: Every citizen deserves a response. 
        Traditionally, grievance redressal in the public sector has been a slow, opaque process. 
        We use advanced AI to Bridge the gap between citizens and officials.
      </p>
    </Section>
    <Section title="How we differ" dark>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
        <div>
          <h3 style={{ color: 'var(--saffron)', marginBottom: '12px' }}>AI Sorting</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--mist)' }}>No more "wrong department" excuses. Our AI routes your complaint to the right officer in milliseconds.</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--saffron)', marginBottom: '12px' }}>Strict SLAs</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--mist)' }}>Every complaint has a ticking clock. If not addressed, it automatically escalates to senior collectors.</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--saffron)', marginBottom: '12px' }}>public Proof</h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-mist)' }}>Our public dashboard shows real-time resolution rates. Data doesn't lie.</p>
        </div>
      </div>
    </Section>
    <Footer />
  </div>
);

export const FAQPage = ({ hideNavbar = false }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
    {!hideNavbar && <Navbar />}
    <PageHero title="Frequently Asked Questions" subtitle="Quick answers to help you navigate the grievance redressal system." />
    <Section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {[
          { q: "How long does it take for a complaint to be resolved?", a: "Each category has a specific SLA (Service Level Agreement). Most urgent matters are resolved within 48 hours, while administrative tasks may take up to 7 days." },
          { q: "What happens if an officer misses the deadline?", a: "The complaint is automatically escalated to the Super Admin or District Collector, and the officer is flagged for a missed SLA." },
          { q: "Can I appeal a resolution?", a: "Yes. If an officer marks your complaint as 'Resolved' but you aren't satisfied, you have 48 hours to file an appeal." },
          { q: "Is my identity kept private?", a: "Your contact details are only visible to the assigned officer and high-level admins. They are never shared publicly." }
        ].map((item, i) => (
          <div key={i}>
            <h3 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '1.3rem' }}>{item.q}</h3>
            <p style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>{item.a}</p>
          </div>
        ))}
      </div>
    </Section>
    <Footer />
  </div>
);

export const ProcessPage = ({ hideNavbar = false }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
    {!hideNavbar && <Navbar />}
    <PageHero title="The Resolution Journey" subtitle="From filed to finished: see how we handle your grievances." />
    <Section>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', padding: '40px 0' }}>
        {[
          { step: "01", name: "Filing", desc: "Citizen submits a description, category, and priority. The system generates a unique tracking ID." },
          { step: "02", name: "AI Analysis", desc: "Our AI engine analyzes the content to verify the category and routes it to the specific sub-department officer." },
          { step: "03", name: "Action", desc: "The officer receives an instant notification. They must review and update the status within the SLA window." },
          { step: "04", name: "Resolution", desc: "Officer uploads proof of work and marks as resolved. Citizen receives an SMS/Email notification." }
        ].map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--text-mist)', opacity: 0.3, lineHeight: 0.8 }}>{p.step}</span>
            <div>
              <h3 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '12px' }}>{p.name}</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-dim)', maxWidth: '600px' }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
    <Footer />
  </div>
);
