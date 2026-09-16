const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true }, // stored encrypted
    type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  },
  { timestamps: true }
);

// Transparently encrypt on save
messageSchema.pre('save', function encryptContent(next) {
  if (this.isModified('content')) {
    this.content = encrypt(this.content);
  }
  next();
});

// Transparently decrypt when converting to JSON for API responses
messageSchema.methods.toJSON = function toJSONDecrypted() {
  const obj = this.toObject();
  obj.content = decrypt(obj.content);
  return obj;
};

module.exports = mongoose.model('Message', messageSchema);
