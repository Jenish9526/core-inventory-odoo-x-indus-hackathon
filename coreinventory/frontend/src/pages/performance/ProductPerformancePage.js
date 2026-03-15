import React, { useEffect, useState, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../../services/api';
import { PageHeader, Card, CardHeader, FilterPills, Spinner, ExportMenu } from '../../components/common/UI';
import { exportToPDF, exportToExcel } from '../../utils/export';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PERIODS = [
  { label: '7 Days', value: '7' },
  { label: '30 Days', value: '30' },
  { label: '90 Days', value: '90' },
];

export default function ProductPerformancePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [tab, setTab] = useState('movers');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getProductPerformance({ days });
      setData(res.data.data);
    } catch { toast.error('Failed to load performance data'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const topMovers = [...data].sort((a, b) => b.totalOut - a.totalOut).slice(0, 10);
  const slowMovers = [...data].filter(d => d.totalOut > 0).sort((a, b) => a.totalOut - b.totalOut).slice(0, 10);
  const deadStock = data.filter(d => d.totalOut === 0 && d.currentQty > 0).slice(0, 10);

  const chartOpts = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} units` } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4a5778', font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { color: '#8896b3', font: { size: 11 } } },
    },
  };

  const makeChart = (items, color) => ({
    labels: items.map(d => d.product?.name?.length > 22 ? d.product.name.slice(0, 22) + '…' : d.product?.name),
    datasets: [{ data: items.map(d => d.totalOut || d.currentQty), backgroundColor: color, borderRadius: 4, barThickness: 14 }],
  });

  const exportCols = [
    { header: 'Product', accessor: r => r.product?.name },
    { header: 'SKU', accessor: r => r.product?.sku },
    { header: 'Category', accessor: r => r.product?.category },
    { header: 'Units Out', accessor: r => r.totalOut },
    { header: 'Units In', accessor: r => r.totalIn },
    { header: 'Transactions', accessor: r => r.txCount },
    { header: 'Current Stock', accessor: r => r.currentQty },
  ];

  const currentList = tab === 'movers' ? topMovers : tab === 'slow' ? slowMovers : deadStock;

  return (
    <div>
      <PageHeader title="Product Performance" subtitle={`Stock movement analysis — last ${days} days`}
        actions={<>
          <ExportMenu onPDF={() => exportToPDF('Product Performance', exportCols, data, 'performance.pdf')} onExcel={() => exportToExcel('Product Performance', exportCols, data, 'performance.xlsx')} />
          <select value={days} onChange={e => setDays(e.target.value)}
            style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer', outline: 'none' }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </>}
      />

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Products Tracked', value: data.length, color: 'var(--accent)' },
          { label: 'Top Mover Units Out', value: topMovers[0]?.totalOut || 0, color: 'var(--green)' },
          { label: 'Slow Movers', value: slowMovers.length, color: 'var(--amber)' },
          { label: 'Dead Stock Items', value: deadStock.length, color: 'var(--red)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.6 }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{loading ? '—' : k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={[{ label: 'Top Movers', value: 'movers' }, { label: 'Slow Movers', value: 'slow' }, { label: 'Dead Stock', value: 'dead' }]}
          value={tab} onChange={setTab}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Chart */}
        <Card>
          <CardHeader
            title={tab === 'movers' ? 'Top 10 Movers' : tab === 'slow' ? 'Slow Movers (Lowest Outbound)' : 'Dead Stock (No Movement)'}
            subtitle="Units dispatched in period"
          />
          <div style={{ padding: 20, height: 340 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><Spinner /></div>
            ) : currentList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div>
            ) : (
              <Bar
                data={makeChart(
                  currentList,
                  tab === 'movers' ? 'rgba(59,130,246,0.7)' : tab === 'slow' ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'
                )}
                options={chartOpts}
              />
            )}
          </div>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader title="Details" subtitle={`${currentList.length} products`} />
          <div style={{ overflowY: 'auto', maxHeight: 380 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'Out', 'In', 'Stock', 'Txns'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i}><td colSpan={5} style={{ padding: '12px 16px' }}><div style={{ height: 12, borderRadius: 4, background: 'var(--bg-elevated)', width: '80%' }} /></td></tr>
                  ))
                ) : currentList.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.product?.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.product?.sku} · {d.product?.category}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-accent)' }}>{d.totalOut}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--green)' }}>{d.totalIn}</td>
                    <td style={{ padding: '10px 16px', color: d.currentQty === 0 ? 'var(--red)' : 'var(--text-primary)', fontWeight: 600 }}>{d.currentQty}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{d.txCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
