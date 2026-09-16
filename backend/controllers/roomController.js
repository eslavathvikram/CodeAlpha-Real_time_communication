const { v4: uuidv4 } = require('uuid');
const Room = require('../models/Room');
const Message = require('../models/Message');
const SharedFile = require('../models/SharedFile');

// Create a new meeting room
exports.createRoom = async (req, res, next) => {
  try {
    const { name } = req.body;
    const roomId = uuidv4().slice(0, 8);
    const room = await Room.create({
      roomId,
      name: name || `${req.user.name}'s Meeting`,
      host: req.user._id,
      participants: [req.user._id],
    });
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
};

// Fetch metadata for a room by its shareable roomId
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate('host', 'name email');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (err) {
    next(err);
  }
};

// List rooms the current user has hosted or joined
exports.myRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({
      $or: [{ host: req.user._id }, { participants: req.user._id }],
    })
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
};

// Fetch decrypted chat history for a room
exports.getMessages = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const messages = await Message.find({ room: room._id }).sort({ createdAt: 1 }).limit(200);
    res.json({ messages: messages.map((m) => m.toJSON()) });
  } catch (err) {
    next(err);
  }
};

// List files shared in a room
exports.getFiles = async (req, res, next) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    const files = await SharedFile.find({ room: room._id }).sort({ createdAt: -1 });
    res.json({ files });
  } catch (err) {
    next(err);
  }
};
