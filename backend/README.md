# UniSports Backend - Sports Management Module

University Sports Management System (UniSport) - Backend API for Sports Module

## 🎯 Overview

This is the **Sports Management Module** backend for the University Sports Management System. It provides REST APIs for managing sports, practice sessions, locations, and join requests. The system supports three user roles: Admin, Coach, and Student.

**Note:** This module is part of a larger system. Event Management and Payment Management modules will be integrated later.

## 🏗️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs
- **Email Service:** NodeMailer
- **Validation:** express-validator

## 📁 Project Structure

```
backend/
├── config/           # Configuration files (database, environment)
├── controllers/      # Request handlers (business logic)
├── models/          # MongoDB schemas (User, Sport, Session, etc.)
├── routes/          # API route definitions
├── services/        # Reusable business logic (email, notifications, clash detection)
├── middleware/      # Custom middleware (auth, error handling, validation)
├── utils/           # Helper functions
├── .env             # Environment variables
├── .env.example     # Environment variables template
├── server.js        # Application entry point
└── package.json     # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the following:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `EMAIL_*`: Email service credentials (for NodeMailer)

3. **Start the server:**
   ```bash
   # Development mode (auto-reload)
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `https://unisports-8upjo.ondigitalocean.app/` (or the port specified in `.env`)

## 📡 API Endpoints

### Authentication (`/api/auth`)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/profile` - Update profile (Protected)
- `PUT /api/auth/change-password` - Change password (Protected)

### Users (`/api/users`) - Admin Only

- `GET /api/users` - Get all users (with filters)
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PUT /api/users/:id/assign-sports` - Assign sports to coach

### Sports (`/api/sports`)

- `GET /api/sports` - Get all sports (Public)
- `GET /api/sports/:id` - Get single sport (Public)
- `POST /api/sports` - Create sport (Admin)
- `PUT /api/sports/:id` - Update sport (Admin)
- `DELETE /api/sports/:id` - Delete sport (Admin)
- `GET /api/sports/categories/list` - Get sport categories (Public)

### Locations (`/api/locations`)

- `GET /api/locations` - Get all locations (Public)
- `GET /api/locations/:id` - Get single location (Public)
- `POST /api/locations` - Create location (Admin)
- `PUT /api/locations/:id` - Update location (Admin)
- `DELETE /api/locations/:id` - Delete location (Admin)
- `GET /api/locations/types/list` - Get location types (Public)

### Practice Sessions (`/api/sessions`)

- `GET /api/sessions` - Get all sessions (Public)
- `GET /api/sessions/:id` - Get single session (Public)
- `POST /api/sessions` - Create session (Coach)
- `PUT /api/sessions/:id` - Update session (Coach/Admin)
- `DELETE /api/sessions/:id` - Delete session (Coach/Admin)
- `GET /api/sessions/coach/my-sessions` - Get coach's sessions (Coach)
- `GET /api/sessions/student/my-sessions` - Get enrolled sessions (Student)

### Join Requests (`/api/join-requests`)

- `GET /api/join-requests` - Get all requests (Coach/Admin)
- `GET /api/join-requests/:id` - Get single request (Protected)
- `POST /api/join-requests` - Create request (Student)
- `PUT /api/join-requests/:id` - Accept/Reject request (Coach)
- `DELETE /api/join-requests/:id` - Delete request (Student/Admin)
- `GET /api/join-requests/student/my-requests` - Get my requests (Student)
- `GET /api/join-requests/coach/my-requests` - Get requests for my sessions (Coach)

### Notifications (`/api/notifications`)

- `GET /api/notifications` - Get user notifications (Protected)
- `PUT /api/notifications/:id/read` - Mark as read (Protected)
- `PUT /api/notifications/read-all` - Mark all as read (Protected)
- `DELETE /api/notifications/:id` - Delete notification (Protected)
- `GET /api/notifications/unread/count` - Get unread count (Protected)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 👥 User Roles

1. **Admin**
   - Full CRUD access to sports, locations, users
   - Can manage all sessions and requests
   - User management capabilities

2. **Coach**
   - Create and manage practice sessions
   - Book locations for sessions
   - Accept/reject student join requests
   - View enrolled students

3. **Student**
   - Browse available sports and sessions
   - Send join requests to coaches
   - View enrolled sessions
   - Receive notifications

## 🔔 Notifications & Emails

The system automatically sends notifications and emails for:
- Session time changes (to enrolled students)
- Join request acceptance/rejection (to students)
- Session cancellations (to enrolled students)

## ⚠️ Clash Detection

The system prevents:
- **Location clashes:** Same location cannot be booked for overlapping times
- **Student clashes:** Students cannot enroll in overlapping sessions
- **Coach clashes:** Coaches cannot have overlapping sessions

## 🧪 Testing

You can test the API using:
- Postman
- Thunder Client (VS Code extension)
- cURL
- Any REST client

A Postman collection can be created with sample requests.

## 📝 Data Models

### User
- name, email, password, role
- assignedSports (for coaches)
- studentId, specialization, phone
- isActive status

### Sport
- name, description, category
- coaches, equipmentNeeded
- maxParticipants, imageUrl

### Location
- name, type, capacity, address
- facilities, operatingHours
- isAvailable status

### PracticeSession
- sport, coach, location
- startTime, endTime, status
- enrolledStudents
- maxParticipants

### JoinRequest
- session, student, coach
- status (pending/accepted/rejected)
- message, responseMessage

### Notification
- recipient, type, title, message
- relatedSession, relatedSport
- isRead status

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=UniSports <noreply@unisports.com>
```

## 🚧 Future Modules (Placeholders)

The architecture is designed to be modular. Future modules include:

- **Event Management Module** (`/api/events`)
  - Competitions, tournaments, event registration
  
- **Payment Management Module** (`/api/payments`)
  - Membership fees, event fees, payment tracking

## 📚 Code Documentation

All code includes inline comments explaining:
- Purpose of functions and methods
- Business logic decisions
- Validation rules
- Potential edge cases

This documentation is useful for code reviews and viva presentations.

## 🐛 Error Handling

The API uses centralized error handling with:
- Custom error classes
- Consistent error response format
- Validation error messages
- Development vs production error details

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based authorization
- Input validation and sanitization
- MongoDB injection prevention

## 📄 License

This project is part of an academic assignment.

## 👨‍💻 Author

ITPM Module - Sports Management Backend

---

**Ready for GitHub push and deployment!**
