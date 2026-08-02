// WebRTC Real-Time Signaling Service via Socket.IO
// Handles registration, call offers, answers, ICE candidates, state sync, and missed call detection

const callController = require('../controllers/callController');

// Active socket-to-user mappings: userId -> socketId
const userSockets = new Map();
// Active calls tracking: callId -> { callId, caller, receiver, callType, status, startedAt, timeoutTimer }
const activeCalls = new Map();

function setupCallSignaling(io) {
  io.on('connection', (socket) => {
    console.log(`📡 Socket connected for WebRTC Signaling: ${socket.id}`);

    // Register user ID to socket mapping
    socket.on('call:register', (userProfile) => {
      if (userProfile && userProfile.id) {
        userSockets.set(userProfile.id, socket.id);
        socket.userId = userProfile.id;
        socket.userProfile = userProfile;
        console.log(`👤 User registered for WebRTC: ${userProfile.name || userProfile.id} (${socket.id})`);
        
        // Notify socket client of successful registration
        socket.emit('call:registered', {
          userId: userProfile.id,
          socketId: socket.id,
          activeUsers: Array.from(userSockets.keys())
        });
      }
    });

    // Initiate Call from Caller to Receiver
    socket.on('call:initiate', (payload) => {
      const { callId, caller, receiver, callType } = payload || {};

      if (!receiver || !receiver.id) {
        return socket.emit('call:error', { message: 'Invalid receiver details.' });
      }

      const receiverSocketId = userSockets.get(receiver.id);
      const newCallId = callId || `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      console.log(`📞 Call initiated: ${caller.name} -> ${receiver.name} (${callType})`);

      // Store active call state
      const callData = {
        callId: newCallId,
        caller,
        receiver,
        callType: callType || 'video',
        status: 'calling',
        startedAt: new Date(),
        callerSocketId: socket.id,
        receiverSocketId: receiverSocketId || null
      };

      activeCalls.set(newCallId, callData);

      // Check if receiver is online via P2P socket OR auto-answer AI Doctor mode
      if (receiverSocketId && io.sockets.sockets.get(receiverSocketId)) {
        // Send incoming call notification to receiver
        io.to(receiverSocketId).emit('call:incoming', {
          callId: newCallId,
          caller,
          receiver,
          callType: callType || 'video',
          timestamp: new Date().toISOString()
        });

        // Notify caller that call is ringing
        socket.emit('call:ringing', { callId: newCallId });

        // Set 30-second timeout for missed call if unanswered
        callData.timeoutTimer = setTimeout(() => {
          if (activeCalls.has(newCallId) && activeCalls.get(newCallId).status === 'calling') {
            console.log(`⏰ Call timed out (Missed): ${newCallId}`);
            
            socket.emit('call:ended', { callId: newCallId, reason: 'no-answer', status: 'missed' });
            io.to(receiverSocketId).emit('call:ended', { callId: newCallId, reason: 'no-answer', status: 'missed' });
            
            saveCallHistoryLog({
              callId: newCallId,
              callerId: caller.id,
              callerName: caller.name,
              callerAvatar: caller.avatar || caller.image || '',
              receiverId: receiver.id,
              receiverName: receiver.name,
              receiverAvatar: receiver.avatar || receiver.image || '',
              callType: callType || 'video',
              status: 'missed',
              durationSeconds: 0,
              startedAt: callData.startedAt,
              endedAt: new Date()
            });

            activeCalls.delete(newCallId);
          }
        }, 30000);

      } else {
        // AI Doctor / Virtual Emergency Responder Auto-Answer Mode
        console.log(`🤖 AI Doctor / Responder Auto-Answering Call for: ${receiver.name}`);
        
        // Notify caller that call is ringing
        socket.emit('call:ringing', { callId: newCallId });

        // Simulate doctor picking up the phone after 1.5s ring
        callData.timeoutTimer = setTimeout(() => {
          if (activeCalls.has(newCallId)) {
            callData.status = 'connected';
            callData.connectedAt = new Date();

            console.log(`🟢 AI Doctor Connected & Talking: ${newCallId}`);

            socket.emit('call:accepted', {
              callId: newCallId,
              receiver,
              isAIDoctor: true,
              greeting: `Hello! I am ${receiver.name}. I am now connected with you live. What medical emergency or symptoms are you experiencing?`
            });
          }
        }, 1500);
      }
    });

    // Receiver Accepts Call
    socket.on('call:accept', (payload) => {
      const { callId, answerSignal } = payload || {};
      const callData = activeCalls.get(callId);

      if (callData) {
        clearTimeout(callData.timeoutTimer);
        callData.status = 'connected';
        callData.connectedAt = new Date();

        console.log(`✅ Call accepted: ${callId}`);

        // Notify caller that call was accepted
        if (callData.callerSocketId) {
          io.to(callData.callerSocketId).emit('call:accepted', {
            callId,
            answerSignal,
            receiver: callData.receiver
          });
        }

        // Broadcast to receiver's socket
        socket.emit('call:connected', { callId });
      }
    });

    // Receiver Rejects Call
    socket.on('call:reject', (payload) => {
      const { callId, reason } = payload || {};
      const callData = activeCalls.get(callId);

      if (callData) {
        clearTimeout(callData.timeoutTimer);
        console.log(`🚫 Call rejected: ${callId}`);

        if (callData.callerSocketId) {
          io.to(callData.callerSocketId).emit('call:rejected', {
            callId,
            reason: reason || 'declined'
          });
        }

        // Log rejected call
        saveCallHistoryLog({
          callId,
          callerId: callData.caller.id,
          callerName: callData.caller.name,
          callerAvatar: callData.caller.avatar || callData.caller.image || '',
          receiverId: callData.receiver.id,
          receiverName: callData.receiver.name,
          receiverAvatar: callData.receiver.avatar || callData.receiver.image || '',
          callType: callData.callType,
          status: 'rejected',
          durationSeconds: 0,
          startedAt: callData.startedAt,
          endedAt: new Date()
        });

        activeCalls.delete(callId);
      }
    });

    // WebRTC Offer Relay
    socket.on('webrtc:offer', (payload) => {
      const { callId, offer, toSocketId } = payload || {};
      const callData = activeCalls.get(callId);
      
      const targetSocket = toSocketId || (callData ? (callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId) : null);
      if (targetSocket) {
        io.to(targetSocket).emit('webrtc:offer', { callId, offer, fromSocketId: socket.id });
      }
    });

    // WebRTC Answer Relay
    socket.on('webrtc:answer', (payload) => {
      const { callId, answer, toSocketId } = payload || {};
      const callData = activeCalls.get(callId);

      const targetSocket = toSocketId || (callData ? (callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId) : null);
      if (targetSocket) {
        io.to(targetSocket).emit('webrtc:answer', { callId, answer, fromSocketId: socket.id });
      }
    });

    // WebRTC ICE Candidate Relay
    socket.on('webrtc:ice-candidate', (payload) => {
      const { callId, candidate, toSocketId } = payload || {};
      const callData = activeCalls.get(callId);

      const targetSocket = toSocketId || (callData ? (callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId) : null);
      if (targetSocket) {
        io.to(targetSocket).emit('webrtc:ice-candidate', { callId, candidate, fromSocketId: socket.id });
      }
    });

    // Media Control Sync (Mute/Unmute, Camera On/Off)
    socket.on('call:toggle-audio', ({ callId, enabled }) => {
      const callData = activeCalls.get(callId);
      if (callData) {
        const targetSocket = callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId;
        if (targetSocket) io.to(targetSocket).emit('call:remote-audio-toggled', { enabled });
      }
    });

    socket.on('call:toggle-video', ({ callId, enabled }) => {
      const callData = activeCalls.get(callId);
      if (callData) {
        const targetSocket = callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId;
        if (targetSocket) io.to(targetSocket).emit('call:remote-video-toggled', { enabled });
      }
    });

    // End Call Event
    socket.on('call:end', (payload) => {
      const { callId, durationSeconds } = payload || {};
      const callData = activeCalls.get(callId);

      if (callData) {
        clearTimeout(callData.timeoutTimer);
        const duration = durationSeconds || (callData.connectedAt ? Math.round((new Date() - new Date(callData.connectedAt)) / 1000) : 0);

        console.log(`🏁 Call ended: ${callId} (Duration: ${duration}s)`);

        // Notify both caller and receiver
        if (callData.callerSocketId) io.to(callData.callerSocketId).emit('call:ended', { callId, status: 'completed', duration });
        if (callData.receiverSocketId) io.to(callData.receiverSocketId).emit('call:ended', { callId, status: 'completed', duration });

        // Save completed call log
        saveCallHistoryLog({
          callId,
          callerId: callData.caller.id,
          callerName: callData.caller.name,
          callerAvatar: callData.caller.avatar || callData.caller.image || '',
          receiverId: callData.receiver.id,
          receiverName: callData.receiver.name,
          receiverAvatar: callData.receiver.avatar || callData.receiver.image || '',
          callType: callData.callType,
          status: 'completed',
          durationSeconds: duration,
          startedAt: callData.startedAt,
          endedAt: new Date()
        });

        activeCalls.delete(callId);
      }
    });

    // Disconnect Cleanup
    socket.on('disconnect', () => {
      if (socket.userId) {
        console.log(`🔌 Socket disconnected: ${socket.userId} (${socket.id})`);
        userSockets.delete(socket.userId);
      }

      // Check if user was in an active call
      for (const [callId, callData] of activeCalls.entries()) {
        if (callData.callerSocketId === socket.id || callData.receiverSocketId === socket.id) {
          clearTimeout(callData.timeoutTimer);
          const otherSocket = callData.callerSocketId === socket.id ? callData.receiverSocketId : callData.callerSocketId;
          
          if (otherSocket) {
            io.to(otherSocket).emit('call:ended', { callId, reason: 'network-disconnect', status: 'failed' });
          }

          saveCallHistoryLog({
            callId,
            callerId: callData.caller.id,
            callerName: callData.caller.name,
            callerAvatar: callData.caller.avatar || '',
            receiverId: callData.receiver.id,
            receiverName: callData.receiver.name,
            receiverAvatar: callData.receiver.avatar || '',
            callType: callData.callType,
            status: callData.status === 'connected' ? 'completed' : 'failed',
            durationSeconds: callData.connectedAt ? Math.round((new Date() - new Date(callData.connectedAt)) / 1000) : 0,
            startedAt: callData.startedAt,
            endedAt: new Date()
          });

          activeCalls.delete(callId);
        }
      }
    });
  });
}

// Internal helper to save log via callController
async function saveCallHistoryLog(logData) {
  try {
    const mockReq = { body: logData };
    const mockRes = {
      status: () => ({ json: () => {} })
    };
    await callController.saveCallLog(mockReq, mockRes);
  } catch (err) {
    console.warn('Failed to save call log:', err.message);
  }
}

module.exports = {
  setupCallSignaling,
  userSockets,
  activeCalls
};
