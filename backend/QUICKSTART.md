# 🚀 Quick Start Guide - UniSports Backend

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Environment

Create a `.env` file in the backend directory (already created with your MongoDB URI):

```env
NODE_ENV=development
PORT=5001
MONGO_URI=mongodb+srv://diluattanayake05_db_user:V63jTFURNHyWTJKu@itpm.xuxxnmn.mongodb.net/unisports?retryWrites=true&w=majority&appName=ITPM
JWT_SECRET=unisports_jwt_secret_key_2024_change_in_production
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=UniSports <noreply@unisports.com>
```

## Step 3: Seed Database (Optional)

Populate the database with sample data:

```bash
npm run seed
```

This will create:
- 1 Admin user
- 2 Coaches
- 2 Students
- 4 Sports (Basketball, Swimming, Athletics, Tennis)
- 4 Locations
- 3 Practice Sessions

### Test Credentials:

**Admin:**
- Email: `admin@unisports.com`
- Password: `admin123`

**Coach:**
- Email: `coach1@unisports.com` or `coach2@unisports.com`
- Password: `coach123`

**Student:**
- Email: `student1@unisports.com` or `student2@unisports.com`
- Password: `student123`

## Step 4: Start the Server

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The server will start on `https://unisports-8upjo.ondigitalocean.app/`

## Step 5: Test the API

### Health Check
```bash
curl https://unisports-8upjo.ondigitalocean.app/api/health
```

### Login
```bash
curl -X POST https://unisports-8upjo.ondigitalocean.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@unisports.com",
    "password": "admin123"
  }'
```

Copy the token from the response and use it in subsequent requests:

### Get All Sports (Public)
```bash
curl https://unisports-8upjo.ondigitalocean.app/api/sports
```

### Get My Profile (Protected)
```bash
curl https://unisports-8upjo.ondigitalocean.app/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📁 Project Structure Overview

```
backend/
├── config/              # Database and environment config
├── controllers/         # Request handlers
├── models/             # MongoDB schemas
├── routes/             # API routes
├── services/           # Business logic (email, notifications, clash detection)
├── middleware/         # Auth, validation, error handling
├── utils/              # Helper functions
├── server.js           # Entry point
├── seed.js             # Database seeder
├── .env               # Environment variables
└── README.md          # Documentation
```

## 🔑 Key Features Implemented

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin, Coach, Student)

✅ **Sports Management**
- CRUD operations for sports
- Coach assignment to sports

✅ **Location Management**
- CRUD operations for practice locations
- Operating hours and facilities

✅ **Practice Sessions**
- Create, update, delete sessions
- Automatic clash detection (location, coach, student)
- Time validation

✅ **Join Requests**
- Students can request to join sessions
- Coaches can accept/reject requests
- Automatic enrollment on acceptance

✅ **Notifications & Emails**
- In-app notifications
- Email notifications for:
  - Session time changes
  - Join request decisions
  - Session cancellations

✅ **Clash Detection**
- Prevents location double-booking
- Prevents student schedule overlaps
- Prevents coach schedule overlaps

## 📡 API Testing Tools

You can test the API using:
- **Postman** - Import the API_DOCS.md as reference
- **Thunder Client** (VS Code extension)
- **cURL** (terminal)
- **Insomnia**

## 🐛 Troubleshooting

### MongoDB Connection Error
- Check your `MONGO_URI` in `.env`
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify MongoDB cluster is active

### Port Already in Use
- Change the `PORT` in `.env` file
- Or kill the process using the port:
  ```bash
  lsof -ti:5001 | xargs kill -9
  ```

### Module Not Found Error
- Run `npm install` again
- Delete `node_modules` and run `npm install`

## 📚 Next Steps

1. **Test all endpoints** using Postman or Thunder Client
2. **Review the code** - all files have detailed comments
3. **Customize** as needed for your requirements
4. **Deploy** to production (Heroku, AWS, Railway, etc.)

## 🎯 For Viva Preparation

- Understand the **MVC architecture**
- Explain **clash detection logic** in services
- Demonstrate **role-based authorization**
- Show **notification and email flow**
- Explain **modular design** for future modules

---

**Ready to push to GitHub!** 🎉

For detailed API documentation, see [API_DOCS.md](./API_DOCS.md)
