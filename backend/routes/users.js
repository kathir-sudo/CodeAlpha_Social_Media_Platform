const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    getUserProfile,
    updateUserProfile,
    searchUsers,
    getAnyUserProfile,
    // New functions
    handleFollow,
    handleUnfollow,
    cancelFollowRequest,
    getFollowRequests,
    approveFollowRequest,
    denyFollowRequest,
    toggleMute,
    toggleNotifications
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Apply rate limiting to follow-related actions to prevent spam
const followLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // Limit each IP to 50 follow/unfollow actions per window
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many follow requests from this IP, please try again after 15 minutes',
});

// Public routes
router.get('/search', protect, searchUsers);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Follow request management
router.get('/requests', protect, getFollowRequests);
router.put('/requests/:requesterId/approve', protect, approveFollowRequest);
router.put('/requests/:requesterId/deny', protect, denyFollowRequest);

// User-specific routes
router.get('/:id', protect, getAnyUserProfile);

// Actions with rate limiting
router.put('/:id/follow', protect, followLimiter, handleFollow);
router.put('/:id/unfollow', protect, followLimiter, handleUnfollow);
router.put('/:id/cancelrequest', protect, followLimiter, cancelFollowRequest);
router.put('/:id/mute', protect, toggleMute);
router.put('/:id/notifications', protect, toggleNotifications);


module.exports = router;