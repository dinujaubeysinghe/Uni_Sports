require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sportRoutes = require('./routes/sportRoutes');
const locationRoutes = require('./routes/locationRoutes');
const locationBookingRoutes = require('./routes/locationBookingRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const eventRoutes = require('./routes/eventRoutes')
const inventoryRoutes = require('./routes/inventoryRoutes');
const equipmentRequestRoutes = require('./routes/equipmentRequestRoutes');
const merchandiseRoutes = require('./routes/merchandiseRoutes');
const registrationRoutes = require('./routes/registrationRoute');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'https://uni-sports-tau.vercel.app',
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()) : []),
];
const allowedOriginPatterns = [
  /^https:\/\/uni-sports.*\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      allowedOriginPatterns.some((pattern) => pattern.test(origin))
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Serve static files from uploads folder
app.use('/uploads', express.static('uploads'));

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Disable caching for API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'UniSports API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sports', sportRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/location-bookings', locationBookingRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events',eventRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/equipment-requests', equipmentRequestRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);


// Placeholder routes for future modules
// Uncomment and implement when Event Management module is ready
// app.use('/api/events', eventRoutes);

// Placeholder routes for future modules
// Uncomment and implement when Payment Management module is ready
// app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║       UniSports Backend Server Running                    ║
  ║                                                           ║
  ║       Mode: ${process.env.NODE_ENV || 'development'}      ║
  ║       Port: ${PORT}                                       ║
  ║                                                           ║
  ║       API Docs: http://localhost:${PORT}/                 ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
