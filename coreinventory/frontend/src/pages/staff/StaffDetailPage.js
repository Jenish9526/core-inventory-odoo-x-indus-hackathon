import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { staffAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Card, Modal } from '../../components/common/UI';

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
};
const FF = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const TABS = ['Overview', 'Receipts', 'Deliveries', 'Transfers', 'Adjustments', 'Ledger'];

const STATUS_COLORS = {
  Done: 'var(--green)', Draft: 'var(--text-muted)', Waiting: 'var(--amber)',
  Ready: 'var(--accent)', Cancelled: 'var(--red)', 'In Transit': 'var(--amber)',
};

const Badge = ({ status }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
    background: `${STATUS_COLORS[status] || 'var(--text-muted)'}22`,
    color: STATUS_COLORS[status] || 'var(--text-muted)',
  }}>{status}</span>
);

const TYPE_COLORS = { RECEIPT: 'var(--green)', DELIVERY: 'var(--red)', TRANSFER_IN: 'var(--accent)', TRANSFER_OUT: 'var(--amber)', ADJUSTMENT: 'var(--text-secondary)' };

export default function StaffDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({});
  const JOB_ROLES = ['Warehouse Supervisor', 'Inventory Coordinator', 'Receiving Clerk', 'Stock Controller', 'Dispatch Coordinator', 'Production Store Keeper', 'Material Handler', 'Forklift Operator', 'Cold Chain Specialist', 'Quality Inspector', 'Returns Processor', 'QC Analyst'];
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([staffAPI.getOne(id), warehousesAPI.getAll()])
      .then(([d, w]) => {
        setData(d.data.data);
        setWarehouses(w.data.data);
        const u = d.data.data.user;
        setForm({ name: u.name, email: u.email, warehouse: u.warehouse?._id || u.warehouse || '', isActive: u.isActive !== false, jobRole: u.jobRole || '' });
      })
      .catch(() => toast.error('Failed to load staff details'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await staffAPI.update(id, form);
      setData(d => ({ ...d, user: res.data.data }));
      setEditModal(false);
      toast.success('Staff updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>Staff not found</div>;

  const { user, stats, receipts, deliveries, transfers, adjustments, ledger } = data;
  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate('/staff')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px 6px 8px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--font)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Staff
        </button>
      </div>
      <PageHeader
        title={user.name}
        subtitle={user.email}
        action={<Button onClick={() => setEditModal(true)}>Edit Staff</Button>}
      />

      {/* Profile card */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: '#fff',
          }}>{user.name.charAt(0).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{user.email}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>Staff</span>
              <span style={{
                fontSize: 11, padding: '2px 10px', borderRadius: 20,
                background: user.isActive !== false ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color: user.isActive !== false ? 'var(--green)' : 'var(--red)',
              }}>{user.isActive !== false ? 'Active' : 'Inactive'}</span>
              {user.warehouse && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--text-accent)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  🏭 {user.warehouse.name}
                </span>
              )}
              {user.jobRole && (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>
                  {user.jobRole}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Joined {joined}</span>
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              { label: 'Receipts', val: stats.totalReceipts },
              { label: 'Deliveries', val: stats.totalDeliveries },
              { label: 'Transfers', val: stats.totalTransfers },
              { label: 'Adjustments', val: stats.totalAdjustments },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? 'var(--text-accent)' : 'var(--text-secondary)',
            borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            fontFamily: 'var(--font)', marginBottom: -1, transition: 'color 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Receipts</div>
            {receipts.slice(0, 5).map(r => (
              <div key={r._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.ref}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.supplier}</div>
                </div>
                <Badge status={r.status} />
              </div>
            ))}
            {receipts.length === 0 && <div style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No receipts</div>}
          </Card>
          <Card>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Deliveries</div>
            {deliveries.slice(0, 5).map(d => (
              <div key={d._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.ref}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.customer}</div>
                </div>
                <Badge status={d.status} />
              </div>
            ))}
            {deliveries.length === 0 && <div style={{ padding: '20px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No deliveries</div>}
          </Card>
        </div>
      )}

      {tab === 'Receipts' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Ref', 'Supplier', 'Items', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.ref}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{r.supplier}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{r.items?.length || 0}</td>
                  <td style={{ padding: '10px 16px' }}><Badge status={r.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {receipts.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No receipts</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Deliveries' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Ref', 'Customer', 'Items', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.ref}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{d.customer}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{d.items?.length || 0}</td>
                  <td style={{ padding: '10px 16px' }}><Badge status={d.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {deliveries.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No deliveries</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Transfers' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Ref', 'Product', 'From', 'To', 'Qty', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.ref}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t.product?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t.fromWarehouse?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{t.toWarehouse?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{t.quantity}</td>
                  <td style={{ padding: '10px 16px' }}><Badge status={t.status} /></td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No transfers</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Adjustments' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Ref', 'Product', 'Warehouse', 'Before', 'After', 'Diff', 'Reason', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.ref}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{a.product?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{a.warehouse?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{a.previousQty}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{a.newQty}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: a.difference >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {a.difference >= 0 ? '+' : ''}{a.difference}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{a.reason}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {adjustments.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No adjustments</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'Ledger' && (
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Type', 'Product', 'Warehouse', 'Qty', 'Balance After', 'Ref', 'Date'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {ledger.map(l => (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${TYPE_COLORS[l.type]}22`, color: TYPE_COLORS[l.type] }}>{l.type}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{l.product?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{l.warehouse?.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: l.quantity >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {l.quantity >= 0 ? '+' : ''}{l.quantity}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{l.balanceAfter ?? '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{l.referenceRef || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No ledger entries</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Staff Member">
        <form onSubmit={handleSave}>
          <FF label="Full Name *">
            <input value={form.name || ''} onChange={set('name')} required style={inputStyle} />
          </FF>
          <FF label="Email Address *">
            <input type="email" value={form.email || ''} onChange={set('email')} required style={inputStyle} />
          </FF>
          <FF label="Assigned Warehouse">
            <select value={form.warehouse || ''} onChange={set('warehouse')} style={inputStyle}>
              <option value="">— No warehouse assigned —</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </FF>
          <FF label="Job Role">
            <select value={form.jobRole || ''} onChange={set('jobRole')} style={inputStyle}>
              <option value="">— Select job role —</option>
              {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FF>
          <FF label="Status">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.isActive !== false} onChange={set('isActive')} />
              Active account
            </label>
          </FF>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
