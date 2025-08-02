# CMS System Backend API

A comprehensive Content Management System backend built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- **User Authentication & Authorization** - JWT-based auth with role-based permissions
- **Content Management** - Posts, Pages, and Media management
- **Comment System** - Nested comments with likes and moderation
- **Analytics & Activity Tracking** - User activity logs and content analytics
- **Email Integration** - Email verification and password reset
- **File Upload** - Image and media file handling
- **Real-time Features** - WebSocket integration for live updates
- **Admin Panel** - Complete administration interface
- **SEO Optimization** - Meta tags and SEO-friendly URLs

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Email**: Nodemailer
- **WebSocket**: Socket.io
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd cms-system/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the backend root:
```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/cms-system
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cms-system

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🗂 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.ts          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.ts    # Authentication logic
│   │   ├── postController.ts    # Posts management
│   │   ├── pageController.ts    # Pages management
│   │   ├── commentController.ts # Comments system
│   │   ├── mediaController.ts   # File uploads
│   │   ├── analyticsController.ts # Analytics
│   │   ├── activityController.ts # Activity logs
│   │   └── settingsController.ts # System settings
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   ├── upload.ts           # File upload handling
│   │   ├── validation.ts       # Input validation
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── errorHandler.ts     # Error handling
│   │   └── analytics.ts        # Analytics tracking
│   ├── models/
│   │   ├── User.ts             # User model
│   │   ├── Post.ts             # Post model
│   │   ├── Page.ts             # Page model
│   │   ├── Comment.ts          # Comment model
│   │   ├── Media.ts            # Media model
│   │   ├── Analytics.ts        # Analytics model
│   │   ├── Activity.ts         # Activity model
│   │   └── Settings.ts         # Settings model
│   ├── routes/
│   │   ├── auth.ts             # Authentication routes
│   │   ├── posts.ts            # Posts routes
│   │   ├── pages.ts            # Pages routes
│   │   ├── comments.ts         # Comments routes
│   │   ├── media.ts            # Media routes
│   │   ├── analytics.ts        # Analytics routes
│   │   ├── activity.ts         # Activity routes
│   │   └── settings.ts         # Settings routes
│   ├── utils/
│   │   ├── jwt.ts              # JWT utilities
│   │   └── emailService.ts     # Email utilities
│   ├── websocket/
│   │   └── websocketServer.ts  # WebSocket server
│   └── server.ts               # Express app setup
├── uploads/                    # File uploads directory
├── package.json
├── tsconfig.json
└── README.md
```

## 📡 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data (if any)
  "errors": [], // Validation errors (if any)
  "pagination": {} // Pagination info (for lists)
}
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "data": {
    "user": {
      "id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    },
    "token": "jwt_token_here"
  }
}
```

### Admin Registration
```http
POST /auth/admin-register
```
*Requires SuperAdmin authentication*

### Login
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
```

### Change Password
```http
PUT /auth/password
Authorization: Bearer <token>
```

### Upload Avatar
```http
POST /auth/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Email Verification
```http
GET /auth/verify-email?token=<verification_token>
```

### Forgot Password
```http
POST /auth/forgot-password
```

### Reset Password
```http
POST /auth/reset-password
```

### User Management (Admin/SuperAdmin)
```http
GET /auth/users                    # Get all users
GET /auth/users/:id                # Get user by ID
POST /auth/users/create            # Create user
PUT /auth/users/:id                # Update user
DELETE /auth/users/:id             # Delete user
POST /auth/users/:id/activate      # Activate user
POST /auth/users/:id/deactivate    # Deactivate user
GET /auth/pending-users            # Get pending approvals
POST /auth/approve/:id             # Approve user
POST /auth/reject/:id              # Reject user
```

---

## 📝 Posts Endpoints

### Get Posts
```http
GET /posts
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - published|draft|archived
- `author` - Author ID
- `tags` - Tag filter
- `categories` - Category filter
- `search` - Search term
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - asc|desc (default: desc)

### Get Single Post
```http
GET /posts/:id
```

### Create Post
```http
POST /posts
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Post Title",
  "slug": "post-title",
  "content": "<p>Post content here</p>",
  "excerpt": "Brief description",
  "featuredImage": "image_url",
  "category": "technology",
  "tags": ["react", "nodejs"],
  "status": "published",
  "seoTitle": "SEO Title",
  "seoDescription": "SEO Description"
}
```

### Update Post
```http
PUT /posts/:id
Authorization: Bearer <token>
```

### Delete Post
```http
DELETE /posts/:id
Authorization: Bearer <token>
```

### Toggle Post Like
```http
POST /posts/:id/like
Authorization: Bearer <token>
```

### Save Post Draft
```http
POST /posts/:id/save-draft
Authorization: Bearer <token>
```

---

## 📄 Pages Endpoints

### Get Pages
```http
GET /pages
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `status` - published|draft
- `template` - Template type
- `search` - Search term

### Get Single Page
```http
GET /pages/:id
```

### Create Page
```http
POST /pages
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Page Title",
  "slug": "page-slug",
  "content": "<p>Page content</p>",
  "template": "default",
  "status": "published",
  "showInMenu": true,
  "menuOrder": 1,
  "isHomePage": false,
  "seoTitle": "SEO Title",
  "seoDescription": "SEO Description"
}
```

### Update Page
```http
PUT /pages/:id
Authorization: Bearer <token>
```

### Delete Page
```http
DELETE /pages/:id
Authorization: Bearer <token>
```

### Get Menu Pages
```http
GET /pages/menu
```

### Get Homepage
```http
GET /pages/homepage
```

---

## 💬 Comments Endpoints

### Get Comments for Post
```http
GET /comments/:postId
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `sort` - newest|oldest|popular

### Create Comment
```http
POST /comments/:postId
Authorization: Bearer <token>
```

**Body:**
```json
{
  "content": "Comment content here",
  "parentComment": "parent_comment_id" // Optional for replies
}
```

### Toggle Comment Like
```http
POST /comments/:commentId/like
Authorization: Bearer <token>
```

### Delete Comment
```http
DELETE /comments/:commentId
Authorization: Bearer <token>
```

---

## 📁 Media Endpoints

### Upload Media
```http
POST /media/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - The file to upload
- `alt` - Alt text (optional)
- `caption` - Caption (optional)
- `folder` - Folder path (optional)

### Get Media Files
```http
GET /media
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `type` - image|video|document
- `folder` - Folder filter

### Get Media by ID
```http
GET /media/:id
Authorization: Bearer <token>
```

### Update Media
```http
PUT /media/:id
Authorization: Bearer <token>
```

### Delete Media
```http
DELETE /media/:id
Authorization: Bearer <token>
```

### Bulk Delete Media
```http
POST /media/bulk-delete
Authorization: Bearer <token>
```

**Body:**
```json
{
  "mediaIds": ["id1", "id2", "id3"]
}
```

### Get Media Statistics
```http
GET /media/stats
Authorization: Bearer <token>
```

---

## 📊 Analytics Endpoints

### Dashboard Overview
```http
GET /analytics/overview
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `period` - day|week|month|year

### Content Performance
```http
GET /analytics/content
Authorization: Bearer <token>
```

### Traffic Analytics
```http
GET /analytics/traffic
Authorization: Bearer <token>
```

### User Analytics
```http
GET /analytics/users
Authorization: Bearer <token>
```

### Media Analytics
```http
GET /analytics/media
Authorization: Bearer <token>
```

### Search Analytics
```http
GET /analytics/search
Authorization: Bearer <token>
```

### Export Analytics
```http
GET /analytics/export
Authorization: Bearer <token>
```

---

## 📋 Activity Endpoints

### Get Recent Activities
```http
GET /activity
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `type` - system|user|content
- `userId` - Filter by user
- `startDate` - Start date
- `endDate` - End date

### Get Activity Statistics
```http
GET /activity/stats
Authorization: Bearer <token>
```

---

## ⚙️ Settings Endpoints

### Get System Settings
```http
GET /settings
Authorization: Bearer <token>
```

### Update System Settings
```http
PUT /settings
Authorization: Bearer <token>
```

**Body:**
```json
{
  "siteName": "My CMS Site",
  "siteDescription": "A powerful content management system",
  "siteUrl": "https://mysite.com",
  "adminEmail": "admin@mysite.com",
  "allowRegistration": true,
  "requireEmailVerification": true,
  "commentsEnabled": true,
  "commentsRequireApproval": false,
  "maxFileSize": 10485760,
  "allowedFileTypes": ["jpg", "jpeg", "png", "pdf"],
  "theme": "default",
  "timezone": "UTC",
  "dateFormat": "YYYY-MM-DD",
  "postsPerPage": 10
}
```

### Reset Settings
```http
POST /settings/reset
Authorization: Bearer <token>
```

### Upload Site Logo
```http
POST /settings/logo
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

### Test Email Configuration
```http
POST /settings/test-email
Authorization: Bearer <token>
```

---

## 🔒 Authentication & Authorization

### User Roles
- **user** - Basic user with limited permissions
- **editor** - Can create and edit content
- **admin** - Full content management access
- **superadmin** - Complete system access

### Permission Matrix

| Action | User | Editor | Admin | SuperAdmin |
|--------|------|--------|-------|------------|
| View published content | ✅ | ✅ | ✅ | ✅ |
| Create posts | ❌ | ✅ | ✅ | ✅ |
| Edit own posts | ❌ | ✅ | ✅ | ✅ |
| Edit any posts | ❌ | ❌ | ✅ | ✅ |
| Delete posts | ❌ | ❌ | ✅ | ✅ |
| Manage pages | ❌ | ❌ | ✅ | ✅ |
| Upload media | ❌ | ✅ | ✅ | ✅ |
| Manage comments | ❌ | ❌ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| System settings | ❌ | ❌ | ❌ | ✅ |

### JWT Token Format
```json
{
  "id": "user_id",
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## 🔧 Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    }
  ]
}
```

---

## 🚀 WebSocket Events

### Connection
```javascript
// Client connection
const socket = io('http://localhost:5000');

// Server events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

### Real-time Events
- `new_comment` - New comment posted
- `comment_liked` - Comment liked
- `post_liked` - Post liked
- `user_activity` - User activity update
- `content_updated` - Content changes

---

## 📈 Rate Limiting

### Default Limits
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 login attempts per 15 minutes
- **File Upload**: 10 uploads per hour
- **Comments**: 10 comments per hour per user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## 🛡️ Security Features

- **JWT Authentication** with secure tokens
- **Password Hashing** using bcrypt
- **Input Validation** with express-validator
- **SQL Injection Protection** via Mongoose
- **XSS Protection** with helmet
- **CORS Configuration** for cross-origin requests
- **Rate Limiting** to prevent abuse
- **File Upload Security** with type/size validation
- **Environment Variables** for sensitive data

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## 📊 Monitoring & Logging

### Logging Levels
- `error` - Error messages
- `warn` - Warning messages
- `info` - Informational messages
- `debug` - Debug messages

### Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User login successful",
  "userId": "user_id",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
# ... other production configs
```

### PM2 Configuration
```json
{
  "name": "cms-backend",
  "script": "dist/server.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.