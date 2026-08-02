const CallLog = require('../models/CallLog');

// In-memory fallback call logs store when MongoDB is not connected
const inMemoryCallLogs = [
  {
    callId: "call-demo-101",
    callerId: "dr_evelyn",
    callerName: "Dr. Evelyn Vance, MD",
    callerAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80",
    receiverId: "PAT-8092",
    receiverName: "Rahul Verma",
    receiverAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=800&q=80",
    callType: "video",
    status: "completed",
    durationSeconds: 245,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    endedAt: new Date(Date.now() - 3355000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    callId: "call-demo-102",
    callerId: "PAT-3341",
    callerName: "Priya Sharma",
    callerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    receiverId: "dr_alexander",
    receiverName: "Dr. Alexander Sterling, MD",
    receiverAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
    callType: "voice",
    status: "missed",
    durationSeconds: 0,
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    endedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

/**
 * GET /api/calls/logs
 * Fetches all WebRTC call logs sorted by newest first
 */
async function getCallLogs(req, res) {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const logs = await CallLog.find().sort({ createdAt: -1 }).limit(100);
      return res.status(200).json({ status: 'SUCCESS', source: 'MONGODB', logs });
    }
  } catch (err) {
    console.warn('⚠️ Mongoose not connected, returning in-memory call logs:', err.message);
  }

  return res.status(200).json({ status: 'SUCCESS', source: 'IN_MEMORY', logs: inMemoryCallLogs });
}

/**
 * POST /api/calls/log
 * Creates or updates a call log entry
 */
async function saveCallLog(req, res) {
  try {
    const {
      callId,
      callerId,
      callerName,
      callerAvatar,
      receiverId,
      receiverName,
      receiverAvatar,
      callType,
      status,
      durationSeconds,
      startedAt,
      endedAt
    } = req.body || {};

    const logData = {
      callId: callId || `call-${Date.now()}`,
      callerId: callerId || 'user-anon',
      callerName: callerName || 'Anonymous Caller',
      callerAvatar: callerAvatar || '',
      receiverId: receiverId || 'user-receiver',
      receiverName: receiverName || 'Receiver',
      receiverAvatar: receiverAvatar || '',
      callType: callType || 'video',
      status: status || 'completed',
      durationSeconds: Number(durationSeconds) || 0,
      startedAt: startedAt || new Date().toISOString(),
      endedAt: endedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const savedLog = await CallLog.findOneAndUpdate(
        { callId: logData.callId },
        logData,
        { upsert: true, new: true }
      );
      return res.status(200).json({ status: 'SUCCESS', source: 'MONGODB', log: savedLog });
    }

    // In-memory fallback
    const existingIndex = inMemoryCallLogs.findIndex(l => l.callId === logData.callId);
    if (existingIndex >= 0) {
      inMemoryCallLogs[existingIndex] = logData;
    } else {
      inMemoryCallLogs.unshift(logData);
    }

    return res.status(200).json({ status: 'SUCCESS', source: 'IN_MEMORY', log: logData });
  } catch (err) {
    console.error('Error saving call log:', err);
    return res.status(500).json({ status: 'ERROR', message: err.message });
  }
}

/**
 * DELETE /api/calls/logs
 * Clears call history
 */
async function clearCallLogs(req, res) {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await CallLog.deleteMany({});
    }
    inMemoryCallLogs.length = 0;
    return res.status(200).json({ status: 'SUCCESS', message: 'Call history cleared' });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', message: err.message });
  }
}

module.exports = {
  getCallLogs,
  saveCallLog,
  clearCallLogs,
  inMemoryCallLogs
};
