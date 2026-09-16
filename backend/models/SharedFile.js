const mongoose = require('mongoose');

const sharedFileSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String, required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SharedFile', sharedFileSchema);
