// SocialConnect App - Final Full-Stack Version (Corrected)

class SocialConnectApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentUser = null;
        this.isLoggedIn = false;
        this.currentView = 'feed';
        this.selectedChatUser = null;
        this.viewingProfileId = null;
        this.posts = [];
        this.comments = {};
        this.searchCache = {
            users: [],
            posts: [],
            hashtags: new Set(),
            isLoaded: false,
            isLoading: false
        };
        this.searchTimeout = null;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // --- CORE & SETUP ---
    async _fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('socialapp_token');
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const response = await fetch(`${this.apiBaseUrl}${url}`, { ...options, headers });
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired. Please log in again.');
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || `HTTP error! status: ${response.status}`);
            return data;
        } else {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return;
        }
    }

    init() {
        console.log('Initializing SocialConnect App');
        this.checkLoginStatus();
        this.setupEventListeners();
        if (this.isLoggedIn) {
            this.showMainApp();
            this.updateNotificationBadge();
            this.updateMessageIndicator(); 
            setInterval(() => {
            this.updateNotificationBadge();
            this.updateMessageIndicator(); 
        }, 30000);// Update every 30 seconds
        } else {
            this.showAuthScreen();
        }
    }

    checkLoginStatus() {
        const savedUser = localStorage.getItem('socialapp_currentUser');
        const token = localStorage.getItem('socialapp_token');
        if (savedUser && token) {
            this.currentUser = JSON.parse(savedUser);
            this.isLoggedIn = true;
            // Ensure arrays exist
            this.currentUser.following = this.currentUser.following || [];
            this.currentUser.mutedAccounts = this.currentUser.mutedAccounts || [];
            this.currentUser.notificationsFrom = this.currentUser.notificationsFrom || [];
        }
    }

    setupEventListeners() {
        // Auth
        document.getElementById('login-form-element')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('register-form-element')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('reset-form-element')?.addEventListener('submit', (e) => this.handlePasswordReset(e));
        document.getElementById('show-register')?.addEventListener('click', (e) => { e.preventDefault(); this.showRegisterForm(); });
        document.getElementById('show-login')?.addEventListener('click', (e) => { e.preventDefault(); this.showLoginForm(); });
        document.getElementById('show-reset')?.addEventListener('click', (e) => { e.preventDefault(); this.showResetForm(); });
        document.getElementById('back-to-login')?.addEventListener('click', (e) => { e.preventDefault(); this.showLoginForm(); });
        
        // Main App
        document.getElementById('logout-btn')?.addEventListener('click', () => this.logout());
        document.querySelectorAll('.nav-item').forEach(item => { item.addEventListener('click', (e) => this.handleNavigation(e)); });

        // Post Composer
        document.getElementById('post-content')?.addEventListener('input', () => this.updatePostButton());
        document.getElementById('add-image-btn')?.addEventListener('click', () => this.selectImage());
        document.getElementById('post-image-input')?.addEventListener('change', (e) => this.handleImageSelect(e));
        document.getElementById('remove-image-btn')?.addEventListener('click', () => this.removeImage());
        document.getElementById('post-submit-btn')?.addEventListener('click', () => this.submitPost());

        document.getElementById('clear-search-btn')?.addEventListener('click', () => this.clearSearchInput());

        // Modals
        document.getElementById('edit-post-form')?.addEventListener('submit', (e) => this.handleUpdatePost(e));
        document.getElementById('edit-comment-form')?.addEventListener('submit', (e) => this.handleUpdateComment(e));
        document.addEventListener('click', (e) => { if (e.target.classList.contains('modal')) this.closeAllModals(); });

        // Profile
        document.getElementById('edit-profile-btn')?.addEventListener('click', () => this.showEditProfileModal());
        document.getElementById('edit-avatar-btn')?.addEventListener('click', () => this.selectAvatar());
        document.getElementById('avatar-input')?.addEventListener('change', (e) => this.handleAvatarSelect(e));
        document.getElementById('edit-profile-form')?.addEventListener('submit', (e) => this.saveProfile(e));

        // Search
        document.getElementById('search-btn')?.addEventListener('click', () => this.navigateToView('search'));
        document.getElementById('search-input')?.addEventListener('input', (e) => this.handleSearch(e));
        document.querySelectorAll('.search-tab').forEach(tab => { tab.addEventListener('click', (e) => this.switchSearchTab(e)); });

        // Admin Panel (dynamic listener)
        document.body.addEventListener('click', e => {
            if (e.target && e.target.id === 'admin-link-btn') {
                this.navigateToView('admin');
            }
        });

        // Messages Event Listeners
        document.getElementById('new-message-btn')?.addEventListener('click', () => this.showNewMessageModal());
        document.getElementById('close-new-message')?.addEventListener('click', () => this.hideNewMessageModal());
        document.getElementById('send-message-btn')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
        document.getElementById('close-chat')?.addEventListener('click', () => this.closeChat());

        // Notifications
        document.getElementById('notifications-btn')?.addEventListener('click', () => this.toggleNotifications());
        document.getElementById('mark-all-read')?.addEventListener('click', () => this.markAllNotificationsRead());

        // Close notification dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notification-dropdown');
            const button = document.getElementById('notifications-btn');
            if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        // Close quick actions menu when clicking outside
        document.body.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-actions-container')) {
                document.querySelectorAll('.quick-actions-menu').forEach(menu => menu.classList.remove('show'));
            }
        });
    }

    // --- AUTHENTICATION ---
    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        if (!email || !password) return alert('Please enter both email and password');
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            this.currentUser = data;
            this.isLoggedIn = true;
            localStorage.setItem('socialapp_currentUser', JSON.stringify(data));
            localStorage.setItem('socialapp_token', data.token);
            this.showMainApp();
        } catch (error) {
            console.error('Login Error:', error);
            alert(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();
        if (!name || !username || !email || !password) return alert('Please fill in all fields');
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            this.currentUser = data;
            this.isLoggedIn = true;
            localStorage.setItem('socialapp_currentUser', JSON.stringify(data));
            localStorage.setItem('socialapp_token', data.token);
            alert('Registration successful!');
            this.showMainApp();
        } catch (error) {
            console.error('Registration Error:', error);
            alert(error.message);
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        const email = document.getElementById('reset-email').value.trim();
        if (!email) return alert('Please enter your email address');
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            alert(data.message);
            this.showLoginForm();
        } catch (error) {
            console.error('Password Reset Error:', error);
            alert(error.message);
        }
    }

    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        localStorage.removeItem('socialapp_currentUser');
        localStorage.removeItem('socialapp_token');
        window.location.reload();
    }

    switchSearchTab(e) {
    // Guard against clicks while data is still loading
    if (this.searchCache.isLoading) return;

    const tab = e.currentTarget.dataset.tab;
    
    document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tab}-results`).classList.add('active');
}

    // --- UI & NAVIGATION ---

    showAuthScreen() {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        if (authScreen) authScreen.style.display = 'flex';
        if (mainApp) mainApp.style.display = 'none';
        this.showLoginForm();
    }

    showMainApp() {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        if (authScreen) authScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'flex';
        this.updateUI();
        this.navigateToView('feed');
    }
    
    // --- NEW handleNavigation function in app.js ---
handleNavigation(e) {
    e.preventDefault();
    const view = e.currentTarget.dataset.view;
    
    // --- THIS IS THE CRITICAL FIX ---
    // If the user clicks the main "Profile" navigation button,
    // we must clear the viewingProfileId to ensure it loads their own profile.
    if (view === 'profile') {
        this.viewingProfileId = null;
    }
    // --------------------------------

    if (view) {
        this.navigateToView(view);
    }
}

    // --- REPLACE the navigateToView function in app.js ---

navigateToView(view) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navButton = document.querySelector(`[data-view="${view}"]`);
    if(navButton) navButton.classList.add('active');

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${view}-view`)?.classList.add('active');
    this.currentView = view;
    
    switch (view) {
        case 'feed': this.loadFeed(); break;
        case 'profile': this.loadProfile(); break;
        case 'search': this.loadSearch(); break; // <-- CHANGED
        case 'trending': this.loadTrending(); break;
        case 'messages': this.loadMessages(); break;
        case 'admin': this.loadAdminData(); break;
    }
}

    updateUI() {
        if (!this.isLoggedIn || !this.currentUser) return;
        document.getElementById('composer-avatar').src = this.currentUser.profileImage;
    }

    // --- POSTS & FEED ---

    async loadFeed() {

        this.updateNotificationBadge();
        this.updateMessageIndicator();


        const feedContainer = document.getElementById('posts-feed');
        if (!feedContainer) return;
        feedContainer.innerHTML = `<div class="loading">Loading feed...</div>`;
        try {
            const posts = await this._fetchWithAuth('/posts/feed');
            this.posts = posts;
            if (posts.length === 0) {
                feedContainer.innerHTML = `<div class="empty-state"><h3>Your feed is empty</h3><p>Follow people or create a post to get started.</p></div>`;
                return;
            }
            feedContainer.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
        } catch (error) {
            feedContainer.innerHTML = `<div class="empty-state"><h3>Could not load feed</h3><p>${error.message}</p></div>`;
        }
    }

    async submitPost() {
        const content = document.getElementById('post-content').value.trim();
        const previewImage = document.getElementById('preview-image');
        let image = null;
        if (previewImage && previewImage.src.startsWith('data:image')) {
            image = previewImage.src;
        }
        if (!content && !image) return;
        try {
            await this._fetchWithAuth('/posts', {
                method: 'POST',
                body: JSON.stringify({ content, image }),
            });
            document.getElementById('post-content').value = '';
            this.removeImage();
            this.updatePostButton();
            this.loadFeed();
        } catch (error) {
            alert(`Could not create post: ${error.message}`);
        }
    }
    
   // --- CONFIRM your frontend/app.js has this function ---

async deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        try {
            await this._fetchWithAuth(`/posts/${postId}`, { method: 'DELETE' });
            // On success, reload the current view to show the change
            if (this.currentView === 'profile') {
                this.loadProfile();
            } else {
                this.loadFeed();
            }
        } catch (error) {
            // This will now show a more specific error like "Not authorized..."
            alert(`Error: ${error.message}`);
        }
    }
}
    
    showEditPostModal(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (post) {
            document.getElementById('edit-post-id').value = postId;
            document.getElementById('edit-post-content').value = post.content;
            document.getElementById('edit-post-modal').classList.remove('hidden');
        }
    }

    async handleUpdatePost(e) {
        e.preventDefault();
        const postId = document.getElementById('edit-post-id').value;
        const content = document.getElementById('edit-post-content').value.trim();
        if (!content) return;
        try {
            await this._fetchWithAuth(`/posts/${postId}`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });
            this.hideEditPostModal();
            this.loadFeed();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }
    
    // --- COMMENTS ---
    
    async addComment(postId) {
        const input = document.querySelector(`#comments-${postId} .comment-input`);
        const content = input.value.trim();
        if (!content) return;
        try {
            await this._fetchWithAuth(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content }),
            });
            input.value = '';
            this.toggleComments(postId, true);
            this.loadFeed();
        } catch (error) {
            alert(`Could not add comment: ${error.message}`);
        }
    }

// --- REPLACE your old toggleComments function in app.js ---

async toggleComments(postId, forceOpen = false) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    if (!commentsSection) return;
    const isOpen = commentsSection.style.display === 'block';

    if (isOpen && !forceOpen) {
        commentsSection.style.display = 'none';
    } else {
        commentsSection.style.display = 'block';
        const commentsList = document.getElementById(`comments-list-${postId}`);
        commentsList.innerHTML = `<div class="loading">...</div>`;
        try {
            // Always fetch the latest comments from the server
            const comments = await this._fetchWithAuth(`/posts/${postId}/comments`);
            // Store the fetched comments in our cache, keyed by the postId
            this.comments[postId] = comments;
            commentsList.innerHTML = this.createCommentsHTML(comments);
        } catch (error) {
            console.error('Error fetching comments:', error);
            commentsList.innerHTML = `<div class="empty-state"><p>Could not load comments.</p></div>`;
        }
    }
}
    
    showEditCommentModal(commentId, postId) {
        const comment = this.comments[postId]?.find(c => c._id === commentId);
        if (comment) {
            document.getElementById('edit-comment-id').value = commentId;
            document.getElementById('edit-comment-content').value = comment.content;
            document.getElementById('edit-comment-modal').classList.remove('hidden');
        } else {
            console.error("Comment not found in cache for editing.");
        }
    }

    hideEditCommentModal() {
        document.getElementById('edit-comment-modal').classList.add('hidden');
    }

    async handleUpdateComment(e) {
        e.preventDefault();
        const commentId = document.getElementById('edit-comment-id').value;
        const content = document.getElementById('edit-comment-content').value.trim();
        if (!content) return;

        try {
            const updatedComment = await this._fetchWithAuth(`/posts/comment/${commentId}`, {
                method: 'PUT',
                body: JSON.stringify({ content })
            });
            this.hideEditCommentModal();
            // Refresh the comments for the parent post
            this.toggleComments(updatedComment.postId, true);
        } catch (error) {
            alert(`Error updating comment: ${error.message}`);
        }
    }

// --- REPLACE your old deleteComment function in app.js ---

async deleteComment(event, commentId) {
    if (confirm('Are you sure you want to delete this comment?')) {
        try {
            // Find the parent .post element from the button that was clicked
            const postElement = event.target.closest('.post');
            if (!postElement) {
                throw new Error("Could not find parent post element.");
            }
            const postId = postElement.dataset.postId;

            await this._fetchWithAuth(`/posts/comment/${commentId}`, { method: 'DELETE' });
            
            // Refresh the comments for the parent post
            this.toggleComments(postId, true);
            // Also refresh the main feed to update the comment count on the post
            this.loadFeed();
        } catch (error) {
            alert(`Error deleting comment: ${error.message}`);
        }
    }
}
    // --- LIKES ---

    // --- NEW toggleLike function in app.js ---

async toggleLike(id, fromDoubleClick = false) {
    const postElement = document.querySelector(`.post[data-post-id="${id}"]`);
    const likeButton = postElement.querySelector('.engagement-btn');
    const isLiked = likeButton.classList.contains('liked');

    // Trigger animation only on double-click that results in a "like"
    if (fromDoubleClick && !isLiked) {
        const heart = postElement.querySelector('.like-animation-heart');
        heart.classList.add('show-like-heart');
        setTimeout(() => {
            heart.classList.remove('show-like-heart');
        }, 1000); // Animation duration is 1s
    }

    try {
        const updatedPost = await this._fetchWithAuth(`/posts/${id}/like`, { method: 'PUT' });
        // Update local cache to keep it in sync
        const postInCache = this.posts.find(p => p._id === id);
        if(postInCache) postInCache.likes = updatedPost.likes;

        // Update UI
        const likeCountSpan = likeButton.querySelector('span');
        likeCountSpan.textContent = `${updatedPost.likes.length}`;
        if (updatedPost.likes.includes(this.currentUser._id)) {
            likeButton.classList.add('liked');
        } else {
            likeButton.classList.remove('liked');
        }
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

    // --- PROFILE ---

    // --- REPLACEMENT: loadProfile ---
// --- REPLACE your old loadProfile function with this new one in app.js ---

async loadProfile() {
    // Determine whose profile to load: the logged-in user's or someone else's.
    const userIdToLoad = this.viewingProfileId || this.currentUser._id;
    const isOwnProfile = userIdToLoad === this.currentUser._id;

    // --- CRITICAL FIX: Clear previous state for ALL dynamic elements ---
    document.getElementById('profile-action-buttons').innerHTML = '';
    document.getElementById('avatar-action-container').innerHTML = ''; // Clear the avatar button

    try {
        // Use the correct API endpoint based on whose profile it is
        const user = isOwnProfile 
            ? await this._fetchWithAuth(`/users/profile`) 
            : await this._fetchWithAuth(`/users/${userIdToLoad}`);
        
        const posts = await this._fetchWithAuth(`/posts/user/${user._id}`);
        
        // Populate user info (unchanged)
        document.getElementById('profile-avatar').src = user.profileImage;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-username').textContent = `@${user.username}`;
        document.getElementById('profile-bio').textContent = user.bio || 'No bio yet.';
        document.getElementById('posts-count').textContent = posts.length;
        document.getElementById('followers-count').textContent = user.followers.length;
        document.getElementById('following-count').textContent = user.following.length;

        // --- DYNAMIC BUTTON LOGIC ---
        const buttonsContainer = document.getElementById('profile-action-buttons');
        const avatarContainer = document.getElementById('avatar-action-container');

        if (isOwnProfile) {
            // It's our own profile, so show the "Edit Profile" and "Change Photo" buttons
            buttonsContainer.innerHTML = `<button class="btn btn--secondary" id="edit-profile-btn">Edit Profile</button>`;
            document.getElementById('edit-profile-btn').addEventListener('click', () => this.showEditProfileModal());
            
            // Dynamically create the "Change Photo" button and its hidden input field
            avatarContainer.innerHTML = `
                <button class="btn btn--secondary btn--sm edit-avatar-btn" id="edit-avatar-btn">Change Photo</button>
                <input type="file" id="avatar-input" accept="image/*" style="display: none;">
            `;
            // Re-attach event listeners since we just created these elements
            document.getElementById('edit-avatar-btn').addEventListener('click', () => this.selectAvatar());
            document.getElementById('avatar-input').addEventListener('change', (e) => this.handleAvatarSelect(e));

            this.addAdminLink(); // Add admin link only on own profile
        } else {
            // It's someone else's profile, so show the "Follow/Following" button
            const isFollowing = this.currentUser.following.includes(user._id);
            buttonsContainer.innerHTML = `
                <button class="btn ${isFollowing ? 'btn--secondary following' : 'btn--primary'} btn--sm follow-btn" 
                        onclick="app.toggleFollow(event, '${user._id}')">
                    ${isFollowing ? 'Following' : 'Follow'}
                </button>`;
        }

        // Populate posts (unchanged)
        const profilePostsContainer = document.getElementById('profile-posts');
        if (posts.length === 0) {
            profilePostsContainer.innerHTML = `<div class="empty-state"><h3>No posts yet</h3></div>`;
        } else {
            this.posts = posts;
            profilePostsContainer.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profile-view').innerHTML = `<div class="empty-state"><h3>Could not load profile.</h3><p>${error.message}</p></div>`;
    }
}

    async saveProfile(e) {
        e.preventDefault();
        const name = document.getElementById('edit-name').value;
        const bio = document.getElementById('edit-bio').value;
        try {
            const updatedUser = await this._fetchWithAuth('/users/profile', {
                method: 'PUT',
                body: JSON.stringify({ name, bio }),
            });
            this.currentUser.name = updatedUser.name;
            this.currentUser.bio = updatedUser.bio;
            localStorage.setItem('socialapp_currentUser', JSON.stringify(this.currentUser));
            this.hideEditProfileModal();
            this.loadProfile();
        } catch (error) {
            alert(`Could not save profile: ${error.message}`);
        }
    }

    async handleAvatarSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const base64Image = reader.result;
                const updatedUser = await this._fetchWithAuth('/users/profile', {
                    method: 'PUT',
                    body: JSON.stringify({ profileImage: base64Image }),
                });
                this.currentUser.profileImage = updatedUser.profileImage;
                localStorage.setItem('socialapp_currentUser', JSON.stringify(this.currentUser));
                document.getElementById('profile-avatar').src = updatedUser.profileImage;
                this.loadProfile();
            } catch (error) {
                alert(`Could not update avatar: ${error.message}`);
            }
        };
    }

// --- REPLACE your old toggleFollow function in app.js WITH THIS ---

async toggleFollow(event, userId) {
    if (!this.currentUser) return;

    const button = event.currentTarget;
    const isCurrentlyFollowing = this.currentUser.following.includes(userId);
    const url = `/users/${userId}/${isCurrentlyFollowing ? 'unfollow' : 'follow'}`;

    // --- Step 1: Optimistically update the UI immediately ---
    // This makes the app feel instantaneous.
    button.disabled = true;
    if (isCurrentlyFollowing) {
        // Visually unfollow
        button.textContent = 'Follow';
        button.classList.remove('btn--secondary', 'following');
        button.classList.add('btn--primary');
    } else {
        // Visually follow
        button.textContent = 'Following';
        button.classList.remove('btn--primary');
        button.classList.add('btn--secondary', 'following');
    }

    try {
        // --- Step 2: Send the request to the server ---
        await this._fetchWithAuth(url, { method: 'PUT' });

        // --- Step 3: On success, update the true local state ---
        // This ensures the state is correct for the next action.
        if (isCurrentlyFollowing) {
            this.currentUser.following = this.currentUser.following.filter(id => id !== userId);
        } else {
            this.currentUser.following.push(userId);
        }
        localStorage.setItem('socialapp_currentUser', JSON.stringify(this.currentUser));

    } catch (error) {
        // --- Step 4: If the server fails, revert the UI change ---
        console.error(`Error toggling follow: ${error.message}`);
        alert("Action failed. Reverting change."); // Let the user know
        
        // Revert the button to its original state
        if (isCurrentlyFollowing) {
            button.textContent = 'Following';
            button.classList.remove('btn--primary');
            button.classList.add('btn--secondary', 'following');
        } else {
            button.textContent = 'Follow';
            button.classList.remove('btn--secondary', 'following');
            button.classList.add('btn--primary');
        }
    } finally {
        // --- Step 5: Re-enable the button ---
        button.disabled = false;
    }
}
// --- DELETE your old search functions and PASTE THIS ENTIRE BLOCK INTO app.js, REPLACING THE OLD SEARCH FUNCTIONS ---

loadSearch() {
    // This function is now the single entry point for the search view.
    
    // 1. Reset the UI to a clean, default state immediately.
    this.resetSearchUI();
    
    // 2. Check if we already have the data. If so, just display it.
    if (this.searchCache.isLoaded) {
        this.displaySearchResults(
            this.searchCache.users,
            this.searchCache.posts,
            Array.from(this.searchCache.hashtags)
        );
        return; // We're done, no need to fetch again.
    }

    // 3. If no cache, show loading indicators and fetch the data.
    const usersResults = document.getElementById('users-results');
    const postsResults = document.getElementById('posts-results');
    const hashtagsResults = document.getElementById('hashtags-results');

    usersResults.innerHTML = `<div class="loading">Loading all users...</div>`;
    postsResults.innerHTML = `<div class="loading">Loading all posts...</div>`;
    hashtagsResults.innerHTML = `<div class="loading">Loading hashtags...</div>`;

    // Use Promise.allSettled to handle cases where one endpoint might fail
    Promise.allSettled([
        this._fetchWithAuth('/search/users'),
        this._fetchWithAuth('/search/posts')
    ]).then(([usersResult, postsResult]) => {

        // Handle users data
        if (usersResult.status === 'fulfilled') {
            this.searchCache.users = usersResult.value;
        } else {
            console.error("Failed to load users:", usersResult.reason);
            usersResults.innerHTML = `<div class="empty-state"><p>Could not load users.</p></div>`;
        }
        
        // Handle posts data
        if (postsResult.status === 'fulfilled') {
            this.searchCache.posts = postsResult.value;
            // Extract hashtags from posts
            const hashtagRegex = /#(\w+)/g;
            this.searchCache.posts.forEach(post => {
                const matches = post.content.match(hashtagRegex);
                if (matches) {
                    matches.forEach(match => this.searchCache.hashtags.add(match.toLowerCase().substring(1)));
                }
            });
        } else {
            console.error("Failed to load posts:", postsResult.reason);
            postsResults.innerHTML = `<div class="empty-state"><p>Could not load posts.</p></div>`;
        }

        // Mark cache as loaded and display whatever data we successfully fetched
        this.searchCache.isLoaded = true;
        this.displaySearchResults(
            this.searchCache.users,
            this.searchCache.posts,
            Array.from(this.searchCache.hashtags)
        );
    });
}

resetSearchUI() {
    // This helper function ensures the search page is always in a predictable state when loaded.
    document.getElementById('search-input').value = '';
    // Activate the "Users" tab by default
    document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.search-tab[data-tab="users"]').classList.add('active');
    // Show the "Users" content pane by default
    document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('users-results').classList.add('active');
}

// --- REPLACE your old handleSearch function with this new version ---

handleSearch(e) {
    const clearBtn = document.getElementById('clear-search-btn');
    const query = e.target.value.trim();

    // Show or hide the clear button based on whether there's text
    if (query.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
    
    // The rest of the search logic remains the same
    if (!this.searchCache.isLoaded) return; 

    clearTimeout(this.searchTimeout);
    
    this.searchTimeout = setTimeout(() => {
        const lowerCaseQuery = query.toLowerCase();
        const filteredUsers = this.searchCache.users.filter(user => 
            user.name.toLowerCase().includes(lowerCaseQuery) ||
            user.username.toLowerCase().includes(lowerCaseQuery)
        );
        const filteredPosts = this.searchCache.posts.filter(post =>
            post.content.toLowerCase().includes(lowerCaseQuery)
        );
        const filteredHashtags = Array.from(this.searchCache.hashtags).filter(tag =>
            tag.toLowerCase().includes(lowerCaseQuery.replace('#', ''))
        );
        this.displaySearchResults(filteredUsers, filteredPosts, filteredHashtags);
    }, 250);
}

// --- REPLACE your old displaySearchResults with this new version ---

displaySearchResults(users, posts, hashtags) {
    // Users Tab
    const usersHtml = users.map(user => {
        const isFollowing = this.currentUser?.following?.includes(user._id);
        const isSelf = user._id === this.currentUser._id;
        return `
            <div class="search-result-item">
                <img src="${user.profileImage}" alt="${user.name}" class="user-avatar">
                <div style="flex: 1; cursor: pointer;" onclick="app.viewUserProfile('${user._id}')">
                    <h4>${user.name}</h4>
                    <p>@${user.username}</p>
                </div>
                ${!isSelf ? `
                    <div class="profile-actions-container">
                        <button class="btn ${isFollowing ? 'btn--secondary following' : 'btn--primary'} btn--sm follow-btn" 
                                onclick="event.stopPropagation(); app.toggleFollow(event, '${user._id}')">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ` : ''}
            </div>`;
    }).join('');
    document.getElementById('users-results').innerHTML = users.length ? usersHtml : '<div class="empty-state"><p>No users match your search.</p></div>';
    
    // Posts Tab
    this.posts = posts;
    const postsHtml = posts.map(post => this.createPostHTML(post)).join('');
    document.getElementById('posts-results').innerHTML = posts.length ? postsHtml : '<div class="empty-state"><p>No posts match your search.</p></div>';
    
    // Hashtags Tab
    const hashtagsHtml = hashtags.map(tag => `<a href="#" class="hashtag-item" onclick="app.searchHashtag('${tag}')">#${tag}</a>`).join('');
    document.getElementById('hashtags-results').innerHTML = hashtags.length ? hashtagsHtml : '<div class="empty-state"><p>No hashtags match your search.</p></div>';
}

    // --- TRENDING ---

    async loadTrending() {
        const hashtagsContainer = document.getElementById('trending-hashtags-list');
        const postsContainer = document.getElementById('trending-posts-feed');
        hashtagsContainer.innerHTML = `<div class="loading">...</div>`;
        postsContainer.innerHTML = `<div class="loading">...</div>`;
        try {
            const data = await this._fetchWithAuth('/trending');
            hashtagsContainer.innerHTML = data.trendingHashtags.map(tag => 
                `<a href="#" class="hashtag-item" onclick="app.searchHashtag('${tag}')">#${tag}</a>`
            ).join('') || 'No trending tags.';
            this.posts = data.popularPosts;
            postsContainer.innerHTML = data.popularPosts.map(post => 
                this.createPostHTML(post)
            ).join('') || 'No popular posts.';
        } catch (error) {
            console.error('Error loading trending data:', error);
        }
    }

    // --- MESSAGES ---

    async loadMessages() {
        const conversationsContainer = document.getElementById('conversations');
        conversationsContainer.innerHTML = `<div class="loading">Loading conversations...</div>`;
        try {
            const conversations = await this._fetchWithAuth('/messages/conversations'); 
             if (conversations.length === 0) {
                conversationsContainer.innerHTML = `<div class="empty-state"><p>No conversations yet.</p></div>`;
                return;
            }
            conversationsContainer.innerHTML = conversations.map(c => this.createConversationHTML(c)).join('');
        } catch (error) {
            console.error('Error loading conversations:', error);
            conversationsContainer.innerHTML = `<div class="empty-state"><p>Could not load conversations.</p></div>`;
        }
    }

    async updateMessageIndicator() {
    if (!this.isLoggedIn) return;
    const indicator = document.getElementById('messages-indicator');
    if (!indicator) return;

    try {
        // We can reuse our getConversations endpoint as it already calculates unread counts
        const conversations = await this._fetchWithAuth('/messages/conversations');
        // Check if ANY conversation has an unreadCount greater than 0
        const hasUnread = conversations.some(conv => conv.unreadCount > 0);

        if (hasUnread) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    } catch (error) {
        // Fail silently
        // console.error("Message indicator update failed:", error);
    }
}

    async openChat(userId) {
    this.selectedChatUser = userId;
    const chatWindow = document.getElementById('chat-window');
    const chatMessagesContainer = document.getElementById('chat-messages');

    try {
        // --- ADD THIS API CALL AT THE TOP ---
        // Mark the conversation as read on the backend
         await this._fetchWithAuth(`/messages/${userId}/read`, { method: 'PUT' });
        // After marking as read, reload the conversations list to remove the highlight
        this.loadMessages();
        this.updateMessageIndicator();
        // ------------------------------------
        
        const user = await this._fetchWithAuth(`/users/${userId}`);
        
        document.getElementById('chat-user-avatar').src = user.profileImage;
        document.getElementById('chat-user-name').textContent = user.name;
        document.getElementById('chat-user-status').textContent = user.isOnline ? 'Online' : 'Offline';
        chatWindow.style.display = 'flex';
        
        chatMessagesContainer.innerHTML = `<div class="loading">Loading messages...</div>`;
        const messages = await this._fetchWithAuth(`/messages/${userId}`);
        chatMessagesContainer.innerHTML = messages.map(m => this.createMessageHTML(m)).join('');
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error opening chat:', error);
    }
}

    async sendMessage() {
        const content = document.getElementById('message-input').value.trim();
        if (!content || !this.selectedChatUser) return;
        try {
            await this._fetchWithAuth('/messages', {
                method: 'POST',
                body: JSON.stringify({ receiverId: this.selectedChatUser, content })
            });
            document.getElementById('message-input').value = '';
            this.openChat(this.selectedChatUser);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    closeChat() {
        this.selectedChatUser = null;
        document.getElementById('chat-window').style.display = 'none';
    }

    // --- ADMIN ---

    addAdminLink() {
        if (this.currentUser && this.currentUser.isAdmin) {
            const profileActions = document.querySelector('.profile-details .btn').parentElement;
            if (profileActions && !document.getElementById('admin-link-btn')) {
                const adminButton = document.createElement('button');
                adminButton.id = 'admin-link-btn';
                adminButton.className = 'btn btn--secondary';
                adminButton.textContent = 'Admin Panel';
                adminButton.style.marginLeft = '10px';
                profileActions.appendChild(adminButton);
            }
        }
    }

 // In frontend/app.js

async loadAdminData() {
    const usersList = document.getElementById('admin-users-list');
    const postsList = document.getElementById('admin-posts-list');
    usersList.innerHTML = `<div class="loading">Loading Users...</div>`;
    postsList.innerHTML = `<div class="loading">Loading Posts...</div>`;
    
    try {
        const users = await this._fetchWithAuth('/admin/users');
        const posts = await this._fetchWithAuth('/admin/posts');

        document.getElementById('total-users').textContent = users.length;
        document.getElementById('active-users').textContent = users.filter(u => u.isOnline).length;
        document.getElementById('total-posts').textContent = posts.length;

        usersList.innerHTML = users.map(user => `
            <div class="admin-list-item">
                <div class="admin-item-info">
                    <img src="${user.profileImage}" alt="${user.name}" class="user-avatar">
                    <div>
                        <h4>${user.name} (@${user.username})</h4>
                        <p>${user.email}</p>
                    </div>
                </div>
            </div>
        `).join('');

        postsList.innerHTML = posts.map(post => `
            <div class="admin-list-item">
                <div class="admin-item-info">
                    <div>
                        <p>"${post.content.substring(0, 100)}..."</p>
                        <small>by @${post.userId.username}</small>
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="btn btn--error btn--sm" onclick="app.deletePostAsAdmin('${post._id}')">Delete</button>
                </div>
            </div>
        `).join('');

    } catch(error) {
        console.error("Failed to load admin data", error);
        // Display a more informative error message
        usersList.innerHTML = `<div class="empty-state"><p>Could not load admin data. Are you an admin?</p></div>`;
        postsList.innerHTML = '';
    }
}
    
    async deletePostAsAdmin(postId) {
        if (confirm('Are you sure you want to permanently delete this post as an admin?')) {
            try {
                await this._fetchWithAuth(`/admin/posts/${postId}`, { method: 'DELETE' });
                alert('Post deleted successfully.');
                this.loadAdminData();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    }

    // --- HTML TEMPLATES & UTILITIES ---

    // --- NEW createPostHTML function in app.js ---

createPostHTML(post) {
    const user = post.userId;
    if (!user || !this.currentUser) return '';
    const isOwner = user._id === this.currentUser._id;
    const timeAgo = this.getTimeAgo(post.createdAt);
    const actionButtons = isOwner ? `
        <div class="post-actions">
            <button class="btn btn--secondary btn--sm" onclick="app.showEditPostModal('${post._id}')">Edit</button>
            <button class="btn btn--error btn--sm" onclick="app.deletePost('${post._id}')">Delete</button>
        </div>
    ` : '';
    const isLiked = post.likes.includes(this.currentUser._id);
    return `
        <div class="post" data-post-id="${post._id}">
            
<div class="post-header">
    <img src="${user.profileImage}" alt="${user.name}" class="user-avatar" style="cursor: pointer;" onclick="app.viewUserProfile('${user._id}')">
    <div class="post-user-details">
       <div class="post-user-name-group">
    <h4 style="cursor: pointer;" onclick="app.viewUserProfile('${user._id}')">${user.name}</h4>
    <p class="post-user-handle-time">
        <span>@${user.username}</span>
        <span>•</span>
        <span>${timeAgo}</span>
    </p>
</div>
        ${actionButtons}
    </div>
</div>
<div class="post-content" ondblclick="app.toggleLike('${post._id}', true)">
    <div class="like-animation-heart"></div>
    <p class="post-text">${post.content.replace(/#(\w+)/g, '<span class="hashtag" onclick="app.searchHashtag(\'$1\')">#$1</span>')}</p>
    ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
</div>

            <div class="post-engagement">
                <button class="engagement-btn ${isLiked ? 'liked' : ''}" onclick="app.toggleLike('${post._id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span>${post.likes.length}</span>
                </button>
                <button class="engagement-btn" onclick="app.toggleComments('${post._id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    <span>${post.comments.length}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post._id}" style="display: none;">
                <div class="comment-form">
                    <img src="${this.currentUser.profileImage}" alt="Your avatar" class="user-avatar">
                    <input type="text" class="comment-input form-control" placeholder="Write a comment..." onkeypress="if(event.key === 'Enter') app.addComment('${post._id}')">
                </div>
                <div class="comments-list" id="comments-list-${post._id}"></div>
            </div>
        </div>`;
}

    createCommentsHTML(comments) {
    if (!comments || comments.length === 0) {
        return '<div class="empty-state" style="padding: 1rem;"><p>No comments yet.</p></div>';
    }

    return comments.map(comment => {
        const user = comment.userId;
        if (!user) return '';
        
        const isOwner = user._id === this.currentUser._id;
        const timeAgo = this.getTimeAgo(comment.createdAt);

        // Conditionally create the action buttons
        const actionButtons = isOwner ? `
            <div class="comment-actions">
                <button class="btn btn--secondary btn--sm" onclick="app.showEditCommentModal('${comment._id}', '${comment.postId}')">Edit</button>
                <button class="btn btn--error btn--sm" onclick="app.deleteComment(event, '${comment._id}')">Delete</button>
            </div>
        ` : '';
        
        return `
    <div class="comment" data-comment-id="${comment._id}">
        <img src="${user.profileImage}" alt="${user.name}" class="user-avatar" style="width: 24px; height: 24px;">
        <div class="comment-body">
            <div class="comment-header">
                <span class="comment-author">${user.name}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
            ${actionButtons}
        </div>
    </div>`;
    }).join('');
}
clearSearchInput() {
    const searchInput = document.getElementById('search-input');
    searchInput.value = ''; // Clear the text
    this.handleSearch({ target: { value: '' } }); // Trigger a search with an empty query to show all results
    searchInput.focus(); // Keep the user in the search bar
}
    
    displaySearchResults(users, posts, hashtags) {
    // Users Tab
    const usersHtml = users.map(user => {
        const isFollowing = this.currentUser?.following?.includes(user._id);
        const isSelf = user._id === this.currentUser._id;
        return `
            <div class="search-result-item">
                <img src="${user.profileImage}" alt="${user.name}" class="user-avatar">
                <div style="flex: 1; cursor: pointer;" onclick="app.viewUserProfile('${user._id}')">
                    <h4>${user.name}</h4>
                    <p>@${user.username}</p>
                </div>
                ${!isSelf ? `
                    <div class="profile-actions-container">
                        <button class="btn ${isFollowing ? 'btn--secondary following' : 'btn--primary'} btn--sm follow-btn" 
                                onclick="event.stopPropagation(); app.toggleFollow(event, '${user._id}')">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>
                ` : ''}
            </div>`;
    }).join('');
    document.getElementById('users-results').innerHTML = users.length ? usersHtml : '<div class="empty-state"><p>No users match your search.</p></div>';
    
    // Posts Tab
    this.posts = posts;
    const postsHtml = posts.map(post => this.createPostHTML(post)).join('');
    document.getElementById('posts-results').innerHTML = posts.length ? postsHtml : '<div class="empty-state"><p>No posts match your search.</p></div>';
    
    // Hashtags Tab
    const hashtagsHtml = hashtags.map(tag => `<a href="#" class="hashtag-item" onclick="app.searchHashtag('${tag}')">#${tag}</a>`).join('');
    document.getElementById('hashtags-results').innerHTML = hashtags.length ? hashtagsHtml : '<div class="empty-state"><p>No hashtags match your search.</p></div>';
}

    searchHashtag(hashtag) {
    this.navigateToView('search');
    // We need to wait a moment for the view to switch before setting the value
    setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        searchInput.value = `#${hashtag}`;
        this.handleSearch({ target: { value: `#${hashtag}` } });
        // Programmatically click the 'Posts' tab to switch to it
        document.querySelector('.search-tab[data-tab="posts"]').click();
    }, 100);
}

    createConversationHTML(conversation) {
    const user = conversation.withUser;
    const lastMessage = conversation.lastMessage;
    
    // Check for unread messages to add the highlight class
    const hasUnread = conversation.unreadCount > 0;
    
    return `
        <div class="conversation-item ${hasUnread ? 'unread' : ''}" onclick="app.openChat('${user._id}')">
            <div class="avatar-container">
                <img src="${user.profileImage}" alt="${user.name}" class="user-avatar">
            </div>
            <div class="conversation-info">
                <h4>${user.name}</h4>
                <p>${lastMessage.content.substring(0, 30)}...</p>
            </div>
            ${hasUnread ? `<div class="unread-indicator">${conversation.unreadCount}</div>` : ''}
        </div>`;
}

    createMessageHTML(message) {
        const isOwn = message.senderId._id === this.currentUser._id;
        const user = message.senderId;
        const timeAgo = this.getTimeAgo(message.createdAt);
        return `
            <div class="message ${isOwn ? 'own' : ''}">
                ${!isOwn ? `<img src="${user.profileImage}" alt="${user.name}" class="user-avatar">` : ''}
                <div class="message-bubble">
                    ${message.content}
                    <div class="message-time">${timeAgo}</div>
                </div>
            </div>`;
    }

    updatePostButton() {
        const postContent = document.getElementById('post-content');
        const submitBtn = document.getElementById('post-submit-btn');
        const imagePreview = document.getElementById('image-preview');
        if (postContent && submitBtn && imagePreview) {
            const hasText = postContent.value.trim().length > 0;
            const hasImage = imagePreview.style.display !== 'none';
            submitBtn.disabled = !hasText && !hasImage;
        }
    }

    handleImageSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('preview-image').src = event.target.result;
                document.getElementById('image-preview').style.display = 'block';
                this.updatePostButton();
            };
            reader.readAsDataURL(file);
        }
    }

    removeImage() {
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('preview-image').src = "";
        document.getElementById('post-image-input').value = '';
        this.updatePostButton();
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);
        if (diffInSeconds < 60) return 'just now';
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    showLoginForm() { document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active')); document.getElementById('login-form')?.classList.add('active'); }
    showRegisterForm() { document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active')); document.getElementById('register-form')?.classList.add('active'); }
    showResetForm() { document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active')); document.getElementById('reset-form')?.classList.add('active'); }
    selectImage() { document.getElementById('post-image-input').click(); }
    selectAvatar() { document.getElementById('avatar-input').click(); }
    // --- REPLACE your old showEditProfileModal function in app.js ---

showEditProfileModal() {
    if (!this.currentUser) return;

    // Populate the form with the current user's data
    document.getElementById('edit-name').value = this.currentUser.name;
    document.getElementById('edit-bio').value = this.currentUser.bio || '';

    // Show the modal
    document.getElementById('edit-profile-modal').classList.remove('hidden');
}
    hideEditProfileModal() { document.getElementById('edit-profile-modal').classList.add('hidden'); }
    closeAllModals() { document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden')); }
    hideEditPostModal() { document.getElementById('edit-post-modal').classList.add('hidden'); }
    
// --- NOTIFICATIONS ---

async toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    const isVisible = dropdown.classList.contains('show');
    if (isVisible) {
        dropdown.classList.remove('show');
    } else {
        dropdown.classList.add('show');
        this.loadNotifications();
    }
}

async loadNotifications() {
    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = `<div class="loading">Loading...</div>`;
    try {
        const notifications = await this._fetchWithAuth('/notifications');
        if (notifications.length === 0) {
            notificationList.innerHTML = `<div class="empty-state"><p>No notifications yet.</p></div>`;
            return;
        }
        notificationList.innerHTML = notifications.map(n => this.createNotificationHTML(n)).join('');
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = `<div class="empty-state"><p>Could not load notifications.</p></div>`;
    }
}

async markAllNotificationsRead() {
    try {
        await this._fetchWithAuth('/notifications/read', { method: 'PUT' });
        // After marking as read, reload the list and update the badge
        this.loadNotifications();
        this.updateNotificationBadge();
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}

async updateNotificationBadge() {
    if (!this.isLoggedIn) return;
    try {
        // Fetch fresh notification data to get an accurate count
        const notifications = await this._fetchWithAuth('/notifications');
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex'; // Use flex for better centering
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        // Fail silently so it doesn't interrupt the user experience
        // console.error("Badge update failed:", error);
    }
}

createNotificationHTML(notification) {
    const fromUser = notification.fromUserId;
    if (!fromUser) return ''; // Gracefully handle if user was deleted
    const timeAgo = this.getTimeAgo(notification.createdAt);
    
    return `
        <div class="notification-item ${!notification.read ? 'unread' : ''}">
            <img src="${fromUser.profileImage}" alt="${fromUser.name}" class="user-avatar" style="width: 40px; height: 40px;">
            <div class="notification-content">
                <p>
                    <strong style="cursor: pointer;" onclick="app.viewUserProfile('${fromUser._id}')">${fromUser.name}</strong> 
                    ${notification.content.replace(fromUser.name, '').trim()}
                </p>
                <small>${timeAgo}</small>
            </div>
        </div>
    `;
}

    async showNewMessageModal() {
    const modal = document.getElementById('new-message-modal');
    const userList = document.getElementById('message-user-list');
    
    // Show modal and loading state immediately
    modal.classList.remove('hidden');
    userList.innerHTML = `<div class="loading">Loading users...</div>`;

    try {
        // Fetch a list of all users you can message
        // We can reuse the search endpoint without a query
        const users = await this._fetchWithAuth('/search/users');
        
        // Filter out the current user from the list
        const otherUsers = users.filter(user => user._id !== this.currentUser._id);
        
        if (otherUsers.length === 0) {
            userList.innerHTML = `<div class="empty-state"><p>No other users to message.</p></div>`;
            return;
        }

        // Build the HTML for the user list
        userList.innerHTML = otherUsers.map(user => `
            <div class="user-list-item" onclick="app.startNewChat('${user._id}')">
                <div class="avatar-container">
                    <img src="${user.profileImage}" alt="${user.name}" class="user-avatar">
                    ${user.isOnline ? '<div class="online-indicator"></div>' : ''}
                </div>
                <div>
                    <h4>${user.name}</h4>
                    <p>@${user.username}</p>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Error loading users for new message:", error);
        userList.innerHTML = `<div class="empty-state"><p>Could not load users.</p></div>`;
    }
}

// Also, add this new function to handle starting the chat from the modal
startNewChat(userId) {
    this.hideNewMessageModal();
    this.openChat(userId);
}

    hideNewMessageModal() { document.getElementById('new-message-modal').classList.add('hidden'); }

    renderFollowButton(targetUser) {
        if (!this.currentUser) return '';
        const isSelf = targetUser._id === this.currentUser._id;
        if (isSelf) {
            return `<button class="btn btn--secondary" id="edit-profile-btn">Edit Profile</button>`;
        }
        const isFollowing = this.currentUser.following.includes(targetUser._id);
        return `
            <button class="btn ${isFollowing ? 'btn--secondary following' : 'btn--primary'} btn--sm follow-btn"
                onclick="app.toggleFollow(event, '${targetUser._id}')">
                ${isFollowing ? 'Following' : 'Follow'}
            </button>
        `;
    }

    viewUserProfile(userId) {
        this.viewingProfileId = userId;
        this.navigateToView('profile');
    }
}

window.app = new SocialConnectApp();