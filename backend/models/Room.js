const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    name: { type: String, default: 'Untitled Meeting' },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    whiteboardData: { type: String, default: '' }, // encrypted JSON snapshot of drawn strokes
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
