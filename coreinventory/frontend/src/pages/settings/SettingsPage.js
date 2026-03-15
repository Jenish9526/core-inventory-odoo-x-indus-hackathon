import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { PageHeader, Button, Card } from '../../components/common/UI';

/* ── Reusable layout pieces ─────────────────────────────────────────── */
const Section = ({ title, subtitle, children }) => (
  <Card style={{ marginBottom: 16 }}>
    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
    </div>
    <div style={{ padding: '8px 0' }}>{children}</div>
  </Card>
);

const Row = ({ label, subtitle, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 24px', borderTop: '1px solid var(--border)',
    gap: 24,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

/* ── Toggle switch ──────────────────────────────────────────────────── */
const Toggle = ({ value, onChange }) => (
  <button onClick={() => onChange(!value)} style={{
    width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
    background: value ? 'var(--accent)' : 'var(--border-strong)',
    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    padding: 0,
  }}>
    <span style={{
      position: 'absolute', top: 3, left: value ? 21 : 3,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }} />
  </button>
);

/* ── Select input ───────────────────────────────────────────────────── */
const Sel = ({ value, onChange, options }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={{
    padding: '6px 10px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font)',
    cursor: 'pointer', outline: 'none', minWidth: 140,
  }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

/* ── Theme card ─────────────────────────────────────────────────────── */
const ThemeCard = ({ label, active, onClick, dark }) => (
  <button onClick={onClick} style={{
    width: 110, border: `2px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
    borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer',
    background: 'transparent', padding: 0, transition: 'border-color 0.15s',
  }}>
    {/* Mini preview */}
    <div style={{ background: dark ? '#0d1117' : '#ffffff', padding: '8px 8px 4px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        <div style={{ width: 28, height: 36, borderRadius: 4, background: dark ? '#010409' : '#f6f8fa' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, borderRadius: 3, background: dark ? '#1f6feb' : '#0969da', marginBottom: 4, width: '60%' }} />
          <div style={{ height: 4, borderRadius: 2, background: dark ? '#30363d' : '#d0d7de', marginBottom: 3 }} />
          <div style={{ height: 4, borderRadius: 2, background: dark ? '#30363d' : '#d0d7de', width: '80%' }} />
        </div>
      </div>
    </div>
    <div style={{
      padding: '6px 8px', background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
      fontSize: 11, fontWeight: 600, color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
      fontFamily: 'var(--font)', textAlign: 'center',
    }}>{label}</div>
  </button>
);

/* ── Main page ──────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { settings, update, reset } = useSettings();
  const [activeTab, setActiveTab] = useState('appearance');

  const tabs = [
    { id: 'appearance',    label: 'Appearance'     },
    { id: 'notifications', label: 'Notifications'  },
    { id: 'display',       label: 'Display'        },
    { id: 'dashboard',     label: 'Dashboard'      },
    { id: 'about',         label: 'About'          },
  ];

  const handleReset = () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    reset();
    toast.success('Settings reset to defaults');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your application preferences"
        actions={<Button variant="ghost" size="sm" onClick={handleReset}>Reset to defaults</Button>}
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: activeTab === t.id ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 12, fontWeight: activeTab === t.id ? 600 : 400,
            cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── Appearance ── */}
      {activeTab === 'appearance' && (
        <>
          <Section title="Theme" subtitle="Choose how CoreInventory looks">
            <div style={{ padding: '16px 24px', display: 'flex', gap: 12 }}>
              <ThemeCard label="Dark" dark active={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()} />
              <ThemeCard label="Light" dark={false} active={theme === 'light'} onClick={() => theme !== 'light' && toggleTheme()} />
            </div>
          </Section>

          <Section title="Layout">
            <Row label="Compact mode" subtitle="Reduce spacing and padding throughout the UI">
              <Toggle value={settings.compactMode} onChange={v => update('compactMode', v)} />
            </Row>
            <Row label="Collapsed sidebar by default" subtitle="Start with the sidebar collapsed on load">
              <Toggle value={settings.sidebarCollapsed} onChange={v => update('sidebarCollapsed', v)} />
            </Row>
          </Section>
        </>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'notifications' && (
        <Section title="Notification Preferences" subtitle="Control which real-time alerts you receive">
          <Row label="Low stock alerts" subtitle="Get notified when products fall below reorder level">
            <Toggle value={settings.notifLowStock} onChange={v => update('notifLowStock', v)} />
          </Row>
          <Row label="Stock updates" subtitle="Notify on receipts, deliveries and transfers">
            <Toggle value={settings.notifStockUpdates} onChange={v => update('notifStockUpdates', v)} />
          </Row>
          <Row label="Delivery updates" subtitle="Notify when deliveries are validated or cancelled">
            <Toggle value={settings.notifDeliveries} onChange={v => update('notifDeliveries', v)} />
          </Row>
          <Row label="Sound alerts" subtitle="Play a sound for incoming notifications">
            <Toggle value={settings.notifSound} onChange={v => update('notifSound', v)} />
          </Row>
        </Section>
      )}

      {/* ── Display ── */}
      {activeTab === 'display' && (
        <Section title="Display Preferences" subtitle="Customize how data is presented">
          <Row label="Rows per page" subtitle="Default number of rows shown in tables">
            <Sel value={settings.defaultPageSize} onChange={v => update('defaultPageSize', Number(v))}
              options={[10, 20, 50, 100].map(n => ({ value: n, label: `${n} rows` }))} />
          </Row>
          <Row label="Date format" subtitle="How dates are displayed across the app">
            <Sel value={settings.dateFormat} onChange={v => update('dateFormat', v)}
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]} />
          </Row>
          <Row label="Currency" subtitle="Currency symbol used in cost displays">
            <Sel value={settings.currency} onChange={v => update('currency', v)}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
                { value: 'INR', label: 'INR (₹)' },
                { value: 'AED', label: 'AED (د.إ)' },
                { value: 'SAR', label: 'SAR (﷼)' },
              ]} />
          </Row>
          <Row label="Timezone" subtitle="Your local timezone for date/time display">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)' }}>
              {settings.timezone}
            </div>
          </Row>
        </Section>
      )}

      {/* ── Dashboard ── */}
      {activeTab === 'dashboard' && (
        <Section title="Dashboard Preferences" subtitle="Control dashboard behaviour and widgets">
          <Row label="Auto-refresh" subtitle="Automatically refresh dashboard KPIs">
            <Toggle value={settings.autoRefresh} onChange={v => update('autoRefresh', v)} />
          </Row>
          <Row label="Refresh interval" subtitle="How often the dashboard data refreshes">
            <Sel value={settings.refreshInterval} onChange={v => update('refreshInterval', Number(v))}
              options={[
                { value: 15,  label: 'Every 15s' },
                { value: 30,  label: 'Every 30s' },
                { value: 60,  label: 'Every 1 min' },
                { value: 300, label: 'Every 5 min' },
              ]}
            />
          </Row>
          <Row label="Low stock banner" subtitle="Show low stock warning banner on dashboard">
            <Toggle value={settings.showLowStockBanner} onChange={v => update('showLowStockBanner', v)} />
          </Row>
        </Section>
      )}

      {/* ── About ── */}
      {activeTab === 'about' && (
        <>
          <Section title="Application">
            {[
              ['Application',  'CoreInventory IMS'],
              ['Version',      'v1.0.0'],
              ['Environment',  process.env.NODE_ENV],
              ['API',          process.env.REACT_APP_API_URL || 'http://localhost:5000/api'],
            ].map(([label, value]) => (
              <Row key={label} label={label}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: label === 'API' ? 'var(--mono)' : 'var(--font)' }}>{value}</span>
              </Row>
            ))}
          </Section>

          <Section title="Tech Stack">
            {[
              ['Frontend',  'React 18, React Router v6'],
              ['Backend',   'Node.js, Express.js'],
              ['Database',  'MongoDB, Mongoose'],
              ['Auth',      'JWT + bcryptjs'],
              ['Real-time', 'Socket.io'],
              ['Charts',    'Chart.js, react-chartjs-2'],
              ['Export',    'jsPDF, SheetJS'],
            ].map(([label, value]) => (
              <Row key={label} label={label}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value}</span>
              </Row>
            ))}
          </Section>

          <Section title="Storage">
            {[
              ['Theme',    localStorage.getItem('ci_theme') || 'dark'],
              ['Settings', `${JSON.stringify(localStorage.getItem('ci_settings') || '{}').length} bytes`],
              ['Session',  localStorage.getItem('ci_token') ? 'Active' : 'None'],
            ].map(([label, value]) => (
              <Row key={label} label={label}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{value}</span>
              </Row>
            ))}
            <div style={{ padding: '12px 24px' }}>
              <Button variant="ghost" size="sm" onClick={() => {
                localStorage.removeItem('ci_settings');
                toast.success('Local storage cleared');
              }}>Clear local storage</Button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
