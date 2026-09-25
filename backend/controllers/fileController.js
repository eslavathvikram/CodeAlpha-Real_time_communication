const fs = require('fs');
const path = require('path');
const os = require('os');
const Room = require('../models/Room');
const SharedFile = require('../models/SharedFile');

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const sharedFile = await SharedFile.create({
      room: room._id,
      uploader: req.user._id,
      uploaderName: req.user.name,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({ file: sharedFile });
  } catch (err) {
    next(err);
  }
};

exports.downloadFile = async (req, res, next) => {
  try {
    const file = await SharedFile.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const possiblePaths = [
      path.join(os.tmpdir(), 'rtc-uploads', file.storedName),
      path.join(os.tmpdir(), file.storedName),
      path.join(__dirname, '..', 'uploads', file.storedName),
    ];

    const targetPath = possiblePaths.find((p) => fs.existsSync(p));
    if (!targetPath) {
      return res.status(404).json({ message: 'File is no longer stored on the server' });
    }

    res.download(targetPath, file.originalName);
  } catch (err) {
    next(err);
  }
};
