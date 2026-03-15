import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AuthLayout = ({ children, title, subtitle }) => (
  <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'var(--font)', position: 'relative', overflow: 'hidden' }}>
    {/* Background grid */}
    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '48px 48px', opacity: 0.4, pointerEvents: 'none' }} />
    {/* Glow */}
    <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 300, background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

    <div style={{ width: '100%', maxWidth: 400, position: 'relative', animation: 'fadeUp 0.4s ease' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 auto 16px', boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}>C</div>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.03em' }}>{title}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{subtitle}</p>
      </div>

      {/* Card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-xl)', padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  </div>
);

const Field = ({ label, type = 'text', value, onChange, placeholder, required }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-strong)'}`, borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s', boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none' }} />
    </div>
  );
};

const SubmitBtn = ({ children, loading }) => (
  <button type="submit" disabled={loading}
    style={{ width: '100%', padding: 11, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'var(--font)', marginTop: 6, letterSpacing: '-0.01em', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}
    onMouseEnter={e => !loading && (e.currentTarget.style.filter = 'brightness(1.1)')}
    onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
    {loading && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />}
    {children}
  </button>
);

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { await login(form.email, form.password); navigate('/'); toast.success('Welcome back!'); }
    catch (err) { toast.error(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to CoreInventory">
      <form onSubmit={submit}>
        <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ color: 'var(--text-accent)', fontSize: 12, textDecoration: 'none' }}>Forgot password?</Link>
        </div>
        <SubmitBtn loading={loading}>Sign in →</SubmitBtn>
      </form>
      <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-muted)', fontSize: 12 }}>
        No account?{' '}
        <Link to="/register" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { await authAPI.register(form); toast.success('Account created! Please log in.'); navigate('/login'); }
    catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join CoreInventory IMS">
      <form onSubmit={submit}>
        <Field label="Full name" value={form.name} onChange={set('name')} placeholder="John Smith" required />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Role</label>
          <select value={form.role} onChange={set('role')}
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}>
            <option value="staff">Warehouse Staff</option>
            <option value="manager">Inventory Manager</option>
          </select>
        </div>
        <SubmitBtn loading={loading}>Create account →</SubmitBtn>
      </form>
      <p style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-muted)', fontSize: 12 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const steps = ['Enter Email', 'Verify OTP', 'New Password'];

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      toast.success('OTP sent! Check your email or server console.');
      setStep(2);
      setCountdown(60);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs[i + 1].current?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i - 1].current?.focus();
    if (e.key === 'ArrowLeft' && i > 0) otpRefs[i - 1].current?.focus();
    if (e.key === 'ArrowRight' && i < 5) otpRefs[i + 1].current?.focus();
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs[5].current?.focus();
      e.preventDefault();
    }
  };

  const verifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) { toast.error('Enter all 6 digits'); return; }
    setLoading(true);
    try {
      await authAPI.verifyOTP({ email, otp: code });
      toast.success('OTP verified!');
      setStep(3);
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid or expired OTP'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp: otp.join(''), password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const subtitles = ['Enter your account email', 'Enter the 6-digit code sent to your email', 'Choose a new secure password'];

  return (
    <AuthLayout title="Reset Password" subtitle={subtitles[step - 1]}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 3, background: i < step ? 'var(--accent)' : 'var(--border-strong)', transition: 'background 0.3s' }} />
            <div style={{ fontSize: 9, color: i < step ? 'var(--text-accent)' : 'var(--text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Step 1 — Email */}
      {step === 1 && (
        <div>
          <Field label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          <SubmitBtn loading={loading} onClick={e => { e.preventDefault(); if (email) sendOTP(); }}>Send OTP →</SubmitBtn>
        </div>
      )}

      {/* Step 2 — OTP boxes */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>6-Digit Code</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                style={{
                  width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
                  background: 'var(--bg-elevated)', border: `2px solid ${digit ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontFamily: 'var(--mono)',
                  outline: 'none', transition: 'border-color 0.2s', caretColor: 'var(--accent)',
                  boxShadow: digit ? '0 0 0 3px var(--accent-glow)' : 'none',
                }}
              />
            ))}
          </div>

          {/* Resend + countdown */}
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            {countdown > 0
              ? <span>Resend OTP in <strong style={{ color: 'var(--text-accent)' }}>{countdown}s</strong></span>
              : <span>Didn't receive it?{' '}
                  <span onClick={sendOTP} style={{ color: 'var(--text-accent)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Resend OTP</span>
                </span>
            }
          </div>

          <SubmitBtn loading={loading} onClick={e => { e.preventDefault(); verifyOTP(); }}>Verify Code →</SubmitBtn>
        </div>
      )}

      {/* Step 3 — New password */}
      {step === 3 && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                style={{ width: '100%', padding: '10px 40px 10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }}
              />
              <span onClick={() => setShowPassword(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', userSelect: 'none' }}>
                {showPassword ? '🙈' : '👁'}
              </span>
            </div>
            {/* Strength indicator */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {[1,2,3,4].map(lvl => (
                <div key={lvl} style={{ flex: 1, height: 3, borderRadius: 3, background: password.length >= lvl * 2 ? (password.length >= 8 ? 'var(--green)' : password.length >= 4 ? 'var(--amber)' : 'var(--red)') : 'var(--border-strong)', transition: 'background 0.2s' }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              {password.length === 0 ? '' : password.length < 4 ? 'Weak' : password.length < 8 ? 'Fair' : 'Strong'}
            </div>
          </div>
          <SubmitBtn loading={loading} onClick={e => { e.preventDefault(); resetPassword(); }}>Reset Password ✓</SubmitBtn>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 18 }}>
        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 12, textDecoration: 'none' }}>← Back to login</Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
