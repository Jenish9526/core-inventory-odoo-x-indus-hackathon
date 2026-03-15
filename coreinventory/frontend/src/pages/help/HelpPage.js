import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card } from '../../components/common/UI';

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview',
    icon: '◫',
    content: [
      {
        heading: 'What is CoreInventory?',
        body: 'CoreInventory is a full-stack Inventory Management System (IMS) that lets you track stock across multiple warehouses in real time. Every stock movement — receipts, deliveries, transfers, adjustments — is recorded in a full audit trail.',
      },
      {
        heading: 'Real-time updates',
        body: 'The app uses Socket.io to push live stock updates and low-stock alerts to all connected users instantly. The green "Live" pill in the top bar confirms your connection.',
      },
      {
        heading: 'Roles',
        body: 'There are two roles — Manager and Staff. Managers have full access including creating products, warehouses, and stock adjustments. Staff can create and validate receipts, deliveries, and transfers but cannot modify products or make adjustments.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '▤',
    content: [
      {
        heading: 'KPI Cards',
        body: 'The top row shows 6 key metrics at a glance — total products, low stock count, out of stock count, pending receipts, pending deliveries, and active transfers. Click any card to navigate to that section.',
      },
      {
        heading: 'Stock Movement Chart',
        body: 'A line chart showing stock in vs stock out over time. Use the Day / Week / Month / Year selector to change the period. The totals for the selected period are shown next to the selector.',
      },
      {
        heading: 'Low Stock Alert',
        body: 'Appears below the stock movement chart when products are at or below their reorder level. Shows the top 5 items with their SKU and remaining quantity. Click "View all" to go to the Products page.',
      },
      {
        heading: 'Recent Activity',
        body: 'A live feed of the latest stock movements — receipts, deliveries, transfers, and adjustments. Each entry shows the product, warehouse, type, and quantity change. Click "View all" to open the full Stock Ledger.',
      },
      {
        heading: 'Operation Mix',
        body: 'A doughnut chart showing the breakdown of all-time operations by type — Receipts, Deliveries, Transfers, and Adjustments.',
      },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    icon: '⊞',
    content: [
      {
        heading: 'Product catalog',
        body: 'Browse all products with search by name or SKU, filter by category, and filter by stock status (All / In Stock / Low Stock / Out of Stock). Click any row to view full product details.',
      },
      {
        heading: 'Adding a product',
        body: 'Managers can click "+ Add Product" to create a new product. Required fields are Name, SKU, and Category. You can also set the unit of measure, reorder level, barcode, and description.',
      },
      {
        heading: 'Barcode scanning',
        body: 'On the product form, click the camera button next to the SKU field to activate the barcode scanner. Point your camera at a barcode and it will auto-fill the SKU and Barcode fields.',
      },
      {
        heading: 'Product detail',
        body: 'Click a product to see its total stock, reorder level, number of warehouses, and a breakdown of stock per warehouse with status badges.',
      },
      {
        heading: 'Export',
        body: 'Use the Export button to download the current product list as a PDF report or Excel spreadsheet.',
      },
    ],
  },
  {
    id: 'receipts',
    title: 'Receipts',
    icon: '↓',
    content: [
      {
        heading: 'What is a receipt?',
        body: 'A receipt records incoming stock from a supplier. Stock is only added to the warehouse when the receipt is validated — not when it is created.',
      },
      {
        heading: 'Creating a receipt',
        body: 'Click "+ New Receipt", enter the supplier name, optional scheduled date and notes, then add one or more product lines. Each line needs a product, destination warehouse, and quantity.',
      },
      {
        heading: 'Validating a receipt',
        body: 'Click "Validate" on any receipt that is not Done or Cancelled. This immediately adds the quantities to the selected warehouses and creates ledger entries. A real-time stock update is broadcast to all users.',
      },
      {
        heading: 'Statuses',
        body: 'Draft → the receipt has been created. Ready → marked ready for receiving. Done → validated and stock updated. Cancelled → cancelled, no stock change.',
      },
    ],
  },
  {
    id: 'deliveries',
    title: 'Deliveries',
    icon: '↑',
    content: [
      {
        heading: 'What is a delivery?',
        body: 'A delivery records outgoing stock to a customer. Stock is only deducted when the delivery is validated.',
      },
      {
        heading: 'Creating a delivery',
        body: 'Click "+ New Delivery", enter the customer name, optional scheduled date and notes, then add product lines with source warehouse and quantity.',
      },
      {
        heading: 'Validating a delivery',
        body: 'Click "Validate" to deduct stock from the selected warehouses. The system checks that sufficient stock is available before allowing validation.',
      },
      {
        heading: 'Statuses',
        body: 'Draft → Ready → In Transit → Done. Cancelled stops the delivery without any stock change.',
      },
    ],
  },
  {
    id: 'transfers',
    title: 'Transfers',
    icon: '⇄',
    content: [
      {
        heading: 'What is a transfer?',
        body: 'A transfer moves stock from one warehouse to another internally. It creates two ledger entries — a TRANSFER_OUT from the source and a TRANSFER_IN to the destination.',
      },
      {
        heading: 'Creating a transfer',
        body: 'Click "+ New Transfer", select the product, source warehouse, destination warehouse (must be different), quantity, and optional scheduled date.',
      },
      {
        heading: 'Completing a transfer',
        body: 'Click "Complete" on a pending transfer to execute the stock move. Stock is deducted from the source and added to the destination instantly.',
      },
    ],
  },
  {
    id: 'adjustments',
    title: 'Adjustments',
    icon: '±',
    content: [
      {
        heading: 'What is an adjustment?',
        body: 'A stock adjustment corrects a discrepancy between the recorded quantity and the physical count. Only Managers can create adjustments.',
      },
      {
        heading: 'Creating an adjustment',
        body: 'Select the product, warehouse, enter the physical count (new quantity), and choose a reason — Physical count, Damaged goods, Theft/Loss, Expiry, Data correction, or Other.',
      },
      {
        heading: 'How it works',
        body: 'The system calculates the difference (new qty − old qty) and updates the stock accordingly. A ledger entry is created with the reason for full traceability.',
      },
    ],
  },
  {
    id: 'warehouses',
    title: 'Warehouses',
    icon: '▦',
    content: [
      {
        heading: 'Managing warehouses',
        body: 'The Warehouses page shows all storage locations with their total SKU count and total units. Managers can add new warehouses with a name, location, and description.',
      },
      {
        heading: 'Viewing warehouse stock',
        body: 'Click any warehouse card to open a stock panel on the right showing every product stored there, its quantity, and status badge.',
      },
    ],
  },
  {
    id: 'ledger',
    title: 'Stock Ledger',
    icon: '≡',
    content: [
      {
        heading: 'What is the ledger?',
        body: 'The Stock Ledger is a complete, immutable audit trail of every stock movement in the system. Every receipt, delivery, transfer, and adjustment creates a ledger entry.',
      },
      {
        heading: 'Filtering',
        body: 'Filter by operation type — All, Receipt, Delivery, Transfer In, Transfer Out, or Adjustment. Use the pagination controls to navigate through history.',
      },
      {
        heading: 'Columns',
        body: 'Each entry shows the date/time, type, product, warehouse, quantity change (+ or −), balance after the movement, reference number, and any notes.',
      },
    ],
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    icon: '◻',
    content: [
      {
        heading: 'What are purchase orders?',
        body: 'Purchase Orders (POs) track orders placed with suppliers before goods arrive. They are separate from receipts — a PO represents the intent to purchase, while a receipt records the actual arrival of goods.',
      },
      {
        heading: 'Statuses',
        body: 'Draft → Approved → Ordered → Received. When a PO is marked Received, stock is automatically updated in the selected warehouse.',
      },
      {
        heading: 'Live simulation',
        body: 'The system automatically generates simulated purchase orders every 3–6 minutes to demonstrate real-time activity.',
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    icon: '↗',
    content: [
      {
        heading: 'Product performance',
        body: 'The Performance page ranks products by total stock movement (in + out). Use it to identify your fastest-moving and slowest-moving products.',
      },
      {
        heading: 'Filters',
        body: 'Filter by time period (7 days, 30 days, 90 days, all time) and by warehouse to narrow down the analysis.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: '◉',
    content: [
      {
        heading: 'Real-time alerts',
        body: 'Notifications appear in the bell icon in the top bar. The red dot indicates unread notifications. Click the bell to see the latest 6 notifications with a link to the full notifications page.',
      },
      {
        heading: 'Notification types',
        body: 'Stock Updated — triggered when a receipt, delivery, transfer, or adjustment is validated. Low Stock Alert — triggered when products fall below reorder level. Activity — general system events.',
      },
      {
        heading: 'Notifications page',
        body: 'Click "See all notifications" to open the full page. Search by keyword or filter by category — All, Low Stock, Stock Update, Activity. Use "Mark all read" or "Clear all" to manage them.',
      },
      {
        heading: 'Notification settings',
        body: 'Go to Settings → Notifications to control which alert types you receive and whether sound alerts are enabled.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: '⚙',
    content: [
      {
        heading: 'Appearance',
        body: 'Switch between Dark (GitHub Dark Default) and Light themes. Enable compact mode to reduce spacing, or set the sidebar to start collapsed by default.',
      },
      {
        heading: 'Notifications',
        body: 'Toggle individual notification types — low stock alerts, stock updates, delivery updates, and sound alerts.',
      },
      {
        heading: 'Display',
        body: 'Set default rows per page (10 / 20 / 50 / 100), date format, currency symbol, and timezone.',
      },
      {
        heading: 'Dashboard',
        body: 'Enable or disable auto-refresh, set the refresh interval (15s to 5 min), and toggle the low stock banner on the dashboard.',
      },
      {
        heading: 'About',
        body: 'View app version, environment, API URL, tech stack details, and local storage usage. You can also clear local storage from here.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    icon: '○',
    content: [
      {
        heading: 'Editing your profile',
        body: 'Click your avatar in the top bar → View Profile. You can update your name and email address.',
      },
      {
        heading: 'Changing your password',
        body: 'On the Profile page, enter your current password and a new password (min 6 characters). A strength meter shows how strong your new password is.',
      },
      {
        heading: 'Delete account',
        body: 'The Danger Zone section lets you deactivate your account. This sets your account to inactive — you will be signed out and cannot log back in.',
      },
    ],
  },
];

export default function HelpPage() {
  const [active, setActive] = useState('overview');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = search
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.content.some(c => c.heading.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase()))
      )
    : SECTIONS;

  const activeSection = SECTIONS.find(s => s.id === active);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <PageHeader title="Help & Documentation" subtitle="Learn how to use CoreInventory IMS" />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Sidebar nav */}
        <div style={{ position: 'sticky', top: 0 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search docs..."
            style={{
              width: '100%', padding: '8px 12px', marginBottom: 10,
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: 12, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <Card>
            <div style={{ padding: '4px 0' }}>
              {filtered.map(s => (
                <button key={s.id} onClick={() => { setActive(s.id); setSearch(''); }}
                  style={{
                    width: '100%', padding: '8px 14px', border: 'none', cursor: 'pointer',
                    background: active === s.id && !search ? 'var(--bg-elevated)' : 'transparent',
                    color: active === s.id && !search ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: active === s.id && !search ? 600 : 400,
                    fontFamily: 'var(--font)', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 10,
                    borderLeft: `2px solid ${active === s.id && !search ? 'var(--accent)' : 'transparent'}`,
                  }}>
                  <span style={{ fontSize: 12, opacity: 0.7, flexShrink: 0 }}>{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Content */}
        <div>
          {search ? (
            /* Search results */
            filtered.length === 0 ? (
              <Card><div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No results found</div></Card>
            ) : filtered.map(s => (
              <Card key={s.id} style={{ marginBottom: 16 }}>
                <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</span>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {s.content.filter(c =>
                    c.heading.toLowerCase().includes(search.toLowerCase()) ||
                    c.body.toLowerCase().includes(search.toLowerCase())
                  ).map((c, i) => <ContentItem key={i} item={c} last={false} />)}
                </div>
              </Card>
            ))
          ) : (
            /* Single section view */
            activeSection && (
              <Card style={{ animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--text-accent)', flexShrink: 0 }}>
                    {activeSection.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{activeSection.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activeSection.content.length} topic{activeSection.content.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {activeSection.content.map((c, i) => (
                    <ContentItem key={i} item={c} last={i === activeSection.content.length - 1} />
                  ))}
                </div>

                {/* Bottom nav */}
                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  {(() => {
                    const idx = SECTIONS.findIndex(s => s.id === active);
                    const prev = SECTIONS[idx - 1];
                    const next = SECTIONS[idx + 1];
                    return (
                      <>
                        {prev
                          ? <button onClick={() => setActive(prev.id)} style={{ fontSize: 12, color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>← {prev.title}</button>
                          : <span />
                        }
                        {next
                          ? <button onClick={() => setActive(next.id)} style={{ fontSize: 12, color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}>{next.title} →</button>
                          : <span />
                        }
                      </>
                    );
                  })()}
                </div>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ContentItem({ item, last }) {
  return (
    <div style={{ padding: '16px 24px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{item.heading}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{item.body}</div>
    </div>
  );
}
