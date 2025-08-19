const express = require('express');
const router = express.Router();
const { getTrending } = require('../controllers/trendingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTrending);

module.exports = router;