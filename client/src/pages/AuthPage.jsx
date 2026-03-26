import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { api, setToken } from '../utils/api';
import CustomSelect from '../components/CustomSelect';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function AuthPage() {
  // ── GSAP: auth entrance animation ─────────────────────────────────────────
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.from('.auth-left', { x: -100, opacity: 0, duration: 0.6, ease: 'power3.out' }, 'enter')
      .from('.auth-right .card', { scale: 0.9, opacity: 0, duration: 0.5, ease: 'back.out(1.4)' }, 'enter+=0.1');
  }, { dependencies: [] });

  const { login, register } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'citizen', departmentId: '', serviceArea: '' });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [fpMode, setFpMode] = useState(false);   // show the forgot-pw panel?
  const [fpStep, setFpStep] = useState(1);       // 1 = enter email, 2 = enter OTP+new pw
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpPassword, setFpPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpDevCode, setFpDevCode] = useState('');      // OTP shown in dev mode
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  // Registration verification state
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyDevCode, setVerifyDevCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(e => console.error('Failed to load depts:', e.message));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError(''); setLoading(true);

    // Security Hardening: Frontend sanitization
    const cleanEmail = (form.email || '').trim().toLowerCase();
    const cleanForm = { ...form, email: cleanEmail };

    try {
      if (mode === 'login') {
        await login(cleanEmail, form.password);
        navigate('/dashboard');
      } else {
        const res = await register(cleanForm);
        setVerifyEmail(cleanEmail);
        setVerifyDevCode(res.devOtp || '');
        setVerifyMode(true);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const resendVerification = async () => {
    setError(''); setLoading(true);
    const cleanEmail = (form.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address first.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.resendVerification(cleanEmail);
      setVerifyEmail(cleanEmail);
      setVerifyDevCode(res.devOtp || '');
      setVerifyMode(true);
    } catch (e) {
      setError('Failed to resend code: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    setVerifyError(''); setVerifyLoading(true);
    try {
      await api.verifyEmail(verifyEmail, verifyOtp);
      setVerifySuccess('Email verified! You can now log in.');
      setTimeout(() => {
        setVerifyMode(false);
        setMode('login');
        setVerifySuccess('');
        setVerifyEmail('');
        setVerifyOtp('');
      }, 3000);
    } catch (err) {
      setVerifyError(err.message);
    } finally { setVerifyLoading(false); }
  };

  const needsDept = ['field_officer', 'dept_head'].includes(form.role);

  // Step 1: send OTP
  const sendResetCode = async (e) => {
    e.preventDefault();
    setFpError(''); setFpLoading(true);
    try {
      const res = await api.forgotPassword(fpEmail);
      setFpDevCode(res.otp || '');   // dev mode: OTP in response
      setFpStep(2);
    } catch (err) {
      setFpError(err.message);
    } finally { setFpLoading(false); }
  };

  // Step 2: verify OTP + set new password
  const submitReset = async (e) => {
    e.preventDefault();
    setFpError('');
    if (fpPassword !== fpConfirm) { setFpError('Passwords do not match'); return; }
    if (fpPassword.length < 8) { setFpError('Password must be at least 8 characters'); return; }
    setFpLoading(true);
    try {
      await api.resetPassword(fpEmail, fpOtp, fpPassword);
      setFpSuccess('Password reset! You can now log in.');
      setTimeout(() => { setFpMode(false); setFpStep(1); setFpSuccess(''); setFpDevCode(''); }, 3000);
    } catch (err) {
      setFpError(err.message);
    } finally { setFpLoading(false); }
  };

  return (
    <div className="auth-page fade-up">
      {/* Left Panel: Brand & Info */}
      <div className="auth-left">
        {/* Background Accent */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(255,153,51,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '32px', background: 'var(--white)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, background: '#FF9933' }} />
              <div style={{ flex: 1, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid #000080' }} />
              </div>
              <div style={{ flex: 1, background: '#138808' }} />
            </div>
            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#fff', letterSpacing: '0.05em' }}>PS-CRM</span>
          </div>

          <h1 style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '20px', color: '#fff' }}>
            Smart Public <br />
            Service CRM
          </h1>

          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '400px' }}>
            Empowering citizens. Enabling officers. <br />
            Transforming governance across India.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {[
              { label: 'Departments', value: '12+', sub: 'INTEGRATED' },
              { label: 'P1 Response', value: '24hr', sub: 'SLA TARGET' },
              { label: 'Auto-Classify', value: 'AI', sub: 'POWERED' },
              { label: 'SLA Tracking', value: 'Real-time', sub: 'MONITORING' }
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--saffron)', marginBottom: '4px' }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Form */}
      <div className="auth-right">
        <div className="card fade-up" style={{ padding: '48px 40px', width: '100%', maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'var(--shadow-ambient)', borderRadius: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '2rem', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p style={{ color: 'var(--text-mist)', fontSize: '0.95rem' }}>
              {mode === 'login' ? 'Access the PS-CRM portal' : 'Join the public service network'}
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(192,57,43,0.1)', color: 'var(--red)', padding: '12px', borderRadius: 'var(--radius)', fontSize: '0.875rem', marginBottom: '20px', border: '1px solid rgba(192,57,43,0.2)' }}>
              {error}
              {error.includes('verify your email') && (
                <button
                  type="button"
                  onClick={resendVerification}
                  style={{ display: 'block', marginTop: '10px', background: 'var(--saffron)', color: 'var(--navy)', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  Enter Code or Resend Verification
                </button>
              )}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {mode === 'register' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Full Name</label>
                  <input className="input" placeholder="Your full name" value={form.name} onChange={set('name')} style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Role</label>
                  <CustomSelect
                    className="input"
                    value={form.role}
                    onChange={set('role')}
                    options={[
                      { label: 'Citizen', value: 'citizen' },
                      { label: 'Field Officer', value: 'field_officer' },
                      { label: 'Department Head', value: 'dept_head' },
                      { label: 'Collector', value: 'collector' },
                      { label: 'Super Admin', value: 'super_admin' }
                    ]}
                  />
                </div>
                {needsDept && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Department</label>
                    <CustomSelect
                      className="input"
                      value={form.departmentId}
                      onChange={set('departmentId')}
                      placeholder="Select department"
                      options={[
                        { label: 'Select department', value: '' },
                        ...departments.map(d => ({ label: d.name, value: d.id }))
                      ]}
                    />
                  </div>
                )}
                {form.role === 'field_officer' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Service Area / Location</label>
                    <input
                      className="input"
                      placeholder="e.g. Piru Madara, Ward 5, Zone B"
                      value={form.serviceArea}
                      onChange={set('serviceArea')}
                      style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-mist)' }}>Complaints from this area will be auto-assigned to you.</span>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Email Address</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }} required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)' }}>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setFpMode(true); setFpStep(1); setFpError(''); setFpDevCode(''); setFpSuccess(''); }}
                    style={{ fontSize: '0.8rem', color: 'var(--saffron)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)', letterSpacing: '3px' }} required />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', height: '52px', justifyContent: 'center', marginTop: '12px', background: 'var(--saffron)', color: 'var(--navy)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(255,153,51,0.3)' }}>
              {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          {/* ── Forgot Password Panel ── */}
          {fpMode && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 999,
              background: 'rgba(0,11,31,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', backdropFilter: 'blur(12px)'
            }}>
              <div className="card fade-up" style={{
                background: 'var(--bg-card)', borderRadius: '24px', padding: '48px 40px',
                width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-ambient)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontFamily: 'Rajdhani,sans-serif', color: 'var(--text-main)', margin: 0 }}>
                    {fpStep === 1 ? '🔑 Reset Password' : '🔒 Set New Password'}
                  </h3>
                  <button onClick={() => setFpMode(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-mist)' }}>✕</button>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {[1, 2].map(s => (
                    <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: s <= fpStep ? 'var(--saffron)' : 'var(--border-color)' }} />
                  ))}
                </div>

                {fpSuccess && (
                  <div style={{ background: 'var(--green-dim)', color: 'var(--green-india)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 600 }}>
                    ✓ {fpSuccess}
                  </div>
                )}
                {fpError && (
                  <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px', fontSize: '0.875rem' }}>
                    {fpError}
                  </div>
                )}



                {fpStep === 1 ? (
                  <form onSubmit={sendResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>Registered Email</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="you@example.com"
                        value={fpEmail}
                        onChange={e => setFpEmail(e.target.value)}
                        required
                        autoFocus
                        style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }}
                      />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={fpLoading} style={{ width: '100%', height: '52px', justifyContent: 'center', background: 'var(--saffron)', color: 'var(--navy)', fontWeight: 800, fontSize: '1.05rem', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(255,153,51,0.3)' }}>
                      {fpLoading ? 'Sending...' : 'Send Reset Code →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={submitReset} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>6-Digit Reset Code</label>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <input
                            key={idx}
                            id={`fp-otp-${idx}`}
                            type="text"
                            maxLength={1}
                            value={fpOtp[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (!val && e.target.value !== '') return;
                              const newOtp = fpOtp.split('');
                              newOtp[idx] = val;
                              const joined = newOtp.join('').slice(0, 6);
                              setFpOtp(joined);
                              if (val && idx < 5) document.getElementById(`fp-otp-${idx + 1}`).focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !fpOtp[idx] && idx > 0) {
                                document.getElementById(`fp-otp-${idx - 1}`).focus();
                              }
                            }}
                            style={{
                              width: '44px', height: '52px', fontSize: '1.4rem', fontWeight: 700,
                              textAlign: 'center', background: 'var(--bg-section)', border: '2px solid var(--border-color)',
                              borderRadius: '12px', color: 'var(--text-main)', transition: 'all 0.2s ease',
                              outline: 'none', borderColor: fpOtp[idx] ? 'var(--saffron)' : 'var(--border-color)'
                            }}
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>New Password</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Min 8 characters"
                        value={fpPassword}
                        onChange={e => setFpPassword(e.target.value)}
                        required
                        style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: '8px' }}>Confirm New Password</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Repeat password"
                        value={fpConfirm}
                        onChange={e => setFpConfirm(e.target.value)}
                        required
                        style={{ height: '52px', fontSize: '1rem', background: 'var(--bg-input)' }}
                      />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={fpLoading} style={{ width: '100%', height: '52px', justifyContent: 'center', marginTop: '8px', background: 'var(--saffron)', color: 'var(--navy)', fontWeight: 800, fontSize: '1.05rem', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(255,153,51,0.3)' }}>
                      {fpLoading ? 'Resetting...' : 'Reset Password ✓'}
                    </button>
                    <button type="button" onClick={() => { setFpStep(1); setFpError(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-mist)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                      ← Back
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ── Email Verification Modal ── */}
          {verifyMode && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px'
            }}>
              <div className="card fade-up" style={{
                background: 'var(--bg-card)', borderRadius: '24px', padding: '48px 40px',
                width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-ambient)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{
                    width: '64px', height: '64px', background: 'rgba(255,153,51,0.1)',
                    borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 20px', color: 'var(--saffron)'
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" /><polyline points="2 6 12 13 22 6" /><circle cx="18" cy="19" r="3" /><polyline points="17 19 18 20 20 18" /></svg>
                  </div>
                  <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '8px' }}>Verify Your Email</h3>
                  <p style={{ color: 'var(--text-mist)', fontSize: '0.9rem' }}>
                    We've sent a 6-digit verification code to <br />
                    <strong style={{ color: 'var(--text-main)' }}>{verifyEmail}</strong>
                  </p>
                </div>

                {verifySuccess && (
                  <div style={{ background: 'var(--green-dim)', color: 'var(--green-india)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '24px', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>
                    ✓ {verifySuccess}
                  </div>
                )}
                {verifyError && (
                  <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '24px', fontSize: '0.875rem', textAlign: 'center' }}>
                    {verifyError}
                  </div>
                )}



                <form onSubmit={submitVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: 'var(--text-dim)', textAlign: 'center' }}>Enter 6-Digit Code</label>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
                      {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          maxLength={1}
                          value={verifyOtp[idx] || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            if (!val && e.target.value !== '') return;
                            const newOtp = verifyOtp.split('');
                            newOtp[idx] = val;
                            const joined = newOtp.join('').slice(0, 6);
                            setVerifyOtp(joined);
                            if (val && idx < 5) document.getElementById(`otp-${idx + 1}`).focus();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !verifyOtp[idx] && idx > 0) {
                              document.getElementById(`otp-${idx - 1}`).focus();
                            }
                          }}
                          style={{
                            width: '48px', height: '56px', fontSize: '1.5rem', fontWeight: 700,
                            textAlign: 'center', background: 'var(--bg-section)', border: '2px solid var(--border-color)',
                            borderRadius: '12px', color: 'var(--text-main)', transition: 'all 0.2s ease',
                            outline: 'none', borderColor: verifyOtp[idx] ? 'var(--saffron)' : 'var(--border-color)'
                          }}
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={verifyLoading} style={{ width: '100%', height: '52px', justifyContent: 'center', marginTop: '12px', background: 'var(--saffron)', color: 'var(--navy)', fontWeight: 800, fontSize: '1.05rem', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(255,153,51,0.3)' }}>
                    {verifyLoading ? 'Verifying...' : 'Verify & Activate Account'}
                  </button>
                  <button type="button" onClick={() => setVerifyMode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-mist)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-mist)' }}>
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={{ color: 'var(--saffron)', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem' }}>
                {mode === 'login' ? 'Register' : 'Login'}
              </button>
            </p>
          </div>


        </div>
      </div>
    </div>
  );
}


