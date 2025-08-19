const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get logged-in user's profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get any user's profile by ID
// @route   GET /api/users/:id
// @access  Private


// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.bio = req.body.bio || user.bio;
        if(req.body.profileImage) {
            user.profileImage = req.body.profileImage;
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            username: updatedUser.username,
            bio: updatedUser.bio,
            profileImage: updatedUser.profileImage,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Follow a user or request to follow a private account
// @route   PUT /api/users/:id/follow
// --- REPLACE your old handleFollow function in userController.js WITH THIS ---

// @desc    Follow a user or request to follow a private account
// @route   PUT /api/users/:id/follow
exports.handleFollow = async (req, res) => {
    try {
        const userToFollow = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if (!userToFollow || !currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        // --- THIS IS THE CRITICAL FIX ---
        // The original code was missing the logic to check if the user is already being followed
        // for public accounts, causing errors.
        if (currentUser.following.includes(userToFollow._id)) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        // Handle based on account type
        if (userToFollow.accountType === 'public') {
            // Add to followers/following lists directly
            userToFollow.followers.push(currentUser._id);
            currentUser.following.push(userToFollow._id);
            await userToFollow.save();
            await currentUser.save();

            // Send notification to the followed user
            await Notification.create({
                userId: userToFollow._id,
                fromUserId: currentUser._id,
                type: 'follow',
                content: `${currentUser.name} started following you.`
            });

            // SIMULATED ANALYTICS EVENT
            console.log(`ANALYTICS EVENT: user ${currentUser.username} followed ${userToFollow.username}`);

            res.json({ status: 'following', message: 'User followed successfully.' });

        } else { // Private account
            // Add to follow requests list
            if (userToFollow.followRequests.includes(currentUser._id)) {
                return res.status(400).json({ message: 'Follow request already sent.' });
            }
            userToFollow.followRequests.push(currentUser._id);
            await userToFollow.save();

            // SIMULATED ANALYTICS EVENT
            console.log(`ANALYTICS EVENT: user ${currentUser.username} requested to follow ${userToFollow.username}`);
            
            res.json({ status: 'requested', message: 'Follow request sent.' });
        }
    } catch (error) {
        console.error("Handle Follow Error:", error);
        res.status(500).json({ message: "Server error while trying to follow user." });
    }
};
// @desc    Unfollow a user
// @route   PUT /api/users/:id/unfollow
exports.handleUnfollow = async (req, res) => {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!userToUnfollow || !currentUser) return res.status(404).json({ message: 'User not found' });

    // Remove from both lists
    userToUnfollow.followers.pull(currentUser._id);
    currentUser.following.pull(userToUnfollow._id);
    await userToUnfollow.save();
    await currentUser.save();
    res.json({ status: 'not-following', message: 'User unfollowed successfully.' });
};

// @desc    Cancel a follow request sent to a private account
// @route   PUT /api/users/:id/cancelrequest
exports.cancelFollowRequest = async (req, res) => {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    targetUser.followRequests.pull(req.user._id);
    await targetUser.save();
    res.json({ status: 'not-following', message: 'Follow request cancelled.' });
};

// @desc    Get pending follow requests for the logged-in user
// @route   GET /api/users/requests
exports.getFollowRequests = async (req, res) => {
    const user = await User.findById(req.user._id).populate('followRequests', 'name username profileImage');
    res.json(user.followRequests);
};

// @desc    Approve a follow request
// @route   PUT /api/users/requests/:requesterId/approve
exports.approveFollowRequest = async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    const requester = await User.findById(req.params.requesterId);

    if (!requester) return res.status(404).json({ message: 'Requesting user not found.' });

    // Move from requests to followers
    currentUser.followRequests.pull(requester._id);
    currentUser.followers.push(requester._id);
    
    // Update the requester's following list
    requester.following.push(currentUser._id);

    await currentUser.save();
    await requester.save();
    res.json({ message: 'Follow request approved.' });
};

// @desc    Deny a follow request
// @route   PUT /api/users/requests/:requesterId/deny
exports.denyFollowRequest = async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    currentUser.followRequests.pull(req.params.requesterId);
    await currentUser.save();
    res.json({ message: 'Follow request denied.' });
};

// @desc    Toggle mute for a user
// @route   PUT /api/users/:id/mute
exports.toggleMute = async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    const isMuted = currentUser.mutedAccounts.includes(req.params.id);
    if (isMuted) {
        currentUser.mutedAccounts.pull(req.params.id);
    } else {
        currentUser.mutedAccounts.push(req.params.id);
    }
    await currentUser.save();
    res.json({ isMuted: !isMuted });
};

// @desc    Toggle notifications for a user
// @route   PUT /api/users/:id/notifications
exports.toggleNotifications = async (req, res) => {
    const currentUser = await User.findById(req.user._id);
    const hasNotifications = currentUser.notificationsFrom.includes(req.params.id);
    if (hasNotifications) {
        currentUser.notificationsFrom.pull(req.params.id);
    } else {
        currentUser.notificationsFrom.push(req.params.id);
    }
    await currentUser.save();
    res.json({ notificationsEnabled: !hasNotifications });
};

// @desc    Get any user's profile by ID
// @route   GET /api/users/:id
// @access  Private
exports.getAnyUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        // Handle cases where the provided ID is not a valid ObjectId
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Search for users
// @route   GET /api/users/search?q=query
// @access  Private
exports.searchUsers = async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: "Search query is required" });
    }
    try {
        const users = await User.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } }
            ]
        }).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};