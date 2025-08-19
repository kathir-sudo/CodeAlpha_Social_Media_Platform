const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
    const { receiverId, content } = req.body;
    try {
        const message = await Message.create({
            senderId: req.user._id,
            receiverId,
            content,
        });
        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ message: 'Could not send message' });
    }
};

// --- REPLACE your old getConversations function in messageController.js WITH THIS ---

// @desc    Get all conversations for the logged-in user
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Use MongoDB Aggregation to efficiently group messages and get the latest one per conversation
        const conversations = await Message.aggregate([
            // Match all messages where the current user is either the sender or receiver
            { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
            
            // Sort by creation date to easily find the last message
            { $sort: { createdAt: -1 } },
            
            // Group messages by conversation partner
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$senderId", userId] },
                            then: "$receiverId",
                            else: "$senderId"
                        }
                    },
                    lastMessage: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ["$read", false] },
                                    { $eq: ["$receiverId", userId] }
                                ]},
                                1, 0
                            ]
                        }
                    }
                }
            },
            
            // Lookup user details for the conversation partner
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "withUser"
                }
            },

            // Deconstruct the 'withUser' array to be a single object
            { $unwind: "$withUser" },

            // Project the final fields into a clean structure
            {
                $project: {
                    _id: 0,
                    withUser: {
                        _id: "$withUser._id",
                        name: "$withUser.name",
                        username: "$withUser.username",
                        profileImage: "$withUser.profileImage",
                        isOnline: "$withUser.isOnline"
                    },
                    lastMessage: "$lastMessage",
                    unreadCount: "$unreadCount"
                }
            },
            // Sort conversations by the date of the last message
             { $sort: { "lastMessage.createdAt": -1 } }
        ]);

        res.json(conversations);

    } catch (error) {
        console.error("Get Conversations Error:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getChatMessages = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;
        
        const messages = await Message.find({
            $or: [
                { senderId: currentUserId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: currentUserId },
            ],
        })
        .populate('senderId', 'name username profileImage')
        .sort({ createdAt: 'asc' });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markConversationAsRead = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const otherUserId = req.params.userId;

        // Find all unread messages sent by the other user to the current user
        await Message.updateMany(
            { senderId: otherUserId, receiverId: currentUserId, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({ message: 'Messages marked as read.' });
    } catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};