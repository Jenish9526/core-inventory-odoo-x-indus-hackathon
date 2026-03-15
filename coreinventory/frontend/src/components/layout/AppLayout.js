import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '⊞', exact: true, group: 'main' },
  { to: '/products', label: 'Products', icon: '◫', group: 'main' },
  { group: 'ops', type: 'divider', label: 'Operations' },
  { to: '/receipts', label: 'Receipts', icon: '↓', sub: 'Incoming', group: 'ops' },
  { to: '/deliveries', label: 'Deliveries', icon: '↑', sub: 'Outgoing', group: 'ops' },
  { to: '/transfers', label: 'Transfers', icon: '⇄', sub: 'Internal', group: 'ops' },
  { to: '/adjustments', label: 'Adjustments', icon: '±', group: 'ops' },
  { group: 'reports', type: 'divider', label: 'Reports' },
  { to: '/history', label: 'Stock Ledger', icon: '≡', group: 'reports' },
  { to: '/warehouses', label: 'Warehouses', icon: '▣', group: 'reports' },
  { group: 'feedback', type: 'divider', label: 'Team' },
  { to: '/feedback', label: 'Feedback', icon: '💬', group: 'feedback' },
];

export default function AppLayout() {
  const { user, logout, isManager } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 220, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '16px 14px' : '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 60 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 800, boxShadow: '0 0 12px rgba(59,130,246,0.4)',
          }}>C</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>CoreInventory</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>IMS v1.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_ITEMS.map((item, i) => {
            if (item.type === 'divider') {
              if (collapsed) return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />;
              return (
                <div key={i} style={{ padding: '10px 18px 4px', fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                  {item.label}
                </div>
              );
            }
            const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.exact}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '9px 0' : '8px 18px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s', position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}>
                <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                {!collapsed && item.sub && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 400 }}>{item.sub}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--border)', padding: collapsed ? '12px 10px' : '12px 16px' }}>
          {!collapsed && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{user?.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', display: 'inline-block', animation: connected ? 'blink 2s infinite' : 'none' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.role} · {connected ? 'Live' : 'Offline'}</span>
              </div>
            </div>
          )}
          {!collapsed && isManager && (
            <div style={{ marginBottom: 8, padding: '3px 8px', background: 'var(--accent-dim)', border: '1px solid var(--accent)30', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Manager</span>
            </div>
          )}
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ width: '100%', padding: collapsed ? '6px' : '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500, transition: 'all 0.15s', textAlign: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            {collapsed ? '⎋' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(c => !c)}
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
            ☰
          </button>
          <div style={{ flex: 1 }} />
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: connected ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 20 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', display: 'inline-block', animation: connected ? 'blink 2s infinite' : 'none' }} />
            <span style={{ fontSize: 10, color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{connected ? 'Live' : 'Offline'}</span>
          </div>
          {/* Avatar */}
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
