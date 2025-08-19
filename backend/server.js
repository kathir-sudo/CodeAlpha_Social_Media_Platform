const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const trendingRoutes = require('./routes/trending');

// Initialize express app
const app = express();

// Middlewares
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '50mb' })); // To parse JSON bodies (and increase payload limit for images)
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // To parse URL-encoded bodies

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully.'))
.catch(err => console.error('MongoDB connection error:', err));


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/trending', trendingRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('SocialConnect API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});