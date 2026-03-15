import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { transfersAPI, adjustmentsAPI, warehousesAPI, productsAPI, ledgerAPI } from '../../services/api';
import { PageHeader, Button, Badge, Table, FilterPills, Card, Input, Select, ExportMenu, Spinner, Modal } from '../../components/common/UI';
import { exportLedger, exportToPDF, exportToExcel } from '../../utils/export';
import { useAuth } from '../../context/AuthContext';

const FormField = ({ label, required, children }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      </label>
    )}
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
// TRANSFERS PAGE
// ══════════════════════════════════════════════════════════════════════════
export function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ product: '', fromWarehouse: '', toWarehouse: '', quantity: 1, notes: '', scheduledDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transfersAPI.getAll({ status: filter });
      setTransfers(res.data.data);
    } catch { toast.error('Failed to load transfers'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showModal) {
      Promise.all([productsAPI.getAll({ limit: 200 }), warehousesAPI.getAll()])
        .then(([p, w]) => { setProducts(p.data.data); setWarehouses(w.data.data); });
    }
  }, [showModal]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (form.fromWarehouse === form.toWarehouse) { toast.error('Source and destination must differ'); return; }
    setSubmitting(true);
    try {
      await transfersAPI.create(form);
      toast.success('Transfer created!');
      setShowModal(false);
      setForm({ product: '', fromWarehouse: '', toWarehouse: '', quantity: 1, notes: '', scheduledDate: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Create failed'); }
    finally { setSubmitting(false); }
  };

  const complete = async (id, e) => {
    e.stopPropagation();
    try {
      await transfersAPI.complete(id);
      toast.success('Transfer completed — stock moved!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const exportCols = [
    { header: 'Ref', accessor: r => r.ref },
    { header: 'Product', accessor: r => r.product?.name },
    { header: 'From', accessor: r => r.fromWarehouse?.name },
    { header: 'To', accessor: r => r.toWarehouse?.name },
    { header: 'Qty', accessor: r => r.quantity },
    { header: 'Status', accessor: r => r.status },
    { header: 'Date', accessor: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Internal Transfers" subtitle="Move stock between warehouses"
        actions={<>
          <ExportMenu onPDF={() => exportToPDF('Transfers', exportCols, transfers, 'transfers.pdf')} onExcel={() => exportToExcel('Transfers', exportCols, transfers, 'transfers.xlsx')} />
          <Button onClick={() => setShowModal(true)}>+ New Transfer</Button>
        </>}
      />
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'Draft', 'In Transit', 'Done', 'Cancelled'].map(s => ({ label: s === 'all' ? 'All' : s, value: s }))}
          value={filter} onChange={setFilter}
        />
      </div>
      <Card>
        <Table
          columns={[
            { key: 'ref', label: 'Reference', render: r => <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{r.ref}</span> },
            { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
            { key: 'from', label: 'From', render: r => r.fromWarehouse?.name },
            { key: 'to', label: 'To', render: r => r.toWarehouse?.name },
            { key: 'quantity', label: 'Qty', render: r => `${r.quantity} ${r.product?.unit || ''}` },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
            { key: 'actions', label: '', render: r => r.status !== 'Done' && r.status !== 'Cancelled' ? (
              <Button size="sm" onClick={e => complete(r._id, e)}>Complete</Button>
            ) : null },
          ]}
          data={transfers}
          loading={loading}
          emptyMsg="No transfers found"
        />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Internal Transfer">
        <form onSubmit={submit}>
          <FormField label="Product" required>
            <Select value={form.product} onChange={set('product')} required>
              <option value="">Select product</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
            </Select>
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="From Warehouse" required>
              <Select value={form.fromWarehouse} onChange={set('fromWarehouse')} required>
                <option value="">Select source</option>
                {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </Select>
            </FormField>
            <FormField label="To Warehouse" required>
              <Select value={form.toWarehouse} onChange={set('toWarehouse')} required>
                <option value="">Select destination</option>
                {warehouses.filter(w => w._id !== form.fromWarehouse).map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Quantity" required>
            <Input type="number" value={form.quantity} onChange={set('quantity')} min="1" required />
          </FormField>
          <FormField label="Scheduled Date">
            <Input type="date" value={form.scheduledDate} onChange={set('scheduledDate')} />
          </FormField>
          <FormField label="Notes">
            <Input value={form.notes} onChange={set('notes')} placeholder="Optional..." />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Transfer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADJUSTMENTS PAGE
// ══════════════════════════════════════════════════════════════════════════
export function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ product: '', warehouse: '', newQty: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adjustmentsAPI.getAll();
      setAdjustments(res.data.data);
    } catch { toast.error('Failed to load adjustments'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (showModal) {
      Promise.all([productsAPI.getAll({ limit: 200 }), warehousesAPI.getAll()])
        .then(([p, w]) => { setProducts(p.data.data); setWarehouses(w.data.data); });
    }
  }, [showModal]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.product || !form.warehouse || form.newQty === '' || !form.reason) { toast.error('All fields required'); return; }
    setSubmitting(true);
    try {
      await adjustmentsAPI.create({ ...form, newQty: Number(form.newQty) });
      toast.success('Stock adjusted!');
      setShowModal(false);
      setForm({ product: '', warehouse: '', newQty: '', reason: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Adjustment failed'); }
    finally { setSubmitting(false); }
  };

  const exportCols = [
    { header: 'Ref', accessor: r => r.ref },
    { header: 'Product', accessor: r => r.product?.name },
    { header: 'Warehouse', accessor: r => r.warehouse?.name },
    { header: 'Previous Qty', accessor: r => r.previousQty },
    { header: 'New Qty', accessor: r => r.newQty },
    { header: 'Difference', accessor: r => r.difference },
    { header: 'Reason', accessor: r => r.reason },
    { header: 'Date', accessor: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <PageHeader title="Stock Adjustments" subtitle="Correct inventory discrepancies"
        actions={<>
          <ExportMenu onPDF={() => exportToPDF('Adjustments', exportCols, adjustments, 'adjustments.pdf')} onExcel={() => exportToExcel('Adjustments', exportCols, adjustments, 'adjustments.xlsx')} />
          <Button onClick={() => setShowModal(true)}>+ New Adjustment</Button>
        </>}
      />
      <Card>
        <Table
          columns={[
            { key: 'ref', label: 'Reference', render: r => <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{r.ref}</span> },
            { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
            { key: 'warehouse', label: 'Location', render: r => r.warehouse?.name },
            { key: 'previousQty', label: 'Recorded', render: r => `${r.previousQty} ${r.product?.unit || ''}` },
            { key: 'newQty', label: 'Counted', render: r => `${r.newQty} ${r.product?.unit || ''}` },
            { key: 'difference', label: 'Difference', render: r => {
              const d = r.difference;
              return <span style={{ fontWeight: 600, color: d < 0 ? 'var(--red)' : d > 0 ? 'var(--green)' : 'var(--text-muted)' }}>{d > 0 ? '+' : ''}{d}</span>;
            }},
            { key: 'reason', label: 'Reason', muted: true },
            { key: 'createdAt', label: 'Date', render: r => new Date(r.createdAt).toLocaleDateString(), muted: true },
          ]}
          data={adjustments}
          loading={loading}
          emptyMsg="No adjustments recorded"
        />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Adjustment">
        <form onSubmit={submit}>
          <FormField label="Product" required>
            <Select value={form.product} onChange={set('product')} required>
              <option value="">Select product</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
            </Select>
          </FormField>
          <FormField label="Warehouse / Location" required>
            <Select value={form.warehouse} onChange={set('warehouse')} required>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Physical Count (new quantity)" required>
            <Input type="number" value={form.newQty} onChange={set('newQty')} placeholder="Enter counted quantity" min="0" required />
          </FormField>
          <FormField label="Reason" required>
            <Select value={form.reason} onChange={set('reason')} required>
              <option value="">Select reason</option>
              {['Physical count', 'Damaged goods', 'Theft / Loss', 'Expiry', 'Data correction', 'Other'].map(r => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Apply Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// WAREHOUSES PAGE
// ══════════════════════════════════════════════════════════════════════════
export function WarehousesPage() {
  const { isManager } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehousesAPI.getAll();
      setWarehouses(res.data.data);
    } catch { toast.error('Failed to load warehouses'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectWarehouse = async (wh) => {
    setSelected(wh);
    setStockLoading(true);
    try {
      const res = await warehousesAPI.getStock(wh._id);
      setWarehouseStock(res.data.data);
    } catch { } finally { setStockLoading(false); }
  };

  const submit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await warehousesAPI.create(form);
      toast.success('Warehouse created!');
      setShowModal(false);
      setForm({ name: '', location: '', description: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Warehouses" subtitle="Manage storage locations"
        actions={isManager && <Button onClick={() => setShowModal(true)}>+ Add Warehouse</Button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {loading ? <Spinner /> : warehouses.map(wh => (
              <div key={wh._id} onClick={() => selectWarehouse(wh)}
                style={{ background: 'var(--bg-surface)', border: `1.5px solid ${selected?._id === wh._id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 20 }}>🏭</div>
                  {selected?._id === wh._id && <span style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--text-accent)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Selected</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--text-primary)' }}>{wh.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{wh.location || 'No location set'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SKUs</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{wh.totalSKUs || 0}</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total Units</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{wh.totalQty || 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <Card>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selected.name} — Stock</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.location}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>×</button>
            </div>
            {stockLoading ? <div style={{ padding: 32, textAlign: 'center' }}><Spinner /></div> : (
              <Table
                columns={[
                  { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
                  { key: 'category', label: 'Category', render: r => r.product?.category, muted: true },
                  { key: 'quantity', label: 'Qty', render: r => <strong style={{ color: r.quantity === 0 ? 'var(--red)' : 'var(--text-primary)' }}>{r.quantity} {r.product?.unit}</strong> },
                  { key: 'status', label: 'Status', render: r => <Badge status={r.quantity === 0 ? 'out' : r.quantity <= (r.product?.reorderLevel || 0) ? 'low' : 'ok'} /> },
                ]}
                data={warehouseStock}
                emptyMsg="No stock in this warehouse"
              />
            )}
          </Card>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Warehouse">
        <form onSubmit={submit}>
          <FormField label="Warehouse Name" required>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Main Warehouse" required />
          </FormField>
          <FormField label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="e.g. Building A, Floor 2" />
          </FormField>
          <FormField label="Description">
            <Input value={form.description} onChange={set('description')} placeholder="Optional description" />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Warehouse</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STOCK LEDGER PAGE
// ══════════════════════════════════════════════════════════════════════════
export function LedgerPage() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (typeFilter !== 'all') params.type = typeFilter;
      const res = await ledgerAPI.getAll(params);
      setLedger(res.data.data);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load ledger'); }
    finally { setLoading(false); }
  }, [typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const typeColors = { RECEIPT: 'var(--green)', DELIVERY: 'var(--red)', TRANSFER_IN: 'var(--accent)', TRANSFER_OUT: 'var(--purple)', ADJUSTMENT: 'var(--amber)' };

  return (
    <div>
      <PageHeader title="Stock Ledger" subtitle="Complete history of all stock movements"
        actions={<ExportMenu onPDF={() => exportLedger(ledger, 'pdf')} onExcel={() => exportLedger(ledger, 'excel')} />}
      />
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'RECEIPT', 'DELIVERY', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'].map(s => ({ label: s === 'all' ? 'All' : s.replace('_', ' '), value: s }))}
          value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1); }}
        />
      </div>
      <Card>
        <Table
          columns={[
            { key: 'date', label: 'Date & Time', render: r => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(r.createdAt).toLocaleString()}</span> },
            { key: 'type', label: 'Type', render: r => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: typeColors[r.type] || 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[r.type] || 'var(--text-muted)', flexShrink: 0 }} />
                {r.type?.replace('_', ' ')}
              </span>
            )},
            { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
            { key: 'warehouse', label: 'Warehouse', render: r => r.warehouse?.name, muted: true },
            { key: 'quantity', label: 'Quantity', render: r => <span style={{ fontWeight: 600, color: r.quantity > 0 ? 'var(--green)' : r.quantity < 0 ? 'var(--red)' : 'var(--text-muted)' }}>{r.quantity > 0 ? '+' : ''}{r.quantity}</span> },
            { key: 'balanceAfter', label: 'Balance After', render: r => <span style={{ fontWeight: 500 }}>{r.balanceAfter ?? '—'}</span> },
            { key: 'referenceRef', label: 'Reference', render: r => <span style={{ fontSize: 11, color: 'var(--text-accent)', fontWeight: 500 }}>{r.referenceRef || '—'}</span> },
            { key: 'note', label: 'Note', muted: true, render: r => <span style={{ fontSize: 12 }}>{r.note || '—'}</span> },
          ]}
          data={ledger}
          loading={loading}
          emptyMsg="No ledger entries found"
        />
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <Button size="sm" variant="secondary" disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default TransfersPage;
