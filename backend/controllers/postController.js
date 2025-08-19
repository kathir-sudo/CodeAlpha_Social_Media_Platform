const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
    const { content, image } = req.body;
    try {
        const post = await Post.create({
            userId: req.user._id,
            content,
            image,
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ message: 'Invalid post data' });
    }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (Owner or Admin)
// --- NEW CODE ---
// --- NEW, CORRECTED deletePost function ---

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private (Owner or Admin)
exports.deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // --- Improved Authorization Check ---
        // Allow deletion if the user is the owner OR if the user is an admin.
        const isOwner = post.userId.toString() === req.user._id.toString();
        const isAdmin = req.user.isAdmin;

        // For debugging, let's see who is trying to delete what
        console.log('--- DELETE POST ATTEMPT ---');
        console.log('User making request:', req.user._id.toString(), `(Admin: ${isAdmin})`);
        console.log('Owner of post:    ', post.userId.toString());
        console.log('Is user the owner?  ', isOwner);
        
        if (!isOwner && !isAdmin) {
            console.log('Authorization FAILED.');
            return res.status(401).json({ message: 'Not authorized to delete this post' });
        }
        
        console.log('Authorization PASSED.');

        // Use the modern, correct method to delete the post itself
        await Post.findByIdAndDelete(req.params.id);
        
        // Also delete all associated comments
        await Comment.deleteMany({ postId: req.params.id });
        
        res.json({ message: 'Post removed successfully' });

    } catch (error) {
        console.error('Delete Post Server Error:', error); // Log the actual error
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get posts for the user's feed
// @route   GET /api/posts/feed
// @access  Private
exports.getFeedPosts = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        const followingIds = currentUser.following;
        followingIds.push(req.user._id); // Include user's own posts

        const posts = await Post.find({ userId: { $in: followingIds } })
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: -1 });
            
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a user's posts
// @route   GET /api/posts/user/:userId
// @access  Private
exports.getUserPosts = async (req, res) => {
    try {
        const posts = await Post.find({ userId: req.params.userId })
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Like or unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.toggleLikePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const isLiked = post.likes.includes(req.user._id);
        if (isLiked) {
            // Unlike
            post.likes.pull(req.user._id);
        } else {
            // Like
            post.likes.push(req.user._id);
             // Create notification
            if (!isLiked && post.userId.toString() !== req.user._id.toString()) {
                await Notification.create({
                    userId: post.userId,
                    fromUserId: req.user._id,
                    type: 'like',
                    content: `${req.user.name} liked your post.`,
                    link: `/posts/${post._id}`
                });
            }
        }
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Add a comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
    const { content } = req.body;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const comment = await Comment.create({
            postId: req.params.id,
            userId: req.user._id,
            content,
        });

        post.comments.push(comment._id);
        await post.save();

        // Create notification
        if (post.userId.toString() !== req.user._id.toString()) {
            await Notification.create({
                userId: post.userId,
                fromUserId: req.user._id,
                type: 'comment',
                content: `${req.user.name} commented on your post.`,
                link: `/posts/${post._id}`
            });
        }
        
        const populatedComment = await Comment.findById(comment._id).populate('userId', 'name username profileImage');
        res.status(201).json(populatedComment);

    } catch (error) {
        res.status(400).json({ message: 'Invalid comment data' });
    }
};

// @desc    Get all comments for a post
// @route   GET /api/posts/:id/comments
// @access  Private
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ postId: req.params.id })
            .populate('userId', 'name username profileImage')
            .sort({ createdAt: 'desc' });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Like or unlike a comment
// @route   PUT /api/posts/comment/:id/like
// @access  Private
exports.toggleLikeComment = async (req, res) => {
     try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        const isLiked = comment.likes.includes(req.user._id);
        if (isLiked) {
            comment.likes.pull(req.user._id);
        } else {
            comment.likes.push(req.user._id);
        }
        await comment.save();
        res.json(comment);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if user is the owner
        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        post.content = req.body.content || post.content;
        const updatedPost = await post.save();
        res.json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a comment
// @route   PUT /api/posts/comment/:id
// @access  Private
exports.updateComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        // Authorization check: Only the owner can edit
        if (comment.userId.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to edit this comment' });
        }

        comment.content = req.body.content || comment.content;
        await comment.save();
        
        // Populate the user info before sending back for a seamless UI update
        const populatedComment = await Comment.findById(comment._id).populate('userId', 'name username profileImage');
        
        res.json(populatedComment);
    } catch (error) {
        console.error('Update Comment Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/comment/:id
// @access  Private
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        // Find the parent post to check for post owner
        const post = await Post.findById(comment.postId);

        // Authorization check: Allow deletion by comment owner, post owner, or admin
        const isCommentOwner = comment.userId.toString() === req.user._id.toString();
        const isPostOwner = post && post.userId.toString() === req.user._id.toString();
        const isAdmin = req.user.isAdmin;
        
        if (!isCommentOwner && !isPostOwner && !isAdmin) {
            return res.status(401).json({ message: 'Not authorized to delete this comment' });
        }

        // Also remove comment ID from the post's comment array if it exists
        if(post) {
            await Post.updateOne({ _id: comment.postId }, { $pull: { comments: comment._id } });
        }

        // Now delete the comment itself
        await Comment.findByIdAndDelete(req.params.id);

        res.json({ message: 'Comment removed successfully' });
    } catch (error) {
        console.error('Delete Comment Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};