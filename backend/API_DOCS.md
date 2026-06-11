# UniSports Backend - API Documentation

Base URL: `https://unisports-8upjo.ondigitalocean.app/api`

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student",
  "studentId": "ST001",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login
**POST** `/auth/login`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Get Current User
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

---

## Sports Endpoints

### 1. Get All Sports
**GET** `/sports?category=outdoor&page=1&limit=10`

### 2. Get Single Sport
**GET** `/sports/:id`

### 3. Create Sport (Admin Only)
**POST** `/sports`

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Body:**
```json
{
  "name": "Basketball",
  "description": "Fast-paced team sport",
  "category": "team",
  "coaches": ["coach_id_1", "coach_id_2"],
  "equipmentNeeded": ["Basketball", "Court", "Hoops"],
  "maxParticipants": 20,
  "imageUrl": "https://example.com/basketball.jpg"
}
```

### 4. Update Sport (Admin Only)
**PUT** `/sports/:id`

### 5. Delete Sport (Admin Only)
**DELETE** `/sports/:id`

---

## Locations Endpoints

### 1. Get All Locations
**GET** `/locations?type=court&page=1&limit=10`

### 2. Create Location (Admin Only)
**POST** `/locations`

**Body:**
```json
{
  "name": "Main Sports Hall",
  "type": "hall",
  "capacity": 50,
  "address": "Building A, Floor 2",
  "facilities": ["Changing rooms", "Equipment storage", "First aid"],
  "operatingHours": {
    "open": "06:00",
    "close": "22:00"
  }
}
```

---

## Practice Sessions Endpoints

### 1. Get All Sessions
**GET** `/sessions?sport=<sport_id>&startDate=2024-01-01&page=1`

### 2. Create Session (Coach Only)
**POST** `/sessions`

**Headers:**
```
Authorization: Bearer <coach-token>
```

**Body:**
```json
{
  "sport": "sport_id",
  "location": "location_id",
  "startTime": "2024-03-15T10:00:00Z",
  "endTime": "2024-03-15T12:00:00Z",
  "title": "Basketball Practice Session",
  "description": "Beginner friendly session",
  "maxParticipants": 15,
  "isRecurring": false
}
```

### 3. Update Session (Coach/Admin)
**PUT** `/sessions/:id`

**Body:**
```json
{
  "startTime": "2024-03-15T11:00:00Z",
  "endTime": "2024-03-15T13:00:00Z",
  "status": "scheduled"
}
```

### 4. Get My Sessions (Coach)
**GET** `/sessions/coach/my-sessions?status=scheduled`

### 5. Get My Enrolled Sessions (Student)
**GET** `/sessions/student/my-sessions`

---

## Join Requests Endpoints

### 1. Create Join Request (Student)
**POST** `/join-requests`

**Headers:**
```
Authorization: Bearer <student-token>
```

**Body:**
```json
{
  "sessionId": "session_id",
  "message": "I would like to join this session"
}
```

### 2. Accept/Reject Join Request (Coach)
**PUT** `/join-requests/:id`

**Headers:**
```
Authorization: Bearer <coach-token>
```

**Body:**
```json
{
  "status": "accepted",
  "responseMessage": "Welcome to the session!"
}
```

### 3. Get My Join Requests (Student)
**GET** `/join-requests/student/my-requests?status=pending`

### 4. Get Join Requests for My Sessions (Coach)
**GET** `/join-requests/coach/my-requests?status=pending`

---

## Notifications Endpoints

### 1. Get My Notifications
**GET** `/notifications?page=1&limit=20&unreadOnly=true`

**Headers:**
```
Authorization: Bearer <token>
```

### 2. Mark as Read
**PUT** `/notifications/:id/read`

### 3. Mark All as Read
**PUT** `/notifications/read-all`

### 4. Get Unread Count
**GET** `/notifications/unread/count`

### 5. Delete Notification
**DELETE** `/notifications/:id`

---

## Users Endpoints (Admin Only)

### 1. Get All Users
**GET** `/users?role=coach&search=john&page=1`

### 2. Create User
**POST** `/users`

**Body:**
```json
{
  "name": "Coach Mike",
  "email": "mike@example.com",
  "password": "password123",
  "role": "coach",
  "specialization": "Basketball",
  "phone": "+1234567890",
  "assignedSports": ["sport_id_1"]
}
```

### 3. Update User
**PUT** `/users/:id`

### 4. Delete User
**DELETE** `/users/:id`

### 5. Assign Sports to Coach
**PUT** `/users/:id/assign-sports`

**Body:**
```json
{
  "sportIds": ["sport_id_1", "sport_id_2"]
}
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Valid email is required"
    }
  ]
}
```

---

## Query Parameters

### Pagination
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Filtering
- `search`: Search by name, email, etc.
- `status`: Filter by status
- `startDate`: Filter by start date
- `category`: Filter by category
- `role`: Filter by user role

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (clash detection)
- `500` - Server Error

---

**Note:** All protected routes require `Authorization: Bearer <token>` header.
