const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getAllPosts,
    deletePostAsAdmin,
    deleteUserAsAdmin
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// This line applies the 'protect' and 'admin' middleware to ALL routes defined in this file.
// This is a crucial security step. It ensures only logged-in admins can access these endpoints.
router.use(protect, admin);

// Define the specific routes
router.get('/users', getAllUsers);
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePostAsAdmin);
router.delete('/users/:id', deleteUserAsAdmin);

// You can add more admin-specific routes here in the future
// For example: router.get('/stats', getAdminDashboardStats);

module.exports = router;