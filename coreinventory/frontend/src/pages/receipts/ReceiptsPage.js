import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { receiptsAPI, productsAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Badge, Table, FilterPills, Card, Input, Select, ExportMenu, Spinner, Modal } from '../../components/common/UI';
import { exportReceipts } from '../../utils/export';

// ── RECEIPTS LIST ─────────────────────────────────────────────────────────
export function ReceiptsPage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receiptsAPI.getAll({ status: filter });
      setReceipts(res.data.data);
    } catch { toast.error('Failed to load receipts'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const validate = async (id, e) => {
    e.stopPropagation();
    try {
      await receiptsAPI.validate(id);
      toast.success('Receipt validated — stock updated!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Validation failed'); }
  };

  const cols = [
    { key: 'ref', label: 'Reference', render: r => <span style={{ fontWeight: 600, color: '#2563eb' }}>{r.ref}</span> },
    { key: 'supplier', label: 'Supplier' },
    { key: 'items', label: 'Items', render: r => `${r.items?.length || 0} product(s)` },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => new Date(r.createdAt).toLocaleDateString(), muted: true },
    { key: 'actions', label: '', render: r => r.status !== 'Done' && r.status !== 'Cancelled' ? (
      <Button size="sm" variant="success" onClick={e => validate(r._id, e)}>Validate</Button>
    ) : null },
  ];

  return (
    <div>
      <PageHeader title="Receipts" subtitle="Incoming stock from suppliers"
        actions={<>
          <ExportMenu onPDF={() => exportReceipts(receipts, 'pdf')} onExcel={() => exportReceipts(receipts, 'excel')} />
          <Button onClick={() => navigate('/receipts/new')}>+ New Receipt</Button>
        </>}
      />
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'Draft', 'Waiting', 'Ready', 'Done', 'Cancelled'].map(s => ({ label: s === 'all' ? 'All' : s, value: s }))}
          value={filter} onChange={setFilter}
        />
      </div>
      <Card>
        <Table columns={cols} data={receipts} loading={loading} emptyMsg="No receipts found" onRowClick={r => navigate(`/receipts/${r._id}`)} />
      </Card>
    </div>
  );
}

// ── RECEIPT FORM ──────────────────────────────────────────────────────────
export function ReceiptFormPage() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [items, setItems] = useState([{ product: '', warehouse: '', quantity: 1 }]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([productsAPI.getAll({ limit: 200 }), warehousesAPI.getAll()])
      .then(([p, w]) => { setProducts(p.data.data); setWarehouses(w.data.data); })
      .catch(() => toast.error('Failed to load data'));
  }, []);

  const addItem = () => setItems(it => [...it, { product: '', warehouse: '', quantity: 1 }]);
  const removeItem = i => setItems(it => it.filter((_, idx) => idx !== i));
  const setItem = (i, k, v) => setItems(it => it.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const submit = async e => {
    e.preventDefault();
    if (!supplier) { toast.error('Supplier is required'); return; }
    if (items.some(it => !it.product || !it.warehouse || !it.quantity)) { toast.error('Fill all item fields'); return; }
    setLoading(true);
    try {
      await receiptsAPI.create({ supplier, notes, scheduledDate, items });
      toast.success('Receipt created!');
      navigate('/receipts');
    } catch (err) { toast.error(err.response?.data?.message || 'Create failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="New Receipt" subtitle="Create an incoming stock receipt" />
      <div style={{ maxWidth: 720 }}>
        <Card style={{ padding: 24 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Supplier <span style={{ color: 'var(--red)' }}>*</span></label>
                <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Scheduled Date</label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Notes</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '16px 0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Products</span>
                <Button size="sm" variant="secondary" type="button" onClick={addItem}>+ Add Line</Button>
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                  <div style={{ marginBottom: 0 }}>
                    {i === 0 && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Product</label>}
                    <Select value={item.product} onChange={e => setItem(i, 'product', e.target.value)} required>
                      <option value="">Select product</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                    </Select>
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    {i === 0 && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Destination Warehouse</label>}
                    <Select value={item.warehouse} onChange={e => setItem(i, 'warehouse', e.target.value)} required>
                      <option value="">Select warehouse</option>
                      {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </Select>
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    {i === 0 && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Quantity</label>}
                    <Input type="number" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="1" required />
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} style={{ padding: '8px 10px', border: '1px solid #fee2e2', borderRadius: 8, background: 'var(--bg-surface)', color: '#ef4444', cursor: 'pointer', marginBottom: 0, fontSize: 14 }}>×</button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/receipts')}>Cancel</Button>
              <Button type="submit" loading={loading}>Create Receipt</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ── RECEIPT DETAIL ────────────────────────────────────────────────────────
export function ReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const load = useCallback(() => {
    receiptsAPI.getOne(id)
      .then(r => setReceipt(r.data.data))
      .catch(() => toast.error('Receipt not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const validate = async () => {
    setValidating(true);
    try {
      await receiptsAPI.validate(id);
      toast.success('Receipt validated — stock increased!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Validation failed'); }
    finally { setValidating(false); }
  };

  const changeStatus = async (status) => {
    try {
      await receiptsAPI.updateStatus(id, status);
      load();
    } catch { toast.error('Status update failed'); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;
  if (!receipt) return null;

  return (
    <div>
      <PageHeader title={receipt.ref} subtitle={`Supplier: ${receipt.supplier}`}
        actions={<>
          <Badge status={receipt.status} />
          {receipt.status === 'Draft' && <Button variant="secondary" size="sm" onClick={() => changeStatus('Ready')}>Mark Ready</Button>}
          {receipt.status !== 'Done' && receipt.status !== 'Cancelled' && (
            <Button variant="success" loading={validating} onClick={validate}>✓ Validate Receipt</Button>
          )}
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <Card>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600 }}>Products to Receive</div>
          <Table
            columns={[
              { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
              { key: 'warehouse', label: 'Warehouse', render: r => r.warehouse?.name },
              { key: 'quantity', label: 'Expected', render: r => `${r.quantity} ${r.product?.unit}` },
              { key: 'receivedQty', label: 'Received', render: r => <span style={{ color: r.receivedQty > 0 ? '#22c55e' : '#94a3b8' }}>{r.receivedQty} {r.product?.unit}</span> },
            ]}
            data={receipt.items || []}
          />
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Receipt Details</div>
          {[
            ['Reference', receipt.ref],
            ['Supplier', receipt.supplier],
            ['Status', <Badge status={receipt.status} />],
            ['Created', new Date(receipt.createdAt).toLocaleDateString()],
            ['Validated', receipt.validatedAt ? new Date(receipt.validatedAt).toLocaleString() : '—'],
            ['Created By', receipt.createdBy?.name || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          {receipt.notes && <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: '#475569' }}>{receipt.notes}</div>}
        </Card>
      </div>
    </div>
  );
}

export default ReceiptsPage;
