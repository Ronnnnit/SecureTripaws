const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const bcrypt = require('bcrypt');
const port = 3000;

// Import package data
const packagesData = require('./FiaibnbDemo/assets/js/data.js');

// --- MongoDB Setup ---
mongoose.connect('mongodb+srv://ronitmunde29:ronnnnit@fairbnbdemo.7a0ntoi.mongodb.net/?retryWrites=true&w=majority&appName=FairbnbDemo', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- MongoDB Schemas ---
// User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  createdAt: { type: Date, default: Date.now },
  preferences: {
    budget_range: { min: Number, max: Number },
    destination_types: [String], // beach, mountain, city, adventure, etc.
    travel_style: String, // luxury, budget, backpacking, family, etc.
    interests: [String] // food, culture, nature, nightlife, etc.
  }
});

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
  user_email: String,
  package_id: String,
  package_name: String,
  amount: Number,
  date: Date
});

//Booking Schema
const BookingSchema = new mongoose.Schema({
  userId: String,
  packages: Array,
  total: Number,
  date: { type: Date, default: Date.now },
  pickup_location: String,
  transport_mode: String,
  stay_option: String,
  room_type: String,
  guests: Number,
  payment_status: { type: String, default: 'Pending' },
  paid_at: Date,
  payment_method: String,
  start_date: Date,
  end_date: Date,
  status: { type: String, default: 'Active' } // Active, Cancelled, Completed
});

// Package Schema - Updated to match data.js structure
const PackageSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  duration: { type: Number, default: 7 }, // days, default 7
  theme: { type: String, default: 'general' }, // adventure, luxury, family, etc.
  rating: { type: Number, default: 4.5 },
  review_count: { type: Number, default: 0 },
  is_trending: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

// Cart Schema
const CartSchema = new mongoose.Schema({
  userId: String,
  items: [{
    package_id: String,
    package_name: String,
    price: Number,
    quantity: Number,
    added_at: { type: Date, default: Date.now }
  }],
  total: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

// Payment Schema
const PaymentSchema = new mongoose.Schema({
  booking_id: String,
  user_id: String,
  amount: Number,
  status: { type: String, default: 'Pending' }, // Pending, Completed, Failed, Refunded
  payment_method: String,
  transaction_id: String,
  created_at: { type: Date, default: Date.now },
  completed_at: Date
});

// Alert Schema
const AlertSchema = new mongoose.Schema({
  user_id: String,
  type: String, // price_drop, reminder
  package_id: String,
  target_price: Number,
  reminder_date: Date,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

// Group Booking Schema
const GroupBookingSchema = new mongoose.Schema({
  group_leader_id: String,
  members: [{
    user_id: String,
    email: String,
    status: { type: String, default: 'Pending' } // Pending, Accepted, Declined
  }],
  booking_id: String,
  created_at: { type: Date, default: Date.now }
});

// Gift Schema
const GiftSchema = new mongoose.Schema({
  gifter_id: String,
  recipient_email: String,
  booking_id: String,
  message: String,
  status: { type: String, default: 'Pending' }, // Pending, Accepted, Declined
  created_at: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', BookingSchema);
const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Package = mongoose.model('Package', PackageSchema);
const Cart = mongoose.model('Cart', CartSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const Alert = mongoose.model('Alert', AlertSchema);
const GroupBooking = mongoose.model('GroupBooking', GroupBookingSchema);
const Gift = mongoose.model('Gift', GiftSchema);

// --- API Logs Storage (In-Memory) ---
const apiLogs = [];
const MAX_LOGS = 1000; // Keep last 1000 logs

// --- API Logging Middleware ---
const apiLogger = (req, res, next) => {
  // Define functional API routes to track
  const functionalApiRoutes = [
    '/api/bookings',
    '/api/history', 
    '/api/login',
    '/api/register',
    '/api/auth',
    '/api/data',
    '/api/users',
    '/api/packages',
    '/api/cart',
    '/api/payments',
    '/api/alerts',
    '/api/group-bookings',
    '/api/share',
    '/api/gift',
    '/generate-token'
  ];

  // Check if this is a functional API request
  const isFunctionalApiRequest = functionalApiRoutes.some(route => {
    if (route === '/api/bookings' || route === '/api/users' || route === '/api/packages' || 
        route === '/api/cart' || route === '/api/payments' || route === '/api/alerts' ||
        route === '/api/group-bookings' || route === '/api/share' || route === '/api/gift' ||
        route === '/api/auth') {
      return req.originalUrl.startsWith(route);
    }
    return req.originalUrl === route;
  });

  // Skip logging for non-functional requests (static files, page loads, etc.)
  if (!isFunctionalApiRequest) {
    return next();
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Capture request details
  const requestLog = {
    id: Date.now() + Math.random(),
    method: req.method,
    url: req.originalUrl,
    timestamp: timestamp,
    source: req.originalUrl === '/generate-token' ? 'DevRev API' : 'Fairbnb server.js',
    statusCode: null,
    responseTime: null,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown'
  };

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    requestLog.statusCode = res.statusCode;
    requestLog.responseTime = endTime - startTime;
    
    // Add to logs array
    apiLogs.push(requestLog);
    
    // Keep only the last MAX_LOGS entries
    if (apiLogs.length > MAX_LOGS) {
      apiLogs.splice(0, apiLogs.length - MAX_LOGS);
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// --- Array to Text Conversion Utilities ---
function convertArrayToText(arr) {
  if (Array.isArray(arr)) {
    return arr.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item.name || item.title || JSON.stringify(item);
      }
      return item;
    }).join(', ');
  }
  if (typeof arr === 'string' && arr.includes(',')) {
    return arr; // Already converted
  }
  return arr;
}

function convertTextToArray(text) {
  if (typeof text === 'string' && text.trim()) {
    return text.split(',').map(item => item.trim()).filter(item => item);
  }
  if (Array.isArray(text)) {
    return text;
  }
  return [];
}

// Middleware to convert array fields to text for AI agent compatibility
const arrayToTextMiddleware = (req, res, next) => {
  if (req.body) {
    // Convert user preferences arrays
    if (req.body.preferences) {
      if (req.body.preferences.destination_types) {
        req.body.preferences.destination_types = convertArrayToText(req.body.preferences.destination_types);
      }
      if (req.body.preferences.interests) {
        req.body.preferences.interests = convertArrayToText(req.body.preferences.interests);
      }
    }
    
    // Convert packages array
    if (req.body.packages) {
      req.body.packages = convertArrayToText(req.body.packages);
    }
    
    // Convert cart items array
    if (req.body.items) {
      req.body.items = convertArrayToText(req.body.items);
    }
    
    // Convert group members array
    if (req.body.members) {
      req.body.members = convertArrayToText(req.body.members);
    }
    
    // Convert shared emails array
    if (req.body.shared_with_emails) {
      req.body.shared_with_emails = convertArrayToText(req.body.shared_with_emails);
    }
  }
  next();
};

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(arrayToTextMiddleware); // Add array to text conversion middleware
app.use(apiLogger); // Add API logging middleware

// Serve static files from the FiaibnbDemo directory
app.use(express.static('FiaibnbDemo'));

// Serve the main index.html file at the root route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/index.html');
});

// Serve other HTML pages
app.get('/packages', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/packages.html');
});

app.get('/cart', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/cart.html');
});

app.get('/checkout', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/checkout.html');
});

app.get('/confirmation', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/confirmation.html');
});

app.get('/history', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/history.html');
});

app.get('/signin', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/signin.html');
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/register.html');
});

app.get('/api-debug', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/api-debug.html');
});

app.get('/test-widget', (req, res) => {
    res.sendFile(__dirname + '/FiaibnbDemo/test-widget.html');
});

// --- DevRev API Token Generation ---
const DEVREV_AAT = 'eyJhbGciOiJSUzI1NiIsImlzcyI6Imh0dHBzOi8vYXV0aC10b2tlbi5kZXZyZXYuYWkvIiwia2lkIjoic3RzX2tpZF9yc2EiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOlsiamFudXMiXSwiYXpwIjoiZG9uOmlkZW50aXR5OmR2cnYtaW4tMTpkZXZvLzJPSkJ0bFN3a2s6ZGV2dS8xNiIsImV4cCI6MTg0OTI2MzY0MCwiaHR0cDovL2RldnJldi5haS9jbGllbnRpZCI6ImRvbjppZGVudGl0eTpkdnJ2LWluLTE6ZGV2by8yT0pCdGxTd2trOnN2Y2FjYy85MSIsImh0dHA6Ly9kZXZyZXYuYWkvZGV2b19kb24iOiJkb246aWRlbnRpdHk6ZHZydi1pbi0xOmRldm8vMk9KQnRsU3drayIsImh0dHA6Ly9kZXZyZXYuYWkvZGV2b2lkIjoiREVWLTJPSkJ0bFN3a2siLCJodHRwOi8vZGV2cmV2LmFpL3N2Y2FjYyI6ImRvbjppZGVudGl0eTpkdnJ2LWluLTE6ZGV2by8yT0pCdGxTd2trOnN2Y2FjYy85MSIsImh0dHA6Ly9kZXZyZXYuYWkvdG9rZW50eXBlIjoidXJuOmRldnJldjpwYXJhbXM6b2F1dGg6dG9rZW4tdHlwZTphYXQiLCJpYXQiOjE3NTQ2NTU2NDAsImlzcyI6Imh0dHBzOi8vYXV0aC10b2tlbi5kZXZyZXYuYWkvIiwianRpIjoiZG9uOmlkZW50aXR5OmR2cnYtaW4tMTpkZXZvLzJPSkJ0bFN3a2s6dG9rZW4vMUFTeVhHc2NlIiwic3ViIjoiZG9uOmlkZW50aXR5OmR2cnYtaW4tMTpkZXZvLzJPSkJ0bFN3a2s6c3ZjYWNjLzkxIn0.pfM9TGipDHDOkm2t1Rdlkz5XSomTzFzX4mUSmgOfCbpDHeOQYBc99TVQjhYJpF6I9GG9NFW-KYWOHsu1HBQiwgrWJitglVq6oQufVsQlY7iu0HhtzPDyBpDINlm8H4wTuabb_ReJilsy5Cr6X3EgvaaQs5sjpRH7myqTfgeJs84P5wZxYHj4LmrOpWT3cWdd4h-c4ElygAdZ3Yb-FoWbPaAdJIUi2CFLQbNJ-DaZBLHZ_tZtzTC6FfqpVZ8v5G-uqu-JZ6X4ck1PcCcGBcJ1-8KKuJd4B3G_c6T3BbH40r7RSEQZZohzztIBiTvRZGoG1-fjao9RKPALbX3cpVK0lQ';

app.post('/generate-token', async (req, res) => {
  const { email, display_name } = req.body;

  try {
    const payload = {
      rev_info: {
        user_ref: email,
        account_ref: "sk.com",
        workspace_ref: "devrev-workspace",
        user_traits: {
          email: email,
          display_name: display_name
        },
        workspace_traits: {
          display_name: "Devrev Workspace",
        },
        account_traits: {
          display_name: "Securekloud Infosolutions",
          domains: ["Securekloudinfosolutions.com"]
        }
      }
    };
    
    const response = await axios.post('https://api.devrev.ai/auth-tokens.create', payload, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': `Bearer ${DEVREV_AAT}`,
        'content-type': 'application/json'
      }
    });
    console.log("Full Response from DevRev:", response.data);
    res.json({ session_token: response.data.access_token });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

// --- User Registration ---
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log("Received registration data:", req.body);
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error("Registration failed:", err);
    if (err.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
});

// --- User Login ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    res.status(200).json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Get Current User ID ---
app.get('/api/auth/me', async (req, res) => {
  try {
    // Get user ID from query parameter (sent by frontend)
    const { userId, email } = req.query;
    
    let user = null;

    // Method 1: If userId is provided, find by ID
    if (userId) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ 
          message: 'Invalid user ID format',
          error: 'INVALID_USER_ID_FORMAT'
        });
      }

      user = await User.findById(userId).select('-password');
    }
    // Method 2: If email is provided, find by email
    else if (email) {
      user = await User.findOne({ email }).select('-password');
    }
    // Method 3: If neither provided, return error
    else {
      return res.status(400).json({ 
        message: 'Either userId or email is required',
        error: 'MISSING_IDENTIFIER'
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Return user information
    res.status(200).json({
      success: true,
      message: 'User found successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        preferences: user.preferences
      }
    });

  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// --- Get User ID by Email ---
app.get('/api/auth/user-id', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        message: 'Email is required',
        error: 'MISSING_EMAIL'
      });
    }

    // Find user by email and return only the ID
    const user = await User.findOne({ email }).select('_id name email');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }

    // Return just the user ID and basic info
    res.status(200).json({
      success: true,
      message: 'User ID found successfully',
      userId: user._id,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Error fetching user ID:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// API route to get bookings by userId (query parameter)
app.get('/api/bookings', async (req, res) => {
  const { userId } = req.query;
  try {
    const bookings = await Booking.find({ userId });
    
    // Convert packages arrays to text for AI agent response
    const responseBookings = bookings.map(booking => {
      const responseBooking = { ...booking.toObject() };
      if (responseBooking.packages) {
        responseBooking.packages = convertArrayToText(responseBooking.packages);
      }
      return responseBooking;
    });
    
    res.json(responseBookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//fetch the bookings data - ALL BOOKINGS
app.get('/api/bookings/all', async (req, res) => {
  try {
    const bookings = await Booking.find({});
    
    // Convert packages arrays to text for AI agent response
    const responseBookings = bookings.map(booking => {
      const responseBooking = { ...booking.toObject() };
      if (responseBooking.packages) {
        responseBooking.packages = convertArrayToText(responseBooking.packages);
      }
      return responseBooking;
    });
    
    res.json(responseBookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all bookings' });
  }
});

// Specific routes must come before parameterized routes
// GET /api/bookings/summary - Get booking summary
app.get('/api/bookings/summary', async (req, res) => {
  const { userId } = req.query;

  try {
    const bookings = await Booking.find({ userId });
    const totalTrips = bookings.length;
    const totalSpend = bookings.reduce((sum, booking) => sum + booking.total, 0);
    const completedTrips = bookings.filter(b => b.status === 'Completed').length;

    res.json({
      totalTrips,
      totalSpend,
      completedTrips,
      averageSpend: totalTrips > 0 ? totalSpend / totalTrips : 0
    });
  } catch (error) {
    console.error('Error fetching booking summary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/bookings/spending - Get spending breakdown
app.get('/api/bookings/spending', async (req, res) => {
  const { userId, from, to } = req.query;

  try {
    // Build date filter if provided
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    
    const query = { userId };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const bookings = await Booking.find(query);
    const spendingByMonth = {};
    const spendingByCategory = {
      flights: 0,
      hotel: 0,
      activities: 0,
      food: 0,
      transport: 0
    };
    
    bookings.forEach(booking => {
      const month = booking.date.toISOString().substring(0, 7); // YYYY-MM
      spendingByMonth[month] = (spendingByMonth[month] || 0) + booking.total;
      
      // Categorize spending based on transport mode and stay option
      if (booking.transport_mode === 'flight') {
        spendingByCategory.flights += booking.total * 0.4; // 40% for flights
      }
      if (booking.stay_option === 'hotel' || booking.stay_option === 'resort') {
        spendingByCategory.hotel += booking.total * 0.3; // 30% for accommodation
      }
      spendingByCategory.activities += booking.total * 0.2; // 20% for activities
      spendingByCategory.food += booking.total * 0.1; // 10% for food
    });

    res.json({
      currency: "INR",
      by_month: spendingByMonth,
      by_category: spendingByCategory
    });
  } catch (error) {
    console.error('Error fetching spending breakdown:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/bookings/frequent-destinations - Get top destinations
app.get('/api/bookings/frequent-destinations', async (req, res) => {
  const { userId, limit = 5 } = req.query;

  try {
    const bookings = await Booking.find({ userId });
    const destinations = {};
    
    bookings.forEach(booking => {
      booking.packages.forEach(pkg => {
        const location = pkg.location || 'Unknown';
        destinations[location] = (destinations[location] || 0) + 1;
      });
    });

    const sortedDestinations = Object.entries(destinations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([destination, count]) => ({ destination, count }));

    res.json(sortedDestinations);
  } catch (error) {
    console.error('Error fetching frequent destinations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// API route to get bookings by userId (path parameter) - must come after specific routes
app.get('/api/bookings/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const bookings = await Booking.find({ userId });
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST route to save a booking
app.post('/api/bookings', async (req, res) => {
  // Support both JSON body and query parameters for AI agent compatibility
  let bookingData = req.body;
  
  // If no body data, try to get from query parameters
  if (!bookingData || Object.keys(bookingData).length === 0) {
    bookingData = {
      userId: req.query.userId,
      packages: req.query.packages,
      total: req.query.total ? Number(req.query.total) : undefined,
      pickup_location: req.query.pickup_location,
      transport_mode: req.query.transport_mode,
      stay_option: req.query.stay_option,
      room_type: req.query.room_type,
      guests: req.query.guests ? Number(req.query.guests) : undefined,
      // Accept single-package style params (id/title/location/price/image/quantity)
      id: req.query.id,
      title: req.query.title,
      location: req.query.location,
      price: req.query.price ? Number(req.query.price) : undefined,
      image: req.query.image,
      quantity: req.query.quantity ? Number(req.query.quantity) : undefined,
      // Optional payment/status fields
      payment_status: req.query.payment_status,
      paid_at: req.query.paid_at,
      payment_method: req.query.payment_method,
      status: req.query.status
    };
  }

  const { 
    userId, 
    packages, 
    total, 
    pickup_location, 
    transport_mode, 
    stay_option, 
    room_type, 
    guests,
    id: singleId,
    title: singleTitle,
    location: singleLocation,
    price: singlePrice,
    image: singleImage,
    quantity: singleQuantity,
    payment_status: inputPaymentStatus,
    paid_at: inputPaidAt,
    payment_method: inputPaymentMethod,
    status: inputStatus
  } = bookingData;

  // Build packages if caller sent single package fields instead of packages
  let computedPackages = packages;
  if (!computedPackages && (singleId || singleTitle || singlePrice)) {
    if (!singleTitle || !singlePrice) {
      return res.status(400).json({ error: 'Invalid booking data: title and price are required when using single item fields' });
    }
    computedPackages = [{
      id: String(singleId ?? `pkg_${Date.now()}`),
      name: singleTitle,
      title: singleTitle,
      location: singleLocation,
      price: Number(singlePrice),
      quantity: Number(singleQuantity || 1),
      image: singleImage
    }];
  }

  // Determine final total if not provided
  let finalTotal = total;
  if ((finalTotal === undefined || isNaN(finalTotal)) && computedPackages) {
    try {
      let pkgArray = computedPackages;
      if (typeof pkgArray === 'string') {
        try { pkgArray = JSON.parse(pkgArray); } catch { /* will handle below */ }
      }
      if (typeof pkgArray === 'string') {
        const names = convertTextToArray(pkgArray);
        pkgArray = names.map((name, index) => ({ id: `pkg_${Date.now()}_${index}`, name: name.trim(), price: 0, quantity: 1 }));
      }
      finalTotal = pkgArray.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    } catch {
      // ignore, will validate below
    }
  }

  if (!userId || !computedPackages || finalTotal === undefined || isNaN(finalTotal)) {
    return res.status(400).json({ error: 'Invalid booking data' });
  }

  try {
    // Convert packages text back to array for database storage
    let processedPackages = computedPackages;
    if (typeof processedPackages === 'string') {
      // Try to parse as JSON first, if that fails, treat as comma-separated text
      try {
        processedPackages = JSON.parse(processedPackages);
      } catch {
        // If not JSON, treat as comma-separated text and create package objects
        const packageNames = convertTextToArray(processedPackages);
        processedPackages = packageNames.map((name, index) => ({
          id: `pkg_${Date.now()}_${index}`,
          name: name.trim(),
          price: 0, // Default price, should be provided separately
          quantity: 1
        }));
      }
    }

    const newBooking = new Booking({ 
      userId, 
      packages: processedPackages, 
      total: finalTotal,
      pickup_location,
      transport_mode,
      stay_option,
      room_type,
      guests,
      // Allow optional overrides if sent
      payment_status: inputPaymentStatus || undefined,
      paid_at: inputPaidAt ? new Date(inputPaidAt) : undefined,
      payment_method: inputPaymentMethod || undefined,
      status: inputStatus || undefined
    });
    const savedBooking = await newBooking.save();
    
    // Convert packages back to text for AI agent response
    const responseBooking = { ...savedBooking.toObject() };
    responseBooking.packages = convertArrayToText(responseBooking.packages);
    
    res.status(201).json({ message: 'Booking saved', bookingId: savedBooking._id, booking: responseBooking });
  } catch (err) {
    console.error('Error saving booking:', err);
    res.status(500).json({ error: 'Failed to save booking' });
  }
});

// PUT route to update payment status
app.put('/api/bookings/:id/payment', async (req, res) => {
  const bookingId = req.params.id;
  const { payment_status, payment_method } = req.body;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const updateData = { payment_status };
    if (payment_method) updateData.payment_method = payment_method;
    if (payment_status === 'Paid') updateData.paid_at = new Date();

    const result = await Booking.findByIdAndUpdate(
      bookingId, 
      updateData, 
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({ message: 'Payment status updated', booking: result });
  } catch (error) {
    console.error('Payment update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;

  try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
          return res.status(400).json({ error: 'Invalid booking ID format' });
      }

      const result = await Booking.findByIdAndDelete(bookingId);

      if (!result) {
          return res.status(404).json({ error: 'Booking not found' });
      }

      res.status(200).json({ message: 'Booking deleted successfully' });
  } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

//fetch the user data
app.get('/api/data', async (req, res) => {
  try {
    const users = await User.find({});
    const transactions = await Transaction.find({});
    const bookings = await Booking.find({});

    res.json({
      users,
      transactions,
      bookings
    });
  } catch (err) {
    console.error('Error fetching combined data:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Get specific booking details by booking ID
app.get('/api/bookings/details/:bookingId', async (req, res) => {
  const { bookingId } = req.params;

  try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
          return res.status(400).json({ error: 'Invalid booking ID format' });
      }

      const booking = await Booking.findById(bookingId);

      if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
      }

      res.status(200).json(booking);
  } catch (error) {
      console.error('Error fetching booking:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===== NEW AI-POWERED TRAVEL ASSISTANT APIs =====

// 1. BOOKING ENHANCEMENTS
// PUT /api/bookings/:id - Update booking details
app.put('/api/bookings/:id', async (req, res) => {
  const bookingId = req.params.id;
  const updateData = req.body;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const result = await Booking.findByIdAndUpdate(
      bookingId, 
      updateData, 
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.status(200).json({ message: 'Booking updated successfully', booking: result });
  } catch (error) {
    console.error('Booking update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/bookings/:id/rebook - Duplicate booking with new dates
app.post('/api/bookings/:id/rebook', async (req, res) => {
  const originalBookingId = req.params.id;
  const { start_date, end_date, guests } = req.body;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(originalBookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const originalBooking = await Booking.findById(originalBookingId);
    if (!originalBooking) {
      return res.status(404).json({ error: 'Original booking not found' });
    }

    const newBooking = new Booking({
      ...originalBooking.toObject(),
      _id: undefined,
      start_date: start_date || originalBooking.start_date,
      end_date: end_date || originalBooking.end_date,
      guests: guests || originalBooking.guests,
      payment_status: 'Pending',
      paid_at: undefined,
      date: new Date()
    });

    const savedBooking = await newBooking.save();
    res.status(201).json({ message: 'Booking rebooked successfully', bookingId: savedBooking._id });
  } catch (error) {
    console.error('Rebooking error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. USER & PREFERENCES
// GET /api/users/:id - Get user profile
app.get('/api/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert arrays to text for AI agent response
    const responseUser = { ...user.toObject() };
    if (responseUser.preferences) {
      if (responseUser.preferences.destination_types) {
        responseUser.preferences.destination_types = convertArrayToText(responseUser.preferences.destination_types);
      }
      if (responseUser.preferences.interests) {
        responseUser.preferences.interests = convertArrayToText(responseUser.preferences.interests);
      }
    }

    res.status(200).json(responseUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/users/:id/preferences - Update user preferences
app.put('/api/users/:id/preferences', async (req, res) => {
  const userId = req.params.id;
  
  // Support both JSON body and query parameters for AI agent compatibility
  let preferences = req.body;
  
  // If no body data, try to get from query parameters
  if (!preferences || Object.keys(preferences).length === 0) {
    preferences = {};
    
    // Extract from query parameters
    if (req.query.budget_range) {
      const budgetRange = req.query.budget_range;
      if (budgetRange.includes('-')) {
        const [min, max] = budgetRange.split('-').map(Number);
        preferences.budget_range = { min, max };
      } else {
        preferences.budget_range = { min: Number(budgetRange), max: Number(budgetRange) };
      }
    }
    
    if (req.query.destination_types) {
      preferences.destination_types = req.query.destination_types;
    }
    
    if (req.query.travel_style) {
      preferences.travel_style = req.query.travel_style;
    }
    
    if (req.query.interests) {
      preferences.interests = req.query.interests;
    }
    
  }

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Convert text back to arrays for database storage
    const processedPreferences = { ...preferences };
    if (preferences.destination_types && typeof preferences.destination_types === 'string') {
      processedPreferences.destination_types = convertTextToArray(preferences.destination_types);
    }
    if (preferences.interests && typeof preferences.interests === 'string') {
      processedPreferences.interests = convertTextToArray(preferences.interests);
    }

    const result = await User.findByIdAndUpdate(
      userId,
      { preferences: processedPreferences },
      { new: true }
    ).select('-password');

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert arrays back to text for AI agent response
    const responseUser = { ...result.toObject() };
    if (responseUser.preferences) {
      if (responseUser.preferences.destination_types) {
        responseUser.preferences.destination_types = convertArrayToText(responseUser.preferences.destination_types);
      }
      if (responseUser.preferences.interests) {
        responseUser.preferences.interests = convertArrayToText(responseUser.preferences.interests);
      }
    }

    res.status(200).json({ message: 'Preferences updated successfully', user: responseUser });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PACKAGES
// POST /api/packages/populate - Populate database with packages from data.js
app.post('/api/packages/populate', async (req, res) => {
  try {
    // Clear existing packages
    await Package.deleteMany({});
    
    // Insert packages from data.js
    const packagesToInsert = packagesData.map(pkg => ({
      id: pkg.id,
      title: pkg.title,
      location: pkg.location,
      description: pkg.description,
      price: pkg.price,
      image: pkg.image,
      duration: 7, // Default duration
      theme: 'general', // Default theme
      rating: 4.5, // Default rating
      review_count: Math.floor(Math.random() * 100), // Random review count
      is_trending: Math.random() > 0.7 // Random trending status
    }));
    
    const savedPackages = await Package.insertMany(packagesToInsert);
    
    res.status(201).json({ 
      message: `Successfully populated ${savedPackages.length} packages`,
      count: savedPackages.length,
      packages: savedPackages
    });
  } catch (error) {
    console.error('Error populating packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages - List all packages
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await Package.find({}).sort({ id: 1 }); // Sort by id
    res.json({
      success: true,
      count: packages.length,
      packages: packages
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/packages - Create a new package
app.post('/api/packages', async (req, res) => {
  try {
    const { id, title, description, price, duration, location, theme, image, rating, review_count, is_trending } = req.body;
    
    // Generate unique ID if not provided
    let packageId = id;
    if (!packageId) {
      const lastPackage = await Package.findOne().sort({ id: -1 });
      packageId = lastPackage ? lastPackage.id + 1 : 1;
    }
    
    const newPackage = new Package({
      id: packageId,
      title,
      description,
      price,
      duration: duration || 7,
      location,
      theme: theme || 'general',
      image,
      rating: rating || 4.5,
      review_count: review_count || 0,
      is_trending: is_trending || false
    });

    const savedPackage = await newPackage.save();
    res.status(201).json({ message: 'Package created successfully', package: savedPackage });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages/trending - Get trending packages (must come before /:id)
app.get('/api/packages/trending', async (req, res) => {
  try {
    const trendingPackages = await Package.find({ is_trending: true }).limit(5);
    res.json({
      success: true,
      count: trendingPackages.length,
      packages: trendingPackages
    });
  } catch (error) {
    console.error('Error fetching trending packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages/featured - Get featured packages (high-rated packages)
app.get('/api/packages/featured', async (req, res) => {
  try {
    const featuredPackages = await Package.find({ rating: { $gte: 4.5 } }).limit(8);
    res.json({
      success: true,
      count: featuredPackages.length,
      packages: featuredPackages
    });
  } catch (error) {
    console.error('Error fetching featured packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages/by-location - Get packages by location
app.get('/api/packages/by-location', async (req, res) => {
  const { location } = req.query;
  
  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }

  try {
    const packages = await Package.find({ 
      location: { $regex: location, $options: 'i' } 
    }).sort({ id: 1 });
    
    res.json({
      success: true,
      count: packages.length,
      location: location,
      packages: packages
    });
  } catch (error) {
    console.error('Error fetching packages by location:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages/search - Search packages (must come before /:id)
app.get('/api/packages/search', async (req, res) => {
  const { budget, location, theme, title } = req.query;
  const query = {};

  if (budget) {
    const budgetNum = parseInt(budget);
    query.price = { $lte: budgetNum };
  }
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }
  if (theme) {
    query.theme = { $regex: theme, $options: 'i' };
  }
  if (title) {
    query.title = { $regex: title, $options: 'i' };
  }

  try {
    const packages = await Package.find(query).sort({ id: 1 });
    res.json({
      success: true,
      count: packages.length,
      packages: packages
    });
  } catch (error) {
    console.error('Error searching packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/packages/:id - Get package details by numeric ID
app.get('/api/packages/:id', async (req, res) => {
  const packageId = parseInt(req.params.id);

  try {
    if (isNaN(packageId)) {
      return res.status(400).json({ error: 'Invalid package ID format. Must be a number.' });
    }

    const package = await Package.findOne({ id: packageId });
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.status(200).json({
      success: true,
      package: package
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. CART MANAGEMENT
// GET /api/cart - Get user's cart
app.get('/api/cart', async (req, res) => {
  const { userId } = req.query;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
      await cart.save();
    }
    
    // Convert items array to text for AI agent response
    const responseCart = { ...cart.toObject() };
    if (responseCart.items) {
      responseCart.items = convertArrayToText(responseCart.items);
    }
    
    res.json(responseCart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/cart - Add item to cart
app.post('/api/cart', async (req, res) => {
  const { userId, package_id, package_name, price, quantity = 1 } = req.body;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [], total: 0 });
    }

    const existingItemIndex = cart.items.findIndex(item => item.package_id === package_id);
    
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ package_id, package_name, price, quantity });
    }

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    // Convert items array to text for AI agent response
    const responseCart = { ...cart.toObject() };
    responseCart.items = convertArrayToText(responseCart.items);

    res.status(200).json({ message: 'Item added to cart', cart: responseCart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/cart/:id - Remove item from cart
app.delete('/api/cart/:id', async (req, res) => {
  const { userId } = req.query;
  const itemId = req.params.id;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    await cart.save();

    // Convert items array to text for AI agent response
    const responseCart = { ...cart.toObject() };
    responseCart.items = convertArrayToText(responseCart.items);

    res.status(200).json({ message: 'Item removed from cart', cart: responseCart });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/cart/checkout - Finalize cart into bookings
app.post('/api/cart/checkout', async (req, res) => {
  const { userId, pickup_location, transport_mode, stay_option, room_type, guests, start_date, end_date } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const newBooking = new Booking({
      userId,
      packages: cart.items,
      total: cart.total,
      pickup_location,
      transport_mode,
      stay_option,
      room_type,
      guests,
      start_date,
      end_date
    });

    const savedBooking = await newBooking.save();
    
    // Clear cart after successful booking
    cart.items = [];
    cart.total = 0;
    await cart.save();

    // Convert packages back to text for AI agent response
    const responseBooking = { ...savedBooking.toObject() };
    responseBooking.packages = convertArrayToText(responseBooking.packages);

    res.status(201).json({ message: 'Booking created from cart', bookingId: savedBooking._id, booking: responseBooking });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. PAYMENTS
// GET /api/payments/:bookingId - Check payment status
app.get('/api/payments/:bookingId', async (req, res) => {
  const bookingId = req.params.bookingId;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const payment = await Payment.findOne({ booking_id: bookingId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(200).json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/payments - Initiate payment
app.post('/api/payments', async (req, res) => {
  const { booking_id, user_id, amount, payment_method } = req.body;

  try {
    const payment = new Payment({
      booking_id,
      user_id,
      amount,
      payment_method,
      status: 'Pending'
    });

    const savedPayment = await payment.save();
    
    // Simulate payment processing
    setTimeout(async () => {
      await Payment.findByIdAndUpdate(savedPayment._id, { 
        status: 'Completed', 
        completed_at: new Date(),
        transaction_id: 'TXN_' + Date.now()
      });
      
      await Booking.findByIdAndUpdate(booking_id, { 
        payment_status: 'Paid', 
        paid_at: new Date(),
        payment_method 
      });
    }, 2000);

    res.status(201).json({ message: 'Payment initiated', paymentId: savedPayment._id });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/payments/card - Card payment with OTP validation
app.post('/api/payments/card', async (req, res) => {
  // Support both JSON body and query parameters for AI agent compatibility
  let paymentData = req.body;
  
  // If no body data, try to get from query parameters
  if (!paymentData || Object.keys(paymentData).length === 0) {
    paymentData = {
      userId: req.query.userId,
      bookingId: req.query.bookingId,
      amount: req.query.amount ? Number(req.query.amount) : undefined,
      cardDetails: req.query.cardDetails,
      otp: req.query.otp
    };
  }

  const { userId, bookingId, amount, cardDetails, otp } = paymentData;

  try {
    // Validate required fields
    if (!userId || !bookingId || !amount || !otp) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, bookingId, amount, and otp are required' 
      });
    }

    // Validate OTP (always 12345)
    if (otp !== '12345') {
      return res.status(400).json({ 
        error: 'Invalid OTP. Please enter the correct OTP.',
        success: false
      });
    }

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found',
        success: false
      });
    }

    // Check if booking belongs to the user
    if (booking.userId !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized: This booking does not belong to you',
        success: false
      });
    }

    // Check if booking is already paid
    if (booking.payment_status === 'Paid') {
      return res.status(400).json({ 
        error: 'This booking has already been paid',
        success: false
      });
    }

    // Create payment record
    const payment = new Payment({
      booking_id: bookingId,
      user_id: userId,
      amount: amount,
      payment_method: 'Card',
      status: 'Completed',
      transaction_id: 'CARD_TXN_' + Date.now(),
      completed_at: new Date()
    });

    const savedPayment = await payment.save();

    // Update booking payment status
    await Booking.findByIdAndUpdate(bookingId, { 
      payment_status: 'Paid', 
      paid_at: new Date(),
      payment_method: 'Card'
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment successful! Your booking has been confirmed.',
      payment: {
        paymentId: savedPayment._id,
        transactionId: savedPayment.transaction_id,
        amount: savedPayment.amount,
        status: savedPayment.status,
        paymentMethod: 'Card',
        completedAt: savedPayment.completed_at
      },
      booking: {
        bookingId: bookingId,
        status: 'Confirmed',
        paymentStatus: 'Paid'
      }
    });

  } catch (error) {
    console.error('Card payment error:', error);
    res.status(500).json({ 
      error: 'Payment processing failed. Please try again.',
      success: false
    });
  }
});

// POST /api/payments/upi - Generate UPI QR code for payment
app.post('/api/payments/upi', async (req, res) => {
  // Support both JSON body and query parameters for AI agent compatibility
  let paymentData = req.body;
  
  // If no body data, try to get from query parameters
  if (!paymentData || Object.keys(paymentData).length === 0) {
    paymentData = {
      userId: req.query.userId,
      bookingId: req.query.bookingId
    };
  }

  const { userId, bookingId } = paymentData;

  try {
    // Validate required fields
    if (!userId || !bookingId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and bookingId are required' 
      });
    }

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found',
        success: false
      });
    }

    // Check if booking belongs to the user
    if (booking.userId !== userId) {
      return res.status(403).json({ 
        error: 'Unauthorized: This booking does not belong to you',
        success: false
      });
    }

    // Check if booking is already paid
    if (booking.payment_status === 'Paid') {
      return res.status(400).json({ 
        error: 'This booking has already been paid',
        success: false
      });
    }

    // Create pending payment record
    const payment = new Payment({
      booking_id: bookingId,
      user_id: userId,
      amount: booking.total,
      payment_method: 'UPI',
      status: 'Pending',
      transaction_id: 'UPI_TXN_' + Date.now()
    });

    const savedPayment = await payment.save();

    // Generate UPI QR code data
    const upiId = 'fairbnb@paytm'; // Your UPI ID
    const merchantName = 'Fairbnb Travel';
    const transactionNote = `Payment for booking ${bookingId}`;
    const amount = booking.total;
    
    // Create UPI payment URL
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${savedPayment.transaction_id}`;
    
    // Generate QR code using a simple API (you can use qrcode npm package for better control)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`;

    // Return QR code response
    res.status(200).json({
      success: true,
      message: 'UPI QR Code generated. Please scan to complete payment.',
      payment: {
        paymentId: savedPayment._id,
        transactionId: savedPayment.transaction_id,
        amount: savedPayment.amount,
        status: 'Pending',
        paymentMethod: 'UPI'
      },
      qrCode: {
        url: qrCodeUrl,
        upiUrl: upiUrl,
        upiId: upiId,
        merchantName: merchantName,
        amount: amount,
        currency: 'INR',
        note: transactionNote
      },
      booking: {
        bookingId: bookingId,
        status: 'Payment Pending',
        paymentStatus: 'Pending'
      },
      instructions: [
        '1. Open your UPI app (Paytm, PhonePe, Google Pay, etc.)',
        '2. Scan the QR code displayed above',
        '3. Verify the payment details',
        '4. Complete the payment',
        '5. Payment will be automatically confirmed'
      ]
    });

  } catch (error) {
    console.error('UPI QR generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate UPI QR code. Please try again.',
      success: false
    });
  }
});

// POST /api/payments/upi/confirm - Confirm UPI payment after scanning QR
app.post('/api/payments/upi/confirm', async (req, res) => {
  // Support both JSON body and query parameters for AI agent compatibility
  let paymentData = req.body;
  
  // If no body data, try to get from query parameters
  if (!paymentData || Object.keys(paymentData).length === 0) {
    paymentData = {
      userId: req.query.userId,
      bookingId: req.query.bookingId,
      paymentId: req.query.paymentId
    };
  }

  const { userId, bookingId, paymentId } = paymentData;

  try {
    // Validate required fields
    if (!userId || !bookingId || !paymentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, bookingId, and paymentId are required' 
      });
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment not found',
        success: false
      });
    }

    // Check if payment belongs to the user and booking
    if (payment.user_id !== userId || payment.booking_id !== bookingId) {
      return res.status(403).json({ 
        error: 'Unauthorized: This payment does not belong to you',
        success: false
      });
    }

    // Check if payment is already completed
    if (payment.status === 'Completed') {
      return res.status(400).json({ 
        error: 'This payment has already been completed',
        success: false
      });
    }

    // Update payment status to completed
    await Payment.findByIdAndUpdate(paymentId, { 
      status: 'Completed', 
      completed_at: new Date()
    });

    // Update booking payment status
    await Booking.findByIdAndUpdate(bookingId, { 
      payment_status: 'Paid', 
      paid_at: new Date(),
      payment_method: 'UPI'
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: 'UPI Payment confirmed! Your booking has been confirmed.',
      payment: {
        paymentId: paymentId,
        transactionId: payment.transaction_id,
        amount: payment.amount,
        status: 'Completed',
        paymentMethod: 'UPI',
        completedAt: new Date()
      },
      booking: {
        bookingId: bookingId,
        status: 'Confirmed',
        paymentStatus: 'Paid'
      }
    });

  } catch (error) {
    console.error('UPI payment confirmation error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm UPI payment. Please try again.',
      success: false
    });
  }
});

// POST /api/payments/refund - Process refund
app.post('/api/payments/refund', async (req, res) => {
  const { payment_id, reason } = req.body;

  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(payment_id)) {
      return res.status(400).json({ error: 'Invalid payment ID format' });
    }

    const payment = await Payment.findById(payment_id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'Completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    await Payment.findByIdAndUpdate(payment_id, { status: 'Refunded' });
    await Booking.findByIdAndUpdate(payment.booking_id, { payment_status: 'Refunded' });

    res.status(200).json({ message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. ANALYTICS

// 7. ALERTS
// POST /api/alerts/price-drop - Set price drop alert
app.post('/api/alerts/price-drop', async (req, res) => {
  const { user_id, package_id, target_price } = req.body;

  try {
    const alert = new Alert({
      user_id,
      type: 'price_drop',
      package_id,
      target_price
    });

    const savedAlert = await alert.save();
    res.status(201).json({ message: 'Price drop alert set', alertId: savedAlert._id });
  } catch (error) {
    console.error('Error setting price drop alert:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/alerts/reminder - Set trip reminder
app.post('/api/alerts/reminder', async (req, res) => {
  const { user_id, booking_id, reminder_date } = req.body;

  try {
    const alert = new Alert({
      user_id,
      type: 'reminder',
      package_id: booking_id,
      reminder_date: new Date(reminder_date)
    });

    const savedAlert = await alert.save();
    res.status(201).json({ message: 'Trip reminder set', alertId: savedAlert._id });
  } catch (error) {
    console.error('Error setting reminder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/alerts - Get user alerts
app.get('/api/alerts', async (req, res) => {
  const { userId } = req.query;

  try {
    const alerts = await Alert.find({ user_id: userId, is_active: true });
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. GROUP & SOCIAL TRAVEL
// POST /api/group-bookings - Create group booking
app.post('/api/group-bookings', async (req, res) => {
  const { group_leader_id, members, booking_id } = req.body;

  try {
    // Convert members text back to array for database storage
    let processedMembers = members;
    if (typeof members === 'string') {
      // Try to parse as JSON first, if that fails, treat as comma-separated text
      try {
        processedMembers = JSON.parse(members);
      } catch {
        // If not JSON, treat as comma-separated text and create member objects
        const memberEmails = convertTextToArray(members);
        processedMembers = memberEmails.map((email, index) => ({
          user_id: `user_${Date.now()}_${index}`,
          email: email.trim(),
          status: 'Pending'
        }));
      }
    }

    const groupBooking = new GroupBooking({
      group_leader_id,
      members: processedMembers,
      booking_id
    });

    const savedGroupBooking = await groupBooking.save();
    
    // Convert members back to text for AI agent response
    const responseGroupBooking = { ...savedGroupBooking.toObject() };
    responseGroupBooking.members = convertArrayToText(responseGroupBooking.members);
    
    res.status(201).json({ message: 'Group booking created', groupBookingId: savedGroupBooking._id, groupBooking: responseGroupBooking });
  } catch (error) {
    console.error('Error creating group booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/share/itinerary - Share trip with others
app.post('/api/share/itinerary', async (req, res) => {
  const { booking_id, shared_with_emails, message } = req.body;

  try {
    // Convert shared emails text to array for processing
    let processedEmails = shared_with_emails;
    if (typeof shared_with_emails === 'string') {
      processedEmails = convertTextToArray(shared_with_emails);
    }
    
    // In a real implementation, you would send emails or notifications
    res.status(200).json({ 
      message: 'Itinerary shared successfully', 
      shared_with: convertArrayToText(processedEmails),
      booking_id 
    });
  } catch (error) {
    console.error('Error sharing itinerary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/gift - Gift a trip to another user
app.post('/api/gift', async (req, res) => {
  const { gifter_id, recipient_email, booking_id, message } = req.body;

  try {
    const gift = new Gift({
      gifter_id,
      recipient_email,
      booking_id,
      message
    });

    const savedGift = await gift.save();
    res.status(201).json({ message: 'Gift sent successfully', giftId: savedGift._id });
  } catch (error) {
    console.error('Error creating gift:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ===== END OF NEW APIs =====

app.get('/api/active-routes', (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Route registered directly on the app
      routes.push(middleware.route.path);
    } else if (middleware.name === 'router') {
      // Routes added through router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(handler.route.path);
        }
      });
    }
  });

  res.json({
    totalRoutes: routes.length,
    routes
  });
});

// --- API Logs Endpoint ---
app.get('/api/logs', (req, res) => {
  try {
    // Return logs sorted by timestamp (newest first)
    const sortedLogs = [...apiLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      success: true,
      totalLogs: sortedLogs.length,
      logs: sortedLogs
    });
  } catch (error) {
    console.error('Error fetching API logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API logs'
    });
  }
});

// --- Clear API Logs Endpoint ---
app.delete('/api/logs', (req, res) => {
  try {
    apiLogs.length = 0; // Clear the array
    res.json({
      success: true,
      message: 'API logs cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing API logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear API logs'
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});