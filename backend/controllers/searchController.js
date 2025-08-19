const Post = require('../models/Post');
const User = require('../models/User');

exports.searchAll = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: "Search query is required" });
    }
    try {
        const queryRegex = new RegExp(query, 'i');
        const users = await User.find({
            $or: [{ name: queryRegex }, { username: queryRegex }]
        }).limit(10).select('-password');
        const posts = await Post.find({ content: queryRegex })
            .limit(10)
            .populate('userId', 'name username profileImage');
        const hashtagRegex = /#(\w+)/g;
        let hashtags = new Set();
        const allPostsForHashtags = await Post.find({ content: queryRegex }); // Search all posts for hashtags
        allPostsForHashtags.forEach(post => {
            const matches = post.content.match(hashtagRegex);
            if (matches) {
                matches.forEach(match => hashtags.add(match.toLowerCase().substring(1)));
            }
        });
        res.json({ users, posts, hashtags: Array.from(hashtags) });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users for initial search cache
// @route   GET /api/search/users
// @access  Private
exports.getAllUsersForSearch = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all posts for initial search cache
// @route   GET /api/search/posts
// @access  Private
exports.getAllPostsForSearch = async (req, res) => {
    try {
        const posts = await Post.find({})
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};