const express = require('express');
const router = express.Router();
const {
    createPost,
    getFeedPosts,
    getUserPosts,
    toggleLikePost,
    addComment,
    getComments,
    toggleLikeComment,
    updatePost,
    deletePost,
    updateComment,
    deleteComment
} = require('../controllers/postController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createPost);

router.route('/feed')
    .get(protect, getFeedPosts);

router.route('/user/:userId')
    .get(protect, getUserPosts);
    
router.route('/:id')
    .put(protect, updatePost)
    .delete(protect, deletePost);

router.route('/:id/like')
    .put(protect, toggleLikePost);

router.route('/:id/comments')
    .post(protect, addComment)
    .get(protect, getComments);

router.route('/comment/:id')
    .put(protect, updateComment)
    .delete(protect, deleteComment);
    
router.route('/comment/:id/like')
    .put(protect, toggleLikeComment);

module.exports = router;