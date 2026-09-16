const { verifySocketToken } = require('../middleware/auth');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

// roomId -> Map(socketId -> { userId, name, avatarColor })
const roomPresence = new Map();

function getPresenceList(roomId) {
  const map = roomPresence.get(roomId);
  if (!map) return [];
  return Array.from(map.entries()).map(([socketId, info]) => ({ socketId, ...info }));
}

module.exports = function socketHandler(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = verifySocketToken(token);
      if (!decoded) return next(new Error('Authentication error: invalid token'));
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Authentication error: user not found'));
      socket.user = { id: user._id.toString(), name: user.name, avatarColor: user.avatarColor };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    let currentRoomId = null;

    socket.on('join-room', async ({ roomId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit('room-error', { message: 'Room not found' });
          return;
        }
        currentRoomId = roomId;
        socket.join(roomId);

        if (!room.participants.some((p) => p.toString() === socket.user.id)) {
          room.participants.push(socket.user.id);
          await room.save();
        }

        if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
        const presence = roomPresence.get(roomId);

        // Tell the newcomer about everyone already in the room so it can initiate WebRTC offers
        const existingPeers = getPresenceList(roomId);
        socket.emit('existing-peers', existingPeers);

        presence.set(socket.id, {
          userId: socket.user.id,
          name: socket.user.name,
          avatarColor: socket.user.avatarColor,
        });

        socket.to(roomId).emit('peer-joined', {
          socketId: socket.id,
          userId: socket.user.id,
          name: socket.user.name,
          avatarColor: socket.user.avatarColor,
        });

        io.to(roomId).emit('presence-update', getPresenceList(roomId));

        socket.to(roomId).emit('chat-message', {
          type: 'system',
          content: `${socket.user.name} joined the meeting`,
          createdAt: new Date(),
        });
      } catch (err) {
        socket.emit('room-error', { message: 'Failed to join room' });
      }
    });

    // ---- WebRTC signaling relay (mesh topology: each peer connects to each peer) ----
    socket.on('webrtc-offer', ({ to, offer }) => {
      io.to(to).emit('webrtc-offer', { from: socket.id, offer, name: socket.user.name });
    });

    socket.on('webrtc-answer', ({ to, answer }) => {
      io.to(to).emit('webrtc-answer', { from: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
      io.to(to).emit('webrtc-ice-candidate', { from: socket.id, candidate });
    });

    // ---- Screen sharing state broadcast ----
    socket.on('screen-share-started', () => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('screen-share-started', {
        socketId: socket.id,
        name: socket.user.name,
      });
    });

    socket.on('screen-share-stopped', () => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('screen-share-stopped', { socketId: socket.id });
    });

    // ---- Whiteboard collaborative drawing ----
    socket.on('whiteboard-draw', (strokeData) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('whiteboard-draw', strokeData);
    });

    socket.on('whiteboard-clear', () => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('whiteboard-clear');
    });

    // ---- Chat (persisted, encrypted at rest via Message model) ----
    socket.on('chat-message', async ({ content }) => {
      if (!currentRoomId || !content?.trim()) return;
      try {
        const room = await Room.findOne({ roomId: currentRoomId });
        if (!room) return;
        const message = await Message.create({
          room: room._id,
          sender: socket.user.id,
          senderName: socket.user.name,
          content: content.trim(),
          type: 'text',
        });
        io.to(currentRoomId).emit('chat-message', message.toJSON());
      } catch (err) {
        socket.emit('room-error', { message: 'Failed to send message' });
      }
    });

    // ---- File share notification (actual upload happens over REST) ----
    socket.on('file-shared', (fileMeta) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('file-shared', fileMeta);
    });

    // ---- Reactions / hand-raise (nice small UX touches) ----
    socket.on('raise-hand', (payload) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('raise-hand', { socketId: socket.id, ...payload });
    });

    socket.on('reaction', (payload) => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('reaction', { socketId: socket.id, ...payload });
    });

    socket.on('media-state-changed', (state) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('media-state-changed', { socketId: socket.id, ...state });
    });

    socket.on('leave-room', () => handleLeave());
    socket.on('disconnect', () => handleLeave());

    function handleLeave() {
      if (!currentRoomId) return;
      const presence = roomPresence.get(currentRoomId);
      if (presence) {
        presence.delete(socket.id);
        if (presence.size === 0) roomPresence.delete(currentRoomId);
      }
      socket.to(currentRoomId).emit('peer-left', { socketId: socket.id });
      io.to(currentRoomId).emit('presence-update', getPresenceList(currentRoomId));
      socket.to(currentRoomId).emit('chat-message', {
        type: 'system',
        content: `${socket.user.name} left the meeting`,
        createdAt: new Date(),
      });
      socket.leave(currentRoomId);
      currentRoomId = null;
    }
  });
};
