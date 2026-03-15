import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

const NAV = [
  { group: 'MAIN' },
  { to: '/',               label: 'Dashboard',       exact: true },
  { to: '/products',       label: 'Products'         },
  { to: '/purchase-orders',label: 'Purchase Orders'  },
  { group: 'OPERATIONS' },
  { to: '/receipts',       label: 'Receipts',    sub: 'Incoming' },
  { to: '/deliveries',     label: 'Deliveries',  sub: 'Outgoing' },
  { to: '/transfers',      label: 'Transfers',   sub: 'Internal' },
  { to: '/adjustments',    label: 'Adjustments'  },
  { group: 'REPORTS' },
  { to: '/history',        label: 'Stock Ledger' },
  { to: '/performance',    label: 'Performance'  },
  { to: '/warehouses',     label: 'Warehouses'   },
  { group: 'TEAM' },
  { to: '/staff',          label: 'Staff',       managerOnly: true },
  { to: '/help',           label: 'Help'         },
  { to: '/feedback',       label: 'Feedback'     },
  { to: '/settings',       label: 'Settings'     },
];

function NotificationDrawer({ open, onClose }) {
  const { notifications, markAllRead, clearAll } = useSocket();
  const ref = useRef();

  useEffect(() => { if (open) markAllRead(); }, [open, markAllRead]);
  useEffect(() => {
    const h = e => ref.current && !ref.current.contains(e.target) && onClose();
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} style={{
      position: 'absolute', top: 48, right: 0, width: 320, maxHeight: 440,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>NOTIFICATIONS</span>
        <button onClick={clearAll} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}>Clear all</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0
          ? <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No notifications</div>
          : notifications.slice(0, 6).map((n, i) => (
            <div key={n.id} style={{ padding: '10px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', display: 'flex', gap: 10, background: n.read ? 'transparent' : 'var(--accent-dim)' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{new Date(n.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
      </div>
      {notifications.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <Link to="/notifications" onClick={onClose} style={{ fontSize: 12, color: 'var(--text-accent)', textDecoration: 'none', fontWeight: 600 }}>See all notifications →</Link>
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({ open, onClose, user, isManager, onNavigate, onLogout, avatar }) {
  const ref = useRef();
  useEffect(() => {
    const h = e => ref.current && !ref.current.contains(e.target) && onClose();
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  if (!open) return null;

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  const btnStyle = (danger) => ({
    width: '100%', padding: '9px 14px', border: 'none', background: 'transparent',
    color: danger ? 'var(--red)' : 'var(--text-secondary)',
    fontSize: 13, fontFamily: 'var(--font)', fontWeight: 500,
    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', display: 'block',
    borderRadius: 'var(--radius-sm)',
  });

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 48, right: 0, width: 240,
      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 200,
      overflow: 'hidden', animation: 'fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* User info */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden',
          }}>{avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : user?.name?.charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '2px 8px', borderRadius: 4,
            background: isManager ? 'var(--accent-dim)' : 'var(--bg-overlay)',
            color: isManager ? 'var(--text-accent)' : 'var(--text-secondary)',
          }}>{user?.role}</span>
          {joined && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Since {joined}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '6px' }}>
        <button style={btnStyle(false)} onClick={() => onNavigate('/profile')}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          View Profile
        </button>
        <button style={btnStyle(false)} onClick={() => onNavigate('/settings')}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          Settings
        </button>
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
        <button style={btnStyle(true)} onClick={onLogout}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout, isManager } = useAuth();
  const { connected, unreadCount } = useSocket();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarKey = `ci_avatar_${user?._id || user?.id}`;
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey) || null);
  React.useEffect(() => {
    const handler = () => setAvatar(localStorage.getItem(avatarKey) || null);
    window.addEventListener('storage', handler);
    window.addEventListener('focus', handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('focus', handler); };
  }, [avatarKey]);

  const visibleNav = NAV.filter(item => !item.managerOnly || isManager);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 0 : 210, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: collapsed ? 'none' : '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '14px 0' : '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: '#fff', fontWeight: 800,
          }}>C</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>CoreInventory</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>IMS v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleNav.map((item, i) => {
            if (item.group) {
              return (
                <div key={i} style={{ padding: '10px 8px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.group}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>
              );
            }
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.exact} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s', marginBottom: 1,
              }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}>
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{item.sub}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom user */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden',
          }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : user?.name?.charAt(0).toUpperCase()
            }
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            {!isManager && user?.warehouse && (
              <div style={{ fontSize: 10, color: 'var(--text-accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏭 {user.warehouse.name}</div>
            )}
            {(isManager || !user?.warehouse) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', display: 'inline-block' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{connected ? 'Live' : 'Offline'}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(c => !c)} style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            ☰
          </button>

          <div style={{ flex: 1 }} />

          {/* Live pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
            background: connected ? 'var(--green-dim)' : 'var(--red-dim)',
            border: `1px solid ${connected ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)'}`,
            borderRadius: 20,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', display: 'inline-block', animation: connected ? 'blink 2s infinite' : 'none' }} />
            <span style={{ fontSize: 10, color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{connected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)',
            background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            {theme === 'dark'
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }} style={{
              width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)',
              background: notifOpen ? 'var(--bg-elevated)' : 'transparent', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid var(--bg-surface)' }} />}
            </button>
            <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          {/* Avatar */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--purple))',
              border: profileOpen ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border 0.15s', overflow: 'hidden', padding: 0,
            }}>
              {avatar
                ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : user?.name?.charAt(0).toUpperCase()
              }
            </button>
            <ProfileDropdown
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              user={user}
              isManager={isManager}
              avatar={avatar}
              onNavigate={path => { setProfileOpen(false); navigate(path); }}
              onLogout={() => { logout(); navigate('/login'); }}
            />
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
