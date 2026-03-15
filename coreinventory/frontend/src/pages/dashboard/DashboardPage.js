import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { dashboardAPI, ledgerAPI } from '../../services/api';
import { KPICard, Badge, Card, CardHeader, PageHeader, Spinner, EmptyState } from '../../components/common/UI';
import { useSocket } from '../../context/SocketContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

// Plugin: draw numbers outside doughnut slices
const outsideLabelPlugin = {
  id: 'outsideLabels',
  afterDatasetDraw(chart) {
    const { ctx, data } = chart;
    const dataset = chart.getDatasetMeta(0);
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    if (!total) return;
    dataset.data.forEach((arc, i) => {
      const val = data.datasets[0].data[i];
      if (!val) return;
      const { x, y, startAngle, endAngle, outerRadius } = arc.getProps(['x', 'y', 'startAngle', 'endAngle', 'outerRadius'], true);
      const midAngle = (startAngle + endAngle) / 2;
      const r = outerRadius + 18;
      const lx = x + Math.cos(midAngle) * r;
      const ly = y + Math.sin(midAngle) * r;
      ctx.save();
      ctx.font = 'bold 11px Plus Jakarta Sans';
      ctx.fillStyle = data.datasets[0].backgroundColor[i];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, lx, ly);
      ctx.restore();
    });
  },
};

// Plugin: draw total in center of doughnut
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.font = 'bold 20px Plus Jakarta Sans';
    ctx.fillStyle = '#f0f4ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 8);
    ctx.font = '10px Plus Jakarta Sans';
    ctx.fillStyle = '#4a5778';
    ctx.fillText('total ops', cx, cy + 10);
    ctx.restore();
  },
};

ChartJS.register(outsideLabelPlugin, centerTextPlugin);

const TYPE_COLOR = { RECEIPT: '#10b981', DELIVERY: '#ef4444', TRANSFER_IN: '#3b82f6', TRANSFER_OUT: '#8b5cf6', ADJUSTMENT: '#f59e0b' };
const TYPE_ICON  = { RECEIPT: '↓', DELIVERY: '↑', TRANSFER_IN: '⇥', TRANSFER_OUT: '⇤', ADJUSTMENT: '±' };

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stockEvents } = useSocket();
  const { settings } = useSettings();
  const { user, isManager } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [activity, setActivity] = useState([]);
  const [allLedger, setAllLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('week');

  const load = useCallback(async () => {
    try {
      const [k, l, a, led] = await Promise.all([
        dashboardAPI.getKPIs(),
        dashboardAPI.getLowStock(),
        dashboardAPI.getActivity(),
        ledgerAPI.getAll({ limit: 1000 }),
      ]);
      setKpis(k.data.data);
      setLowStock(l.data.data);
      setActivity(a.data.data);
      setAllLedger(led.data.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (stockEvents.length) load(); }, [stockEvents, load]);

  // ── Line chart: build labels + data based on selected period ─────────
  const { labels, inData, outData } = React.useMemo(() => {
    const now = new Date();

    if (chartPeriod === 'day') {
      // All 24 hours of today, 1 bucket per hour
      const lbls = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
      const inD = Array(24).fill(0), outD = Array(24).fill(0);
      const today = new Date(now); today.setHours(0,0,0,0);
      allLedger.forEach(e => {
        const d = new Date(e.createdAt);
        if (d < today || d > now) return;
        const h = d.getHours();
        if (e.quantity > 0) inD[h] += e.quantity;
        else outD[h] += Math.abs(e.quantity);
      });
      return { labels: lbls, inData: inD, outData: outD };
    }

    if (chartPeriod === 'week') {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const lbls = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(now.getDate() - (6 - i));
        return days[d.getDay()];
      });
      const inD = Array(7).fill(0), outD = Array(7).fill(0);
      allLedger.forEach(e => {
        const diffDays = Math.floor((now - new Date(e.createdAt)) / 86400000);
        const idx = 6 - diffDays;
        if (idx < 0 || idx > 6) return;
        if (e.quantity > 0) inD[idx] += e.quantity;
        else outD[idx] += Math.abs(e.quantity);
      });
      return { labels: lbls, inData: inD, outData: outD };
    }

    if (chartPeriod === 'month') {
      // Current month only, one bucket per day (1 → today)
      const daysInMonth = now.getDate(); // days elapsed so far this month
      const lbls = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const inD = Array(daysInMonth).fill(0), outD = Array(daysInMonth).fill(0);
      allLedger.forEach(e => {
        const d = new Date(e.createdAt);
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
        const idx = d.getDate() - 1;
        if (idx < 0 || idx >= daysInMonth) return;
        if (e.quantity > 0) inD[idx] += e.quantity;
        else outD[idx] += Math.abs(e.quantity);
      });
      return { labels: lbls, inData: inD, outData: outD };
    }

    // year — last 12 months
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const lbls = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now); d.setMonth(now.getMonth() - (11 - i));
      return monthNames[d.getMonth()];
    });
    const inD = Array(12).fill(0), outD = Array(12).fill(0);
    allLedger.forEach(e => {
      const d = new Date(e.createdAt);
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      const idx = 11 - diffMonths;
      if (idx < 0 || idx > 11) return;
      if (e.quantity > 0) inD[idx] += e.quantity;
      else outD[idx] += Math.abs(e.quantity);
    });
    return { labels: lbls, inData: inD, outData: outD };
  }, [allLedger, chartPeriod]);

  // Gradient fills — created via canvas context
  const getGradient = (ctx, chartArea, color) => {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, color.replace('1)', '0.18)'));
    gradient.addColorStop(1, color.replace('1)', '0.01)'));
    return gradient;
  };

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Stock In', data: inData,
        borderColor: '#10b981',
        backgroundColor: (ctx) => {
          const { chart } = ctx; const { chartArea } = chart;
          if (!chartArea) return 'transparent';
          return getGradient(chart.ctx, chartArea, 'rgba(16,185,129,1)');
        },
        fill: true, tension: 0.45,
        pointRadius: 0, pointHoverRadius: 5,
        pointHoverBackgroundColor: '#10b981',
        pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Stock Out', data: outData,
        borderColor: '#ef4444',
        backgroundColor: (ctx) => {
          const { chart } = ctx; const { chartArea } = chart;
          if (!chartArea) return 'transparent';
          return getGradient(chart.ctx, chartArea, 'rgba(239,68,68,1)');
        },
        fill: true, tension: 0.45,
        pointRadius: 0, pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ef4444',
        pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  };

  const lineOpts = {
    responsive: true,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top', align: 'end',
        labels: {
          color: '#8896b3', font: { size: 11, family: 'Plus Jakarta Sans', weight: '600' },
          boxWidth: 8, boxHeight: 8, borderRadius: 4, padding: 16,
          usePointStyle: true, pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: '#0f1729',
        borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
        titleColor: '#f0f4ff', bodyColor: '#8896b3',
        padding: 12, cornerRadius: 10,
        position: 'nearest',
        xAlign: 'right',
        yAlign: 'center',
        caretPadding: 12,
        titleFont: { size: 11, weight: '600', family: 'Plus Jakarta Sans' },
        bodyFont: { size: 12, family: 'Plus Jakarta Sans' },
        callbacks: {
          title: items => items[0].label,
          label: ctx => `  ${ctx.dataset.label}:  ${ctx.parsed.y.toLocaleString()} units`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: '#4a5778', font: { size: 11, family: 'Plus Jakarta Sans' },
          maxRotation: 0, padding: 8,
          maxTicksLimit: chartPeriod === 'day' ? 12 : chartPeriod === 'month' ? 10 : undefined,
        },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: '#4a5778', font: { size: 11, family: 'Plus Jakarta Sans' },
          padding: 10,
          callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v,
        },
        beginAtZero: true,
      },
    },
  };

  // ── Doughnut: real operation counts ──────────────────────────────────
  const rcptCount = allLedger.filter(a => a.type === 'RECEIPT').length;
  const dlvCount  = allLedger.filter(a => a.type === 'DELIVERY').length;
  const trfCount  = allLedger.filter(a => a.type === 'TRANSFER_IN' || a.type === 'TRANSFER_OUT').length;
  const adjCount  = allLedger.filter(a => a.type === 'ADJUSTMENT').length;

  const donutData = {
    labels: ['Receipts', 'Deliveries', 'Transfers', 'Adjustments'],
    datasets: [{
      data: [rcptCount || 0, dlvCount || 0, trfCount || 0, adjCount || 0],
      backgroundColor: ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'],
      borderWidth: 0, hoverOffset: 6,
    }],
  };
  const donutOpts = {
    responsive: true,
    layout: { padding: 24 },
    plugins: {
      legend: { position: 'bottom', labels: { color: '#8896b3', font: { size: 11, family: 'Plus Jakarta Sans' }, padding: 12, boxWidth: 10 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } },
    },
    cutout: '62%',
    animation: false,
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spinner size={36} /></div>;

  const totalIn  = inData.reduce((a, b) => a + b, 0);
  const totalOut = outData.reduce((a, b) => a + b, 0);

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Dashboard"
        subtitle={
          !isManager && user?.jobRole
            ? `${user.jobRole}${user.warehouse?.name ? ` · ${user.warehouse.name}` : ''}`
            : 'Real-time inventory overview'
        }
      />

      {/* KPIs */}
      <div className="grid-kpi stagger" style={{ marginBottom: 24 }}>
        <KPICard label="Products"          value={kpis?.totalProducts}      accent="var(--accent)"  onClick={() => navigate('/products')} />
        <KPICard label="Low Stock"         value={kpis?.lowStockCount}       accent="var(--amber)"  onClick={() => navigate('/products')} />
        <KPICard label="Out of Stock"      value={kpis?.outOfStockCount}     accent="var(--red)"    onClick={() => navigate('/products')} />
        {(!user?.jobRole || ['Warehouse Supervisor','Inventory Coordinator','Receiving Clerk','Production Store Keeper','Cold Chain Specialist'].includes(user.jobRole) || isManager) && (
          <KPICard label="Pending Receipts"  value={kpis?.pendingReceipts}   accent="var(--green)"  onClick={() => navigate('/receipts')} />
        )}
        {(!user?.jobRole || ['Warehouse Supervisor','Inventory Coordinator','Dispatch Coordinator'].includes(user.jobRole) || isManager) && (
          <KPICard label="Pending Deliveries" value={kpis?.pendingDeliveries} accent="var(--purple)" onClick={() => navigate('/deliveries')} />
        )}
        {(!user?.jobRole || ['Warehouse Supervisor','Inventory Coordinator','Forklift Operator','Material Handler','Production Store Keeper','Cold Chain Specialist'].includes(user.jobRole) || isManager) && (
          <KPICard label="Active Transfers"  value={kpis?.scheduledTransfers} accent="var(--cyan)"  onClick={() => navigate('/transfers')} />
        )}
      </div>



      {/* Row 1 */}
      <div className="grid-dash-row" style={{ marginBottom: 16 }}>

        {/* Stock Movement + Low Stock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader
              title="Stock Movement"
              subtitle={{ day: 'Last 24 hours', week: 'Last 7 days', month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), year: 'Last 12 months' }[chartPeriod]}
              actions={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>+{totalIn.toLocaleString()} in</span>
                  <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>−{totalOut.toLocaleString()} out</span>
                  <select value={chartPeriod} onChange={e => setChartPeriod(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)', padding: '4px 8px', cursor: 'pointer', outline: 'none' }}>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>
                </div>
              }
            />
            <div style={{ padding: '8px 16px 16px' }}><Line data={lineData} options={lineOpts} height={130} /></div>
          </Card>
          {lowStock.length > 0 && (
            <Card>
              <CardHeader title="Low Stock Alert" actions={<span style={{ fontSize: 11, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/products')}>View all →</span>} />
              {lowStock.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{item.product?.sku} · {item.totalQty} left</div>
                  </div>
                  <Badge status={item.totalQty === 0 ? 'out' : 'low'}>{item.totalQty === 0 ? 'Out' : 'Low'}</Badge>
                </div>
              ))}
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader title="Recent Activity" actions={<span style={{ fontSize: 11, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/history')}>View all →</span>} />
          {activity.length === 0
            ? <EmptyState icon="≡" title="No activity yet" subtitle="Operations will appear here" />
            : activity.slice(0, 8).map((item, i) => (
              <div key={item._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: (TYPE_COLOR[item.type] || '#4a5778') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: TYPE_COLOR[item.type] || '#4a5778', fontWeight: 700, flexShrink: 0, border: `1px solid ${(TYPE_COLOR[item.type] || '#4a5778')}25` }}>
                  {TYPE_ICON[item.type] || '·'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.product?.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {item.warehouse?.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.type?.replace(/_/g, ' ')} · {item.referenceRef || '—'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.quantity > 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>{item.quantity > 0 ? '+' : ''}{item.quantity}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
        </Card>

        {/* Operation Mix + Low Stock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <CardHeader title="Operation Mix" subtitle="All-time by type" />
            <div style={{ padding: '8px 12px 12px' }}>
              <Doughnut data={donutData} options={donutOpts} />
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
