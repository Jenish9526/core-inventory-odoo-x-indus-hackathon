const Feedback = require('../models/Feedback');

exports.createFeedback = async (req, res) => {
  try {
    const fb = await Feedback.create({ ...req.body, createdBy: req.user._id });
    await fb.populate('createdBy', 'name role');
    await fb.populate('warehouse', 'name');
    res.status(201).json({ success: true, data: fb });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getFeedbacks = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const query = {};
    // Staff only see their own; managers see all
    if (req.user.role === 'staff') query.createdBy = req.user._id;
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    const [data, total] = await Promise.all([
      Feedback.find(query)
        .populate('createdBy', 'name role')
        .populate('reviewedBy', 'name')
        .populate('warehouse', 'name')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Feedback.countDocuments(query),
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.reviewFeedback = async (req, res) => {
  try {
    const { status, managerNote } = req.body;
    if (req.user.role !== 'manager') return res.status(403).json({ success: false, message: 'Managers only' });
    const fb = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status, managerNote, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('createdBy', 'name role').populate('reviewedBy', 'name').populate('warehouse', 'name');
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, data: fb });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getFeedbackStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const map = { Pending: 0, Reviewed: 0, Resolved: 0, Dismissed: 0 };
    stats.forEach(s => { map[s._id] = s.count; });
    res.json({ success: true, data: map });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
