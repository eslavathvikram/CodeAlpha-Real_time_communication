const express = require('express');
const {
  createRoom,
  getRoom,
  myRooms,
  getMessages,
  sendMessage,
  getFiles,
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.post('/', createRoom);
router.get('/mine', myRooms);
router.get('/:roomId', getRoom);
router.get('/:roomId/messages', getMessages);
router.post('/:roomId/messages', sendMessage);
router.get('/:roomId/files', getFiles);

module.exports = router;
