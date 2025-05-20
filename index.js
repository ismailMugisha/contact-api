require('dotenv').config(); // Load .env variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Connect to PostgreSQL using DATABASE_URL with SSL config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors());
app.use(bodyParser.json());

// Get all contacts
app.get('/contacts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get contact by ID
app.get('/contacts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('SELECT * FROM contact WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new contact
app.post('/contacts', async (req, res) => {
  const { name, phone, type } = req.body;
  if (!name || !phone || !type) {
    return res.status(400).json({ error: 'Missing name, phone or type' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO contact (name, phone, type) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, type]
    );
    res.status(201).json({ message: 'Contact added', contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contact
app.put('/contacts/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, type } = req.body;

  if (!name && !phone && !type) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (phone) {
      fields.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (type) {
      fields.push(`type = $${idx++}`);
      values.push(type);
    }

    values.push(id);

    const sql = `UPDATE contacts SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact updated', contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact
app.delete('/contacts/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await pool.query('DELETE FROM contact WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
