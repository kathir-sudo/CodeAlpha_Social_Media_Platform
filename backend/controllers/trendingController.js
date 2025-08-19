const Post = require('../models/Post');

// @desc    Get trending hashtags and popular posts
// @route   GET /api/trending
// @access  Private
exports.getTrending = async (req, res) => {
    try {
        const allPosts = await Post.find({})
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: -1 });

        // Calculate popular posts based on engagement
        const popularPosts = allPosts.map(post => ({
            ...post.toObject(),
            engagement: post.likes.length + post.comments.length,
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10);

        // Calculate trending hashtags
        const hashtagCounts = {};
        const hashtagRegex = /#(\w+)/g;
        allPosts.forEach(post => {
            const matches = post.content.match(hashtagRegex);
            if (matches) {
                matches.forEach(tag => {
                    const cleanTag = tag.substring(1).toLowerCase();
                    hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
                });
            }
        });

        const trendingHashtags = Object.entries(hashtagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(item => item[0]);

        res.json({ popularPosts, trendingHashtags });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};