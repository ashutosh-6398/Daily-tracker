const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_daily_tracker_secret_key_2026';

app.use(cors());
app.use(express.json());

// Serve static frontend files directly from current folder
app.use(express.static(path.join(__dirname)));

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// --- AUTHENTICATION ROUTES ---

// Register User
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
    [username.trim(), email ? email.trim() : null, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Database error creating user' });
      }

      const token = jwt.sign({ userId: this.lastID, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ message: 'User created successfully', token, user: { id: this.lastID, username: username.trim(), email } });
    }
  );
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username.trim()], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ message: 'Login successful', token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// Google OAuth Sign-In Endpoint
app.post('/api/auth/google', (req, res) => {
  const { credential, email, name } = req.body;

  let userEmail = email;
  let userName = name;

  if (credential) {
    try {
      // Decode JWT payload from Google credential ID token
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      userEmail = payload.email;
      userName = payload.name || payload.email.split('@')[0];
    } catch (e) {
      console.warn("Failed to parse Google credential token, using fallback email/name if provided");
    }
  }

  if (!userEmail) {
    return res.status(400).json({ error: "Google sign-in requires a valid email" });
  }

  const username = (userName || userEmail.split('@')[0]).trim();

  // Check if user exists by email or username
  db.get(`SELECT * FROM users WHERE email = ? OR username = ?`, [userEmail, username], (err, existingUser) => {
    if (existingUser) {
      const token = jwt.sign({ userId: existingUser.id, username: existingUser.username }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        message: 'Google Sign-In successful',
        token,
        user: { id: existingUser.id, username: existingUser.username, email: existingUser.email }
      });
    }

    // Register new user via Google
    const dummyPasswordHash = bcrypt.hashSync('google_oauth_' + Date.now(), 10);
    db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, userEmail, dummyPasswordHash],
      function (insertErr) {
        if (insertErr) {
          // If username collision, append random suffix
          const altUsername = username + '_' + Math.floor(100 + Math.random() * 900);
          db.run(
            `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
            [altUsername, userEmail, dummyPasswordHash],
            function (altErr) {
              if (altErr) return res.status(500).json({ error: 'Database error registering Google account' });
              const token = jwt.sign({ userId: this.lastID, username: altUsername }, JWT_SECRET, { expiresIn: '30d' });
              return res.json({
                message: 'Google Account created & signed in',
                token,
                user: { id: this.lastID, username: altUsername, email: userEmail }
              });
            }
          );
          return;
        }

        const token = jwt.sign({ userId: this.lastID, username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({
          message: 'Google Account created & signed in',
          token,
          user: { id: this.lastID, username, email: userEmail }
        });
      }
    );
  });
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, username, email, created_at FROM users WHERE id = ?`, [req.user.userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// Update Account Credentials
app.post('/api/auth/update', authenticateToken, (req, res) => {
  const { username, email, currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });

    const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

    const updatedUsername = username ? username.trim() : user.username;
    const updatedEmail = email !== undefined ? (email ? email.trim() : null) : user.email;
    const updatedPasswordHash = newPassword ? bcrypt.hashSync(newPassword, 10) : user.password_hash;

    db.run(
      `UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?`,
      [updatedUsername, updatedEmail, updatedPasswordHash, userId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: 'Error updating account settings' });
        const newToken = jwt.sign({ userId, username: updatedUsername }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ message: 'Account updated successfully', token: newToken, user: { id: userId, username: updatedUsername, email: updatedEmail } });
      }
    );
  });
});

// --- DATA PERSISTENCE & CLOUD SYNC ROUTES ---

// Sync All User Data (Full Sync)
app.get('/api/data/sync', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get(`SELECT goals_json, custom_goals_json FROM goals WHERE user_id = ?`, [userId], (err, goalRow) => {
    const goals = goalRow ? JSON.parse(goalRow.goals_json) : null;
    const customGoals = goalRow ? JSON.parse(goalRow.custom_goals_json) : [];

    db.all(`SELECT date_key, data_json FROM entries WHERE user_id = ?`, [userId], (err, entryRows) => {
      const entries = {};
      if (entryRows) {
        entryRows.forEach(r => { entries[r.date_key] = JSON.parse(r.data_json); });
      }

      db.all(`SELECT id, text, category, status FROM tasks WHERE user_id = ?`, [userId], (err, taskRows) => {
        const tasks = taskRows || [];

        db.all(`SELECT date_key, content FROM notes WHERE user_id = ?`, [userId], (err, noteRows) => {
          const notes = {};
          if (noteRows) {
            noteRows.forEach(r => { notes[r.date_key] = r.content; });
          }

          res.json({ goals, customGoals, entries, tasks, notes });
        });
      });
    });
  });
});

// Save Goals
app.post('/api/data/goals', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { goals, customGoals } = req.body;

  db.run(
    `INSERT INTO goals (user_id, goals_json, custom_goals_json, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET goals_json = excluded.goals_json, custom_goals_json = excluded.custom_goals_json, updated_at = CURRENT_TIMESTAMP`,
    [userId, JSON.stringify(goals || {}), JSON.stringify(customGoals || [])],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save goals' });
      res.json({ message: 'Goals saved successfully' });
    }
  );
});

// Save Daily Log Entry
app.post('/api/data/entry', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { dateKey, entryData } = req.body;

  if (!dateKey || !entryData) {
    return res.status(400).json({ error: 'dateKey and entryData are required' });
  }

  db.run(
    `INSERT INTO entries (user_id, date_key, data_json, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date_key) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP`,
    [userId, dateKey, JSON.stringify(entryData)],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save entry' });
      res.json({ message: 'Entry saved successfully' });
    }
  );
});

// Save Daily Note
app.post('/api/data/notes', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { dateKey, content } = req.body;

  if (!dateKey) return res.status(400).json({ error: 'dateKey is required' });

  db.run(
    `INSERT INTO notes (user_id, date_key, content, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, date_key) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`,
    [userId, dateKey, content || ''],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to save note' });
      res.json({ message: 'Note saved successfully' });
    }
  );
});

// Sync Tasks Array
app.post('/api/data/tasks', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });

  db.serialize(() => {
    db.run(`DELETE FROM tasks WHERE user_id = ?`, [userId]);
    const stmt = db.prepare(`INSERT INTO tasks (id, user_id, text, category, status) VALUES (?, ?, ?, ?, ?)`);

    tasks.forEach(t => {
      stmt.run([t.id || 't_' + Date.now(), userId, t.text, t.category || 'Work', t.status || 'todo']);
    });
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: 'Failed to sync tasks' });
      res.json({ message: 'Tasks synced successfully' });
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Daily Tracker REST API Server running on port ${PORT}`);
  console.log(`Frontend accessible at http://localhost:${PORT}`);
});
