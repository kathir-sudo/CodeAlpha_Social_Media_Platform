const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    const { name, username, email, password } = req.body;
    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email or username already exists' });
        }
        const user = await User.create({ name, username, email, password });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
// --- Make sure your loginUser function in authController.js looks exactly like this ---
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                isAdmin: user.isAdmin,
                // These arrays are CRITICAL for the frontend to work correctly
                following: user.following,
                followers: user.followers,
                mutedAccounts: user.mutedAccounts,
                notificationsFrom: user.notificationsFrom,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Simulate sending a password reset link
// @route   POST /api/auth/reset
// @access  Public
exports.resetPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
        // In a real app, you'd generate a token and email it
        res.json({ message: 'Password reset link has been sent to your email (simulated)' });
    } else {
        res.status(404).json({ message: 'User with this email does not exist' });
    }
};