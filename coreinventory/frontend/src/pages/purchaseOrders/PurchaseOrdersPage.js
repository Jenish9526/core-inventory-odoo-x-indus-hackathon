import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { purchaseOrdersAPI, productsAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Badge, Table, FilterPills, Card, Modal, Select, Input, ExportMenu } from '../../components/common/UI';
import { exportToPDF, exportToExcel } from '../../utils/export';
import { useAuth } from '../../context/AuthContext';

const FF = ({ label, required, children }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
      {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>}
    {children}
  </div>
);

const NEXT = { Draft: 'Approved', Approved: 'Ordered', Ordered: 'Received' };
const NEXT_LABEL = { Draft: 'Approve', Approved: 'Mark Ordered', Ordered: 'Mark Received' };
const NEXT_VARIANT = { Draft: 'success', Approved: 'primary', Ordered: 'success' };

export default function PurchaseOrdersPage() {
  const { isManager } = useAuth();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([{ product: '', warehouse: '', quantity: 1, unitCost: 0 }]);
  const [form, setForm] = useState({ supplier: '', notes: '', expectedDate: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await purchaseOrdersAPI.getAll({ status: filter });
      setPOs(res.data.data);
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showModal) {
      Promise.all([productsAPI.getAll({ limit: 500 }), warehousesAPI.getAll()])
        .then(([p, w]) => { setProducts(p.data.data); setWarehouses(w.data.data); });
    }
  }, [showModal]);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setItem = (i, k) => e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it));
  const addItem = () => setItems(prev => [...prev, { product: '', warehouse: '', quantity: 1, unitCost: 0 }]);
  const removeItem = i => setItems(prev => prev.filter((_, idx) => idx !== i));

  const submit = async e => {
    e.preventDefault();
    if (items.some(it => !it.product || !it.warehouse)) { toast.error('Fill all item fields'); return; }
    setSubmitting(true);
    try {
      await purchaseOrdersAPI.create({ ...form, items });
      toast.success('Purchase order created!');
      setShowModal(false);
      setForm({ supplier: '', notes: '', expectedDate: '' });
      setItems([{ product: '', warehouse: '', quantity: 1, unitCost: 0 }]);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const advance = async (po, e) => {
    e.stopPropagation();
    const next = NEXT[po.status];
    if (!next) return;
    try {
      await purchaseOrdersAPI.updateStatus(po._id, next);
      toast.success(`PO ${po.ref} → ${next}`);
      load();
      if (detail?._id === po._id) {
        const res = await purchaseOrdersAPI.getOne(po._id);
        setDetail(res.data.data);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const cancel = async (po, e) => {
    e.stopPropagation();
    try {
      await purchaseOrdersAPI.updateStatus(po._id, 'Cancelled');
      toast.success('PO cancelled');
      load();
      if (detail?._id === po._id) setDetail(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openDetail = async (po) => {
    const res = await purchaseOrdersAPI.getOne(po._id);
    setDetail(res.data.data);
  };

  const exportCols = [
    { header: 'Ref', accessor: r => r.ref },
    { header: 'Supplier', accessor: r => r.supplier },
    { header: 'Items', accessor: r => r.items?.length },
    { header: 'Status', accessor: r => r.status },
    { header: 'Expected', accessor: r => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString() : '' },
    { header: 'Created', accessor: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  const totalValue = (po) => po.items?.reduce((s, it) => s + (it.quantity * (it.unitCost || 0)), 0) || 0;

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Draft → Approved → Ordered → Received"
        actions={<>
          <ExportMenu onPDF={() => exportToPDF('Purchase Orders', exportCols, pos, 'purchase-orders.pdf')} onExcel={() => exportToExcel('Purchase Orders', exportCols, pos, 'purchase-orders.xlsx')} />
          <Button onClick={() => setShowModal(true)}>+ New PO</Button>
        </>}
      />
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'Draft', 'Approved', 'Ordered', 'Received', 'Cancelled'].map(s => ({ label: s === 'all' ? 'All' : s, value: s }))}
          value={filter} onChange={setFilter}
        />
      </div>
      <Card>
        <Table
          columns={[
            { key: 'ref', label: 'Reference', render: r => <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{r.ref}</span> },
            { key: 'supplier', label: 'Supplier', render: r => <span style={{ fontWeight: 500 }}>{r.supplier}</span> },
            { key: 'items', label: 'Items', render: r => `${r.items?.length || 0} SKU(s)`, muted: true },
            { key: 'value', label: 'Est. Value', render: r => { const v = totalValue(r); return <span style={{ fontWeight: 600 }}>{v > 0 ? `$${v.toLocaleString()}` : '—'}</span>; } },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
            { key: 'expectedDate', label: 'Expected', render: r => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString() : '—', muted: true },
            { key: 'actions', label: '', render: r => (
              <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                {isManager && NEXT[r.status] && <Button size="sm" variant={NEXT_VARIANT[r.status]} onClick={e => advance(r, e)}>{NEXT_LABEL[r.status]}</Button>}
                {isManager && !['Received', 'Cancelled'].includes(r.status) && <Button size="sm" variant="danger" onClick={e => cancel(r, e)}>Cancel</Button>}
              </div>
            )},
          ]}
          data={pos} loading={loading} emptyMsg="No purchase orders found" onRowClick={openDetail}
        />
      </Card>

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`PO — ${detail?.ref}`} width={640}>
        {detail && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[['Supplier', detail.supplier], ['Status', <Badge status={detail.status} />], ['Created by', detail.createdBy?.name || '—'], ['Expected', detail.expectedDate ? new Date(detail.expectedDate).toLocaleDateString() : '—'], ['Approved', detail.approvedAt ? new Date(detail.approvedAt).toLocaleDateString() : '—'], ['Received', detail.receivedAt ? new Date(detail.receivedAt).toLocaleDateString() : '—']].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Items</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {['Product', 'Warehouse', 'Qty', 'Unit Cost', 'Total'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((it, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px' }}><div style={{ fontWeight: 500 }}>{it.product?.name}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{it.product?.sku}</div></td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{it.warehouse?.name}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.quantity}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{it.unitCost > 0 ? `$${it.unitCost}` : '—'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.unitCost > 0 ? `$${(it.quantity * it.unitCost).toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {detail.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Notes: {detail.notes}</div>}
            {isManager && (NEXT[detail.status] || !['Received', 'Cancelled'].includes(detail.status)) && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {!['Received', 'Cancelled'].includes(detail.status) && <Button variant="danger" onClick={e => cancel(detail, e)}>Cancel PO</Button>}
                {NEXT[detail.status] && <Button variant={NEXT_VARIANT[detail.status]} onClick={e => advance(detail, e)}>{NEXT_LABEL[detail.status]}</Button>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Order" width={700}>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FF label="Supplier" required>
              <input value={form.supplier} onChange={setF('supplier')} required placeholder="Supplier name"
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
            </FF>
            <FF label="Expected Date"><Input type="date" value={form.expectedDate} onChange={setF('expectedDate')} /></FF>
          </div>
          <FF label="Notes">
            <input value={form.notes} onChange={setF('notes')} placeholder="Optional notes"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
          </FF>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Items</div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 80px 90px 32px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <FF label={i === 0 ? 'Product' : undefined}>
                <Select value={item.product} onChange={setItem(i, 'product')} required>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </Select>
              </FF>
              <FF label={i === 0 ? 'Warehouse' : undefined}>
                <Select value={item.warehouse} onChange={setItem(i, 'warehouse')} required>
                  <option value="">Warehouse</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </Select>
              </FF>
              <FF label={i === 0 ? 'Qty' : undefined}><Input type="number" value={item.quantity} onChange={setItem(i, 'quantity')} min="1" required /></FF>
              <FF label={i === 0 ? 'Unit Cost' : undefined}><Input type="number" value={item.unitCost} onChange={setItem(i, 'unitCost')} min="0" step="0.01" /></FF>
              <div style={{ paddingBottom: 16 }}>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(i)}
                    style={{ width: 32, height: 36, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 16 }}>×</button>
                )}
              </div>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addItem} style={{ marginBottom: 20 }}>+ Add Item</Button>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create PO</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
