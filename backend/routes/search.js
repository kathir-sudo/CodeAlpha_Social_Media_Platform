const express = require('express');
const router = express.Router();
const { 
    searchAll,
    getAllUsersForSearch,
    getAllPostsForSearch
} = require('../controllers/searchController');
const { protect } = require('../middleware/authMiddleware');

// The original server-side search route
router.get('/', protect, searchAll);

// New routes for pre-loading all data
router.get('/users', protect, getAllUsersForSearch);
router.get('/posts', protect, getAllPostsForSearch);

module.exports = router;