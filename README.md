# SocialConnect - Full-Stack Social Media Web Application

  <!-- Optional: Create a GIF of your app and upload to a service like imgur to showcase it -->

**SocialConnect** is a complete, feature-rich social media web application built from the ground up. It demonstrates a full-stack development lifecycle, from a secure REST API and database management on the backend to a dynamic, interactive, and responsive user interface on the frontend.

This project was built to showcase a comprehensive understanding of modern web technologies, API design, data modeling, and UI/UX principles without relying on a large frontend framework.

---

## ✨ Key Features

*   **Full User Authentication**: Secure user registration and login system with password hashing (bcrypt) and JSON Web Token (JWT) based sessions.
*   **Dynamic Social Feed**: A real-time feed populated with posts from the user and the accounts they follow.
*   **Post Creation & Interaction**: Users can create posts with text and images, like/unlike posts (with a double-click animation), and engage in comment threads.
*   **Content Management**: Users have full control to edit and delete their own posts and comments.
*   **Social Graph (Follow System)**: A complete follow/unfollow system, laying the groundwork for private accounts and follow requests.
*   **Real-Time Search**: An instant search feature that filters users, posts, and hashtags from a pre-loaded cache for a lightning-fast experience.
*   **Discovery**: A "Trending" page that algorithmically determines popular posts (by engagement) and trending hashtags.
*   **Direct Messaging**: A real-time, one-on-one messaging system with unread message indicators.
*   **Notifications**: A working notification system for key social interactions like follows, likes, and comments.
*   **User Profiles**: Dynamic user profile pages that display a user's bio, stats (followers/following), and their posts.
*   **Admin Panel**: A protected admin view to monitor all users and posts on the platform.

---

## 🛠️ Tech Stack

This project utilizes a modern MERN-like stack, with Vanilla JavaScript taking the place of React on the frontend.

### **Backend**
*   **[Node.js](https://nodejs.org/)**: JavaScript runtime for the server.
*   **[Express.js](https://expressjs.com/)**: Fast, unopinionated, minimalist web framework for Node.js, used to build the REST API.
*   **[MongoDB](https://www.mongodb.com/)**: NoSQL database for storing all application data (users, posts, etc.).
*   **[Mongoose](https://mongoosejs.com/)**: Elegant MongoDB object modeling for Node.js, used for schema definition and data validation.
*   **[JSON Web Token (JWT)](https://jwt.io/)**: For creating secure, stateless authentication tokens.
*   **[Bcrypt.js](https://github.com/dcodeIO/bcrypt.js)**: For securely hashing user passwords.
*   **[Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)**: For basic brute-force and spam protection on sensitive endpoints.

### **Frontend**
*   **[Vanilla JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**: All frontend logic is built using modern, framework-free JavaScript, organized in a clean, class-based structure.
*   **[HTML5](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)**: For structuring the web application.
*   **[CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS)**: For all styling, utilizing modern features like Flexbox, Grid, and Custom Properties for a responsive and themeable design.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### **Prerequisites**

*   **Node.js** and **npm** installed on your machine.
*   **MongoDB** installed locally or a free **MongoDB Atlas** cluster URI.

### **Installation & Setup**

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/social-connect-project.git
    cd social-connect-project
    ```

2.  **Setup the Backend:**
    *   Navigate to the backend directory: `cd backend`
    *   Install NPM packages:
        ```sh
        npm install
        ```
    *   Create a `.env` file in the `backend` root and add the following variables:
        ```env
        PORT=5000
        MONGO_URI=your_mongodb_connection_string
        JWT_SECRET=your_super_secret_jwt_key
        ```
    *   **(Optional) Seed the database** with high-quality demo data. This will create users, posts, comments, and messages.
        ```sh
        npm run data:import
        ```

3.  **Setup the Frontend:**
    *   The frontend has no dependencies to install. It's ready to go!

### **Running the Application**

1.  **Start the Backend Server:**
    *   In your terminal, from the `backend` directory, run:
        ```sh
        npm start
        ```
    *   The server should now be running on `http://localhost:5000`.

2.  **Run the Frontend:**
    *   The easiest way is to use a live server extension. For example, the **Live Server** extension in VS Code.
    *   Right-click the `frontend/index.html` file and select "Open with Live Server".
    *   Your browser will open, and the application will be running (usually on a port like `5500`).

3.  **Demo Login Credentials:**
    *   If you seeded the database, you can log in with:
        *   **Admin User:** `alex@example.com` | `password123`
        *   **Regular User:** `maria@example.com` | `password123`

