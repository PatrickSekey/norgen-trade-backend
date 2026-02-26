const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const partnersRoutes = require('./routes/partners');

const app = express();

// CORS configuration - Allow your Netlify frontend
const corsOptions = {
  origin: [
    'https://norgen-trade-frontend.netlify.app',  // Your live frontend
    'http://localhost:3000',                        // Local development
    'http://localhost:3001',                        // Alternative local port
    'http://localhost:3002'                         // Another local port
  ],
  credentials: true,                                 // Allow cookies/auth headers
  optionsSuccessStatus: 200                          // For legacy browser support
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/partners', partnersRoutes);

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ 
      message: '✅ Database connected successfully!', 
      result: rows[0].result 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    time: new Date().toISOString(),
    database: process.env.DB_NAME 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Database: ${process.env.DB_NAME}`);
});