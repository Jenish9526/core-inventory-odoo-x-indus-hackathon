import React, { useState, useMemo } from 'react';
import { useSocket } from '../../context/SocketContext';
import { PageHeader, Button } from '../../components/common/UI';

const CATEGORIES = ['All', 'Low Stock', 'Stock Update', 'Activity'];

const categoryMatch = (n, cat) => {
  if (cat === 'All') return true;
  if (cat === 'Low Stock')    return n.type === 'warning';
  if (cat === 'Stock Update') return n.type === 'stock';
  if (cat === 'Activity')     return n.type === 'activity';
  return true;
};

const typeColor = { warning: 'var(--amber)', stock: 'var(--green)', activity: 'var(--accent)' };
const typeBg    = { warning: 'var(--amber-dim)', stock: 'var(--green-dim)', activity: 'var(--accent-dim)' };

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function NotificationsPage() {
  const { notifications, clearAll, markAllRead } = useSocket();
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => notifications.filter(n => {
    const matchCat = categoryMatch(n, category);
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [notifications, category, search]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <PageHeader
        title="Notifications"
        subtitle={`${notifications.filter(n => !n.read).length} unread`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
          </div>
        }
      />

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notifications..."
          style={{
            flex: 1, padding: '8px 12px', background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: category === c ? 'var(--accent)' : 'var(--bg-surface)',
              color: category === c ? '#fff' : 'var(--text-muted)',
              fontSize: 12, fontWeight: category === c ? 600 : 400,
              fontFamily: 'var(--font)', transition: 'all 0.15s',
              border: `1px solid ${category === c ? 'var(--accent)' : 'var(--border-strong)'}`,
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No notifications
          </div>
        ) : filtered.map((n, i) => (
          <div key={n.id} style={{
            display: 'flex', gap: 12, padding: '14px 18px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
            background: n.read ? 'transparent' : 'var(--accent-dim)',
            transition: 'background 0.15s',
          }}>
            {/* Icon dot */}
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: typeBg[n.type] || 'var(--bg-elevated)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>{n.icon}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(n.ts)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{n.message}</div>
              {/* Category tag */}
              <div style={{
                display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 600,
                padding: '2px 7px', borderRadius: 4,
                background: typeBg[n.type] || 'var(--bg-elevated)',
                color: typeColor[n.type] || 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {n.type === 'warning' ? 'Low Stock' : n.type === 'stock' ? 'Stock Update' : 'Activity'}
              </div>
            </div>

            {/* Unread dot */}
            {!n.read && (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 4 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
