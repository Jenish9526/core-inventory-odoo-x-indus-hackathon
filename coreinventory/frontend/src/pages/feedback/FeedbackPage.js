import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { feedbackAPI, warehousesAPI } from '../../services/api';
import { PageHeader, Button, Badge, Card, Table, Modal, Input, Select, FilterPills, EmptyState, Spinner } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_COLOR = { Low: 'var(--green)', Medium: 'var(--amber)', High: 'var(--red)', Urgent: 'var(--purple)' };
const STATUS_MAP = { Pending: 'Waiting', Reviewed: 'Ready', Resolved: 'Done', Dismissed: 'Cancelled' };

const FormField = ({ label, required, children }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
      {label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
    </label>}
    {children}
  </div>
);

export default function FeedbackPage() {
  const { isManager } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ Pending: 0, Reviewed: 0, Resolved: 0, Dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selected, setSelected] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', category: 'Other', priority: 'Medium', warehouse: '' });
  const [reviewForm, setReviewForm] = useState({ status: 'Reviewed', managerNote: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const [fb, st] = await Promise.all([feedbackAPI.getAll(params), feedbackAPI.getStats()]);
      setFeedbacks(fb.data.data);
      setStats(st.data.data);
    } catch { toast.error('Failed to load feedback'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { warehousesAPI.getAll().then(r => setWarehouses(r.data.data)).catch(() => {}); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submitFeedback = async e => {
    e.preventDefault();
    if (!form.title || !form.message) { toast.error('Title and message are required'); return; }
    setSubmitting(true);
    try {
      await feedbackAPI.create(form);
      toast.success('Feedback submitted!');
      setShowSubmit(false);
      setForm({ title: '', message: '', category: 'Other', priority: 'Medium', warehouse: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const submitReview = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await feedbackAPI.review(selected._id, reviewForm);
      toast.success('Review saved!');
      setShowReview(false);
      setSelected(null);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const openReview = fb => {
    setSelected(fb);
    setReviewForm({ status: fb.status === 'Pending' ? 'Reviewed' : fb.status, managerNote: fb.managerNote || '' });
    setShowReview(true);
  };

  const deleteFb = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this feedback?')) return;
    try { await feedbackAPI.delete(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  const columns = [
    { key: 'priority', label: 'Priority', render: r => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[r.priority] }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLOR[r.priority] }} />{r.priority}
      </span>
    )},
    { key: 'title', label: 'Title', render: r => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.category} · {r.warehouse?.name || '—'}</div>
      </div>
    )},
    { key: 'createdBy', label: 'Submitted By', render: r => (
      <div>
        <div style={{ fontSize: 12, fontWeight: 500 }}>{r.createdBy?.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.createdBy?.role}</div>
      </div>
    )},
    { key: 'status', label: 'Status', render: r => <Badge status={STATUS_MAP[r.status] || 'Draft'}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Date', render: r => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>, muted: true },
    { key: 'actions', label: '', render: r => (
      <div style={{ display: 'flex', gap: 6 }}>
        {isManager && <Button size="sm" variant={r.status === 'Pending' ? 'primary' : 'ghost'} onClick={e => { e.stopPropagation(); openReview(r); }}>{r.status === 'Pending' ? 'Review' : 'Edit'}</Button>}
        {isManager && <Button size="sm" variant="danger" onClick={e => deleteFb(r._id, e)}>✕</Button>}
      </div>
    )},
  ];

  return (
    <div className="animate-fadeUp">
      <PageHeader
        title="Feedback"
        subtitle={isManager ? 'Review staff feedback and issues' : 'Submit feedback to management'}
        actions={<Button onClick={() => setShowSubmit(true)}>+ New Feedback</Button>}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pending',   value: stats.Pending,   color: 'var(--amber)',  icon: '⏳' },
          { label: 'Reviewed',  value: stats.Reviewed,  color: 'var(--accent)', icon: '👁' },
          { label: 'Resolved',  value: stats.Resolved,  color: 'var(--green)',  icon: '✓'  },
          { label: 'Dismissed', value: stats.Dismissed, color: 'var(--red)',    icon: '✕'  },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.7 }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 20, opacity: 0.6 }}>{s.icon}</div>
            </div>
            {total > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{Math.round(s.value / total * 100)}% of total</div>}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 14 }}>
        <FilterPills
          options={['all', 'Pending', 'Reviewed', 'Resolved', 'Dismissed'].map(s => ({
            label: s === 'all' ? 'All' : s, value: s,
            count: s === 'all' ? total : stats[s],
          }))}
          value={statusFilter} onChange={setStatusFilter}
        />
      </div>

      <Card>
        {loading
          ? <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spinner size={32} /></div>
          : feedbacks.length === 0
            ? <EmptyState icon="💬" title="No feedback yet" subtitle={isManager ? 'Staff feedback will appear here' : 'Submit your first feedback using the button above'} />
            : <Table columns={columns} data={feedbacks} onRowClick={isManager ? openReview : undefined} />
        }
      </Card>

      {/* Submit Modal */}
      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Feedback">
        <form onSubmit={submitFeedback}>
          <FormField label="Title" required>
            <Input value={form.title} onChange={set('title')} placeholder="Brief summary of the issue" required />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Category">
              <Select value={form.category} onChange={set('category')}>
                {['Stock Issue', 'Equipment', 'Process', 'Safety', 'Other'].map(c => <option key={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select value={form.priority} onChange={set('priority')}>
                {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p}>{p}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Warehouse">
            <Select value={form.warehouse} onChange={set('warehouse')}>
              <option value="">Select warehouse (optional)</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Message" required>
            <textarea value={form.message} onChange={set('message')} placeholder="Describe the issue in detail..." rows={4}
              style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Feedback</Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {selected && (
        <Modal open={showReview} onClose={() => { setShowReview(false); setSelected(null); }} title="Review Feedback" width={600}>
          <form onSubmit={submitReview}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{selected.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selected.category} · by <strong style={{ color: 'var(--text-secondary)' }}>{selected.createdBy?.name}</strong> · {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[selected.priority], background: PRIORITY_COLOR[selected.priority] + '18', padding: '3px 10px', borderRadius: 20 }}>{selected.priority}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>{selected.message}</div>
            </div>
            <FormField label="Update Status" required>
              <Select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                {['Reviewed', 'Resolved', 'Dismissed'].map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Manager Note">
              <textarea value={reviewForm.managerNote} onChange={e => setReviewForm(f => ({ ...f, managerNote: e.target.value }))}
                placeholder="Add a response or action taken..." rows={3}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => { setShowReview(false); setSelected(null); }}>Cancel</Button>
              <Button type="submit" loading={submitting} variant="success">Save Review</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
