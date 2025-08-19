const express = require('express');
const router = express.Router();
const { 
    sendMessage, 
    getConversations, 
    getChatMessages,
    markConversationAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// --- CORRECTED AND FINAL ROUTES ---

// POST /api/messages -> Send a new message
router.post('/', protect, sendMessage);

// GET /api/messages/conversations -> Get all conversations for the logged-in user
// This is the route the frontend is looking for.
router.get('/conversations', protect, getConversations);

// GET /api/messages/:userId -> Get the chat history with a specific user
router.get('/:userId', protect, getChatMessages);

// PUT /api/messages/:userId/read -> Mark a conversation with a specific user as read
router.put('/:userId/read', protect, markConversationAsRead);

module.exports = router;