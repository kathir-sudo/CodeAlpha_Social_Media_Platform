const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    bio: { type: String, default: '' },
    profileImage: { type: String, default: 'https://wp.cpsts.com/images/2017/04/person-icon.png' },

    // --- NEW & UPDATED FIELDS ---
    accountType: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who requested to follow this private account
    mutedAccounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users this account has muted
    notificationsFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users this account wants notifications from

    // --- EXISTING FIELDS ---
    isOnline: { type: Boolean, default: true },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    joinedDate: { type: Date, default: Date.now },
    isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

// Method to compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware to hash password before saving a new user
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


module.exports = mongoose.model('User', UserSchema);