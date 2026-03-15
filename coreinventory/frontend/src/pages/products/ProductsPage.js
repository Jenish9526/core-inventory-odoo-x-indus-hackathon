import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productsAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Badge, Table, FilterPills, Card, Input, Select, ExportMenu, Spinner, KPICard } from '../../components/common/UI';
import { exportProducts } from '../../utils/export';
import { useAuth } from '../../context/AuthContext';
import useBarcode from '../../hooks/useBarcode';

// ── PRODUCTS LIST ─────────────────────────────────────────────────────────
export function ProductsPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await productsAPI.getAll(params);
      setProducts(res.data.data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { productsAPI.getCategories().then(r => setCategories(r.data.data)).catch(() => {}); }, []);

  const filtered = statusFilter === 'all' ? products : products.filter(p => p.stockStatus === statusFilter);

  const columns = [
    { key: 'name', label: 'Product', render: r => <div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.sku}</div></div> },
    { key: 'category', label: 'Category' },
    { key: 'unit', label: 'Unit', muted: true },
    { key: 'reorderLevel', label: 'Reorder Level', render: r => `${r.reorderLevel} ${r.unit}`, muted: true },
    { key: 'totalStock', label: 'In Stock', render: r => <strong style={{ color: r.stockStatus === 'out' ? '#ef4444' : r.stockStatus === 'low' ? '#f59e0b' : '#22c55e' }}>{r.totalStock ?? 0} {r.unit}</strong> },
    { key: 'stockStatus', label: 'Status', render: r => <Badge status={r.stockStatus === 'ok' ? 'ok' : r.stockStatus === 'low' ? 'low' : 'out'} /> },
    { key: 'actions', label: '', render: r => isManager ? (
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={e => { e.stopPropagation(); navigate(`/products/${r._id}/edit`); }}
          style={{ padding: '3px 10px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-surface)', cursor: 'pointer', color: '#475569' }}>Edit</button>
      </div>
    ) : null },
  ];

  return (
    <div>
      <PageHeader title="Products" subtitle={`${products.length} products in catalog`}
        actions={<>
          <ExportMenu onPDF={() => exportProducts(filtered, 'pdf')} onExcel={() => exportProducts(filtered, 'excel')} />
          {isManager && <Button onClick={() => navigate('/products/new')}>+ Add Product</Button>}
        </>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..."
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, minWidth: 220, fontFamily: 'var(--font)', color: 'var(--text-primary)', outline: 'none' }} />
        <select value={category} onChange={e => setCategory(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font)', color: 'var(--text-primary)', outline: 'none' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <FilterPills
          options={[{ label: 'All', value: 'all' }, { label: 'In Stock', value: 'ok' }, { label: 'Low Stock', value: 'low' }, { label: 'Out of Stock', value: 'out' }]}
          value={statusFilter} onChange={setStatusFilter}
        />
      </div>

      <Card>
        <Table columns={columns} data={filtered} loading={loading} emptyMsg="No products found" onRowClick={r => navigate(`/products/${r._id}`)} />
      </Card>
    </div>
  );
}

// ── PRODUCT FORM ──────────────────────────────────────────────────────────
export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit: 'pcs', reorderLevel: 10, description: '', barcode: '' });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const onBarcodeDetect = useCallback((code) => {
    setForm(f => ({ ...f, barcode: code, sku: code }));
    setScanning(false);
    toast.success(`Barcode scanned: ${code}`);
  }, []);
  const scanRef = useBarcode(onBarcodeDetect, scanning);

  useEffect(() => {
    if (isEdit) {
      productsAPI.getOne(id).then(r => {
        const p = r.data.data;
        setForm({ name: p.name, sku: p.sku, category: p.category, unit: p.unit, reorderLevel: p.reorderLevel, description: p.description || '', barcode: p.barcode || '' });
      }).catch(() => toast.error('Failed to load product'));
    }
  }, [id, isEdit]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.category) { toast.error('Name, SKU, and Category are required'); return; }
    setLoading(true);
    try {
      if (isEdit) { await productsAPI.update(id, form); toast.success('Product updated'); }
      else { await productsAPI.create(form); toast.success('Product created'); }
      navigate('/products');
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title={isEdit ? 'Edit Product' : 'New Product'} subtitle={isEdit ? 'Update product details' : 'Add a product to your catalog'} />
      <div style={{ maxWidth: 600 }}>
        <Card style={{ padding: 24 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Product Name <span style={{ color: 'var(--red)' }}>*</span></label>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Steel Rods" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>SKU / Code <span style={{ color: 'var(--red)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input value={form.sku} onChange={set('sku')} placeholder="e.g. STL-001" required />
                  <button type="button" onClick={() => setScanning(s => !s)} title="Scan barcode"
                    style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, background: scanning ? 'var(--accent-dim)' : 'var(--bg-elevated)', cursor: 'pointer', fontSize: 16 }}>
                    📷
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Category <span style={{ color: 'var(--red)' }}>*</span></label>
                <Input value={form.category} onChange={set('category')} placeholder="e.g. Raw Materials" required />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Unit of Measure <span style={{ color: 'var(--red)' }}>*</span></label>
                <Select value={form.unit} onChange={set('unit')}>
                  {['pcs', 'kg', 'g', 'l', 'm', 'box', 'roll', 'set'].map(u => <option key={u}>{u}</option>)}
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Reorder Level</label>
                <Input type="number" value={form.reorderLevel} onChange={set('reorderLevel')} min="0" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Barcode</label>
                <Input value={form.barcode} onChange={set('barcode')} placeholder="Auto-filled by scanner" />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={set('description')} placeholder="Optional product description..."
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', resize: 'vertical', minHeight: 80, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {/* Barcode scanner viewfinder */}
            {scanning && (
              <div style={{ marginBottom: 16, border: '2px dashed #3b82f6', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <div ref={scanRef} style={{ width: '100%', height: 200 }} />
                <div style={{ padding: 8, textAlign: 'center', background: '#1e293b', color: 'var(--text-muted)', fontSize: 12 }}>
                  Point camera at barcode · Press 📷 to stop
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="secondary" onClick={() => navigate('/products')} type="button">Cancel</Button>
              <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Product'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL ────────────────────────────────────────────────────────
export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsAPI.getOne(id)
      .then(r => setProduct(r.data.data))
      .catch(() => toast.error('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;
  if (!product) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Product not found</div>;

  const totalStock = product.stocks?.reduce((s, st) => s + st.quantity, 0) || 0;
  const stockStatus = totalStock === 0 ? 'out' : totalStock <= product.reorderLevel ? 'low' : 'ok';

  return (
    <div>
      <PageHeader title={product.name} subtitle={`SKU: ${product.sku} · ${product.category}`}
        actions={<>
          {isManager && <Button onClick={() => navigate(`/products/${id}/edit`)} variant="secondary">Edit</Button>}
          <Badge status={stockStatus} />
        </>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        <KPICard label="Total Stock" value={`${totalStock} ${product.unit}`} icon="📦" color="#3b82f6" />
        <KPICard label="Reorder Level" value={`${product.reorderLevel} ${product.unit}`} icon="⚠️" color="#f59e0b" />
        <KPICard label="Warehouses" value={product.stocks?.length || 0} icon="🏭" color="#22c55e" />
      </div>

      <Card>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Stock by Warehouse</div>
        <Table
          columns={[
            { key: 'warehouse', label: 'Warehouse', render: r => r.warehouse?.name },
            { key: 'quantity', label: 'Quantity', render: r => <strong>{r.quantity} {product.unit}</strong> },
            { key: 'status', label: 'Status', render: r => <Badge status={r.quantity === 0 ? 'out' : r.quantity <= product.reorderLevel ? 'low' : 'ok'} /> },
          ]}
          data={product.stocks || []}
          emptyMsg="No stock records yet"
        />
      </Card>
    </div>
  );
}

export default ProductsPage;
