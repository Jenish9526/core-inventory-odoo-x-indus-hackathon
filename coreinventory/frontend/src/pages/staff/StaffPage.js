import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const BLANK = { name: '', email: '', password: '', warehouse: '', jobRole: '' };

const JOB_ROLES = ['Warehouse Supervisor', 'Inventory Coordinator', 'Receiving Clerk', 'Stock Controller', 'Dispatch Coordinator', 'Production Store Keeper', 'Material Handler', 'Forklift Operator', 'Cold Chain Specialist', 'Quality Inspector', 'Returns Processor', 'QC Analyst'];

export default function StaffPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([staffAPI.getAll(), warehousesAPI.getAll()])
      .then(([s, w]) => { setStaff(s.data.data); setWarehouses(w.data.data); })
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await staffAPI.create(form);
      setStaff(s => [...s, res.data.data]);
      setModal(false);
      setForm(BLANK);
      toast.success('Staff member created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create staff');
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} staff member${staff.length !== 1 ? 's' : ''}`}
        action={<Button onClick={() => setModal(true)}>+ Add Staff</Button>}
      />

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ ...inputStyle, maxWidth: 320 }}
        />
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No staff members found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Warehouse', 'Job Role', 'Status', 'Joined', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id || s._id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => navigate(`/staff/${s.id || s._id}`)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{s.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: s.warehouse ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {s.warehouse ? `🏭 ${s.warehouse.name}` : <span style={{ fontStyle: 'italic' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {s.jobRole || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: s.isActive !== false ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: s.isActive !== false ? 'var(--green)' : 'var(--red)',
                    }}>{s.isActive !== false ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-accent)' }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setForm(BLANK); }} title="Add Staff Member">
        <form onSubmit={handleCreate}>
          <FF label="Full Name *">
            <input value={form.name} onChange={set('name')} placeholder="Jane Smith" required style={inputStyle} />
          </FF>
          <FF label="Email Address *">
            <input type="email" value={form.email} onChange={set('email')} placeholder="jane@example.com" required style={inputStyle} />
          </FF>
          <FF label="Password *">
            <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" required minLength={6} style={inputStyle} />
          </FF>
          <FF label="Assigned Warehouse">
            <select value={form.warehouse} onChange={set('warehouse')} style={inputStyle}>
              <option value="">— No warehouse assigned —</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </select>
          </FF>
          <FF label="Job Role">
            <select value={form.jobRole} onChange={set('jobRole')} style={inputStyle}>
              <option value="">— Select job role —</option>
              {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FF>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={() => { setModal(false); setForm(BLANK); }}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Staff</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
