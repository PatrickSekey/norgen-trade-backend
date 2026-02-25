const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// ✅ GET all partners (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const [partners] = await db.query(
      'SELECT * FROM partners ORDER BY created_at DESC'
    );
    
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET single partner by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [partners] = await db.query(
      'SELECT * FROM partners WHERE id = ?',
      [req.params.id]
    );
    
    if (partners.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    res.json(partners[0]);
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ CREATE new partner application (public - no auth needed)
router.post('/', async (req, res) => {
  try {
    const { company_name, contact_person, email, phone, business_type } = req.body;
    
    // Validate required fields
    if (!company_name || !contact_person || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate UUID
    const [uuidResult] = await db.query('SELECT UUID() as uuid');
    const partnerId = uuidResult[0].uuid;
    
    await db.query(
      `INSERT INTO partners (id, company_name, contact_person, email, phone, business_type, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [partnerId, company_name, contact_person, email, phone, business_type]
    );
    
    const [newPartner] = await db.query(
      'SELECT * FROM partners WHERE id = ?',
      [partnerId]
    );
    
    res.status(201).json(newPartner[0]);
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ UPDATE partner status (admin only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status } = req.body;
    const { id } = req.params;
    
    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.query(
      `UPDATE partners 
       SET status = ?, reviewed_at = NOW(), reviewed_by = ? 
       WHERE id = ?`,
      [status, req.user.id, id]
    );
    
    const [updated] = await db.query(
      'SELECT * FROM partners WHERE id = ?',
      [id]
    );
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ DELETE partner (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const [result] = await db.query(
      'DELETE FROM partners WHERE id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    
    res.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;