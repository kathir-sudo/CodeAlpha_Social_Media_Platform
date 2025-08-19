const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .populate('fromUserId', 'name username profileImage')
            .sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};