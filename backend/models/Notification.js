const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user who receives the notification
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user who triggered it
    type: { type: String, enum: ['like', 'comment', 'follow'], required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    link: { type: String } // Optional link to the relevant post
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);