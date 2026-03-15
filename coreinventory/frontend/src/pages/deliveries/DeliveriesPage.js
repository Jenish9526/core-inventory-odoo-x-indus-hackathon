import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { deliveriesAPI, productsAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Badge, Table, FilterPills, Card, Input, Select, Spinner, ExportMenu } from '../../components/common/UI';
import { exportToPDF, exportToExcel } from '../../utils/export';

// ── DELIVERIES LIST ───────────────────────────────────────────────────────
export function DeliveriesPage() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deliveriesAPI.getAll({ status: filter });
      setDeliveries(res.data.data);
    } catch { toast.error('Failed to load deliveries'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const validate = async (id, e) => {
    e.stopPropagation();
    try {
      await deliveriesAPI.validate(id);
      toast.success('Delivery validated — stock deducted!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Validation failed'); }
  };

  const exportCols = [
    { header: 'Ref', accessor: r => r.ref },
    { header: 'Customer', accessor: r => r.customer },
    { header: 'Status', accessor: r => r.status },
    { header: 'Items', accessor: r => r.items?.length },
    { header: 'Date', accessor: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  const cols = [
    { key: 'ref', label: 'Reference', render: r => <span style={{ fontWeight: 600, color: '#2563eb' }}>{r.ref}</span> },
    { key: 'customer', label: 'Customer' },
    { key: 'items', label: 'Items', render: r => `${r.items?.length || 0} product(s)` },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Date', render: r => new Date(r.createdAt).toLocaleDateString(), muted: true },
    { key: 'actions', label: '', render: r => r.status !== 'Done' && r.status !== 'Cancelled' ? (
      <Button size="sm" variant="danger" onClick={e => validate(r._id, e)}>Validate</Button>
    ) : null },
  ];

  return (
    <div>
      <PageHeader title="Delivery Orders" subtitle="Outgoing stock to customers"
        actions={<>
          <ExportMenu onPDF={() => exportToPDF('Deliveries', exportCols, deliveries, 'deliveries.pdf')} onExcel={() => exportToExcel('Deliveries', exportCols, deliveries, 'deliveries.xlsx')} />
          <Button onClick={() => navigate('/deliveries/new')}>+ New Delivery</Button>
        </>}
      />
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'Draft', 'Ready', 'In Transit', 'Done', 'Cancelled'].map(s => ({ label: s === 'all' ? 'All' : s, value: s }))}
          value={filter} onChange={setFilter}
        />
      </div>
      <Card>
        <Table columns={cols} data={deliveries} loading={loading} emptyMsg="No delivery orders found" onRowClick={r => navigate(`/deliveries/${r._id}`)} />
      </Card>
    </div>
  );
}

// ── DELIVERY FORM ─────────────────────────────────────────────────────────
export function DeliveryFormPage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
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
    if (!customer) { toast.error('Customer is required'); return; }
    if (items.some(it => !it.product || !it.warehouse || !it.quantity)) { toast.error('Fill all item fields'); return; }
    setLoading(true);
    try {
      await deliveriesAPI.create({ customer, notes, scheduledDate, items });
      toast.success('Delivery order created!');
      navigate('/deliveries');
    } catch (err) { toast.error(err.response?.data?.message || 'Create failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="New Delivery Order" subtitle="Create an outgoing stock delivery" />
      <div style={{ maxWidth: 720 }}>
        <Card style={{ padding: 24 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Customer <span style={{ color: 'var(--red)' }}>*</span></label>
                <Input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Customer name" required />
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
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Products to Ship</span>
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
                    {i === 0 && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Source Warehouse</label>}
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
                    <button type="button" onClick={() => removeItem(i)} style={{ padding: '8px 10px', border: '1px solid #fee2e2', borderRadius: 8, background: 'var(--bg-surface)', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>×</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="secondary" type="button" onClick={() => navigate('/deliveries')}>Cancel</Button>
              <Button type="submit" loading={loading}>Create Delivery</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ── DELIVERY DETAIL ───────────────────────────────────────────────────────
export function DeliveryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  const load = useCallback(() => {
    deliveriesAPI.getOne(id)
      .then(r => setDelivery(r.data.data))
      .catch(() => toast.error('Delivery not found'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const validate = async () => {
    setValidating(true);
    try {
      await deliveriesAPI.validate(id);
      toast.success('Delivery validated — stock deducted!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Validation failed'); }
    finally { setValidating(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;
  if (!delivery) return null;

  return (
    <div>
      <PageHeader title={delivery.ref} subtitle={`Customer: ${delivery.customer}`}
        actions={<>
          <Badge status={delivery.status} />
          {delivery.status !== 'Done' && delivery.status !== 'Cancelled' && (
            <Button variant="danger" loading={validating} onClick={validate}>✓ Validate Delivery</Button>
          )}
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <Card>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600 }}>Products to Ship</div>
          <Table
            columns={[
              { key: 'product', label: 'Product', render: r => <div><div style={{ fontWeight: 500 }}>{r.product?.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.product?.sku}</div></div> },
              { key: 'warehouse', label: 'From Warehouse', render: r => r.warehouse?.name },
              { key: 'quantity', label: 'Quantity', render: r => `${r.quantity} ${r.product?.unit}` },
              { key: 'pickedQty', label: 'Picked', render: r => <span style={{ color: r.pickedQty > 0 ? '#22c55e' : '#94a3b8' }}>{r.pickedQty} {r.product?.unit}</span> },
            ]}
            data={delivery.items || []}
          />
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Delivery Details</div>
          {[
            ['Reference', delivery.ref],
            ['Customer', delivery.customer],
            ['Status', <Badge status={delivery.status} />],
            ['Created', new Date(delivery.createdAt).toLocaleDateString()],
            ['Validated', delivery.validatedAt ? new Date(delivery.validatedAt).toLocaleString() : '—'],
            ['Created By', delivery.createdBy?.name || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          {delivery.notes && <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: '#475569' }}>{delivery.notes}</div>}
        </Card>
      </div>
    </div>
  );
}

export default DeliveriesPage;
