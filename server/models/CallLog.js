const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  callId: { type: String, required: true, unique: true },
  callerId: { type: String, required: true },
  callerName: { type: String, required: true },
  callerAvatar: { type: String, default: '' },
  receiverId: { type: String, required: true },
  receiverName: { type: String, required: true },
  receiverAvatar: { type: String, default: '' },
  callType: { type: String, enum: ['voice', 'video'], default: 'video' },
  status: { type: String, enum: ['completed', 'missed', 'rejected', 'busy', 'failed'], default: 'completed' },
  durationSeconds: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CallLog', callLogSchema);
