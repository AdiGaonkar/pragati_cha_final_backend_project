const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String },
  data: { type: Array, default: [] }, // parsed CSV rows
  stats: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Upload', UploadSchema);
