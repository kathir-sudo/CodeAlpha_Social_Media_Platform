const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');

// @desc    Get all users (Admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        console.error('Admin Get All Users Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all posts (Admin)
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find({})
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Admin Get All Posts Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a post as an admin
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
exports.deletePostAsAdmin = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Use the modern, correct method to delete the post itself
        await Post.findByIdAndDelete(req.params.id);
        
        // Also delete all associated comments
        await Comment.deleteMany({ postId: req.params.id });
        
        res.json({ message: 'Post removed successfully by admin' });
    } catch (error) {
        console.error('Admin Delete Post Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a user as an admin
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUserAsAdmin = async (req, res) => {
     try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optional: Before deleting a user, you might want to delete all their content.
        // This prevents "orphaned" posts and comments in your database.
        await Post.deleteMany({ userId: user._id });
        await Comment.deleteMany({ userId: user._id });
        
        // Now, delete the user.
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'User and all their content removed successfully by admin' });
    } catch (error) {
        console.error('Admin Delete User Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};