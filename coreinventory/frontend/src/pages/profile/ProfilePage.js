import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Button, Card } from '../../components/common/UI';

const FF = ({ label, required, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
      {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <Card style={{ marginBottom: 16 }}>
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ padding: '20px 24px' }}>{children}</div>
  </Card>
);

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
};

function getStrength(p) {
  if (p.length < 6) return 1;
  if (p.length >= 12 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) return 4;
  if (p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)) return 3;
  return 2;
}

const STRENGTH_LABEL = { 1: 'Too short', 2: 'Weak — add uppercase & numbers', 3: 'Good', 4: 'Strong' };
const STRENGTH_COLOR = { 1: 'var(--red)', 2: 'var(--amber)', 3: 'var(--accent)', 4: 'var(--green)' };

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth();
  const fileRef = useRef();
  const cameraRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const [avatar, setAvatar] = useState(() => localStorage.getItem(`ci_avatar_${user?._id || user?.id}`) || null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);

  const [info, setInfo] = useState({ name: user?.name || '', email: user?.email || '' });
  const [infoLoading, setInfoLoading] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });

  const openCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(s);
      setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { toast.error('Camera access denied'); }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    saveAvatar(dataUrl);
    closeCamera();
  };

  const onFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = ev => saveAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveAvatar = (dataUrl) => {
    const key = `ci_avatar_${user?._id || user?.id}`;
    localStorage.setItem(key, dataUrl);
    setAvatar(dataUrl);
    toast.success('Profile picture updated');
  };

  const removeAvatar = () => {
    const key = `ci_avatar_${user?._id || user?.id}`;
    localStorage.removeItem(key);
    setAvatar(null);
    toast.success('Profile picture removed');
  };


  const setI = k => e => setInfo(f => ({ ...f, [k]: e.target.value }));
  const setP = k => e => setPwd(f => ({ ...f, [k]: e.target.value }));
  const toggleShow = k => () => setShowPwd(f => ({ ...f, [k]: !f[k] }));

  const saveInfo = async e => {
    e.preventDefault();
    setInfoLoading(true);
    try {
      const res = await authAPI.updateMe(info);
      const updated = res.data.user;
      localStorage.setItem('ci_user', JSON.stringify(updated));
      if (setUser) setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setInfoLoading(false);
    }
  };

  const savePassword = async e => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) { toast.error('Passwords do not match'); return; }
    setPwdLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password changed — please log in again');
      setTimeout(() => { logout(); window.location.href = '/login'; }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwdLoading(false);
    }
  };

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const strength = pwd.newPassword ? getStrength(pwd.newPassword) : 0;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader title="Profile" subtitle="Manage your account details and security" />

      {/* Overview */}
      <Section title="Account Overview">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 800, color: '#fff',
              boxShadow: '0 0 24px rgba(59,130,246,0.25)',
              overflow: 'hidden', border: '2px solid var(--border-strong)',
            }}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user?.name?.charAt(0).toUpperCase()
              }
            </div>
            {/* Edit overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, cursor: 'pointer', transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
              onClick={() => fileRef.current.click()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{user?.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '2px 10px', borderRadius: 20,
                background: user?.role === 'manager' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: user?.role === 'manager' ? 'var(--text-accent)' : 'var(--text-secondary)',
                border: `1px solid ${user?.role === 'manager' ? 'rgba(59,130,246,0.2)' : 'var(--border-strong)'}`,
              }}>{user?.role}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Member since {joined}</span>
              {user?.role === 'staff' && (
                <span style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 20,
                  background: user?.warehouse ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  color: user?.warehouse ? 'var(--text-accent)' : 'var(--text-muted)',
                  border: `1px solid ${user?.warehouse ? 'rgba(59,130,246,0.2)' : 'var(--border-strong)'}`,
                }}>
                  {user?.warehouse ? `🏭 ${user.warehouse.name}` : 'No warehouse assigned'}
                </span>
              )}
              {user?.role === 'staff' && user?.jobRole && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
                  {user.jobRole}
                </span>
              )}
            </div>
            {/* Avatar actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => fileRef.current.click()} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Upload photo</button>
              <button onClick={openCamera} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Take photo</button>
              {avatar && <button onClick={removeAvatar} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red-dim)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Remove</button>}
            </div>
          </div>
        </div>

        {/* Hidden inputs */}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Camera modal */}
        {cameraOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', width: 400, border: '1px solid var(--border-strong)', animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Take a photo</span>
                <button onClick={closeCamera} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block', background: '#000', maxHeight: 300, objectFit: 'cover' }} />
              <div style={{ padding: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={closeCamera} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13 }}>Cancel</button>
                <button onClick={capturePhoto} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600 }}>Capture</button>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Personal info */}
      <Section title="Personal Information" subtitle="Update your display name and email address">
        <form onSubmit={saveInfo}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FF label="Full Name" required>
              <input value={info.name} onChange={setI('name')} placeholder="Your name" required style={inputStyle} />
            </FF>
            <FF label="Email Address" required>
              <input type="email" value={info.email} onChange={setI('email')} placeholder="your@email.com" required style={inputStyle} />
            </FF>
          </div>
          <FF label="Role">
            <input value={user?.role} disabled style={{ ...inputStyle, opacity: 0.45, cursor: 'not-allowed' }} />
          </FF>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={infoLoading}>Save Changes</Button>
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password" subtitle="You will be signed out after changing your password">
        <form onSubmit={savePassword}>
          <FF label="Current Password" required>
            <div style={{ position: 'relative' }}>
              <input type={showPwd.current ? 'text' : 'password'} value={pwd.currentPassword} onChange={setP('currentPassword')}
                placeholder="Enter current password" required style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={toggleShow('current')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}>
                {showPwd.current ? 'hide' : 'show'}
              </button>
            </div>
          </FF>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FF label="New Password" required>
              <div style={{ position: 'relative' }}>
                <input type={showPwd.new ? 'text' : 'password'} value={pwd.newPassword} onChange={setP('newPassword')}
                  placeholder="Min. 6 characters" required style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={toggleShow('new')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}>
                  {showPwd.new ? 'hide' : 'show'}
                </button>
              </div>
            </FF>
            <FF label="Confirm New Password" required>
              <div style={{ position: 'relative' }}>
                <input type={showPwd.confirm ? 'text' : 'password'} value={pwd.confirmPassword} onChange={setP('confirmPassword')}
                  placeholder="Repeat new password" required style={{ ...inputStyle, paddingRight: 40 }} />
                <button type="button" onClick={toggleShow('confirm')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}>
                  {showPwd.confirm ? 'hide' : 'show'}
                </button>
              </div>
            </FF>
          </div>

          {/* Strength bar */}
          {pwd.newPassword && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength ? STRENGTH_COLOR[strength] : 'var(--border-strong)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={pwdLoading} variant="danger">Change Password</Button>
          </div>
        </form>
      </Section>

      {/* Session */}
      <Section title="Session">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Sign out of your account</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>You will be redirected to the login page</div>
          </div>
          <Button variant="danger" onClick={() => { logout(); window.location.href = '/login'; }}>Sign Out</Button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Delete Account</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Permanently deactivate your account. This cannot be undone.</div>
          </div>
          <Button variant="danger" onClick={async () => {
            if (!window.confirm('Are you sure? This will permanently delete your account.')) return;
            try {
              await authAPI.deleteAccount();
              logout();
              window.location.href = '/login';
            } catch { }
          }}>Delete Account</Button>
        </div>
      </Section>
    </div>
  );
}
