const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  message:   { type: String, required: true, trim: true },
  category:  { type: String, enum: ['Stock Issue', 'Equipment', 'Process', 'Safety', 'Other'], default: 'Other' },
  priority:  { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status:    { type: String, enum: ['Pending', 'Reviewed', 'Resolved', 'Dismissed'], default: 'Pending' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerNote: { type: String },
  reviewedAt:{ type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
