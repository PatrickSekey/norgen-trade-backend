const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const router = express.Router();

// ✅ REGISTER ROUTE - Create new user (FIXED VERSION)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    console.log('📝 Registering:', email);
    
    // Check if user exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate UUID manually for MySQL
    const [uuidResult] = await db.query('SELECT UUID() as uuid');
    const userId = uuidResult[0].uuid;
    
    // Insert user with generated UUID
    await db.query(
      `INSERT INTO users (id, email, password_hash, full_name, role) 
       VALUES (?, ?, ?, ?, 'user')`,
      [userId, email, hashedPassword, full_name]
    );
    
    // Get the created user
    const [newUser] = await db.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    // Create JWT token
    const token = jwt.sign(
      { 
        id: newUser[0].id, 
        email: newUser[0].email, 
        role: newUser[0].role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: newUser[0], 
      token 
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// ✅ LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    delete user.password_hash;
    res.json({ user, token });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ VERIFY TOKEN ROUTE
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await db.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;