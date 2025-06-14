const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // add this at top with your requires

const app = express();
app.use(cors());
app.use(express.json()); // Built-in JSON parser

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1383214190751256596/rtcwYzXK8Y3wOm_LdbbpWOWaCJrfyofJCuTALPEeiP0BDfOWiR09ROVuddw_V-JUuJHf';

const dbConfig = {
  host: 'mysql-2bbc807a-melondogdb.j.aivencloud.com',
  port: 18629,
  user: 'avnadmin',
  password: 'AVNS_tMj2Si3Gl2frsBlGqEB',
  database: 'defaultdb',
  ssl: {
    ca: fs.readFileSync(path.resolve(__dirname, 'ca.pem')),
    rejectUnauthorized: true,
  }
};

app.post('/send-suggestion', async (req, res) => {
  const { suggestion } = req.body;

  if (!suggestion || suggestion.trim() === '') {
    return res.status(400).json({ error: 'Suggestion is required.' });
  }

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Suggestion Box',
        content: `💡 New suggestion:\n${suggestion}`
      }),
    });

    res.status(200).json({ message: 'Thank you for your suggestion!' });
  } catch (error) {
    console.error('Discord webhook error:', error);
    res.status(500).json({ error: 'Failed to send suggestion.' });
  }
});


let pool;

async function initDb() {
  pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();
  console.log('DB Connected');
  conn.release();
}

app.get('/', (req, res) => {
  res.send('Melondog Server is running!');
});

app.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, score, created_at FROM leaderboard ORDER BY score DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.post("/score", async (req, res) => {
  console.log("📥 Received score submission:", req.body);

  const { username, score } = req.body;

  if (!username || typeof score !== "number") {
    console.log("❌ Invalid data:", req.body);
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const query = `
      INSERT INTO leaderboard (username, score, created_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        score = IF(VALUES(score) > score, VALUES(score), score),
        created_at = IF(VALUES(score) > score, NOW(), created_at);
    `;
    await pool.query(query, [username, score]);

    console.log("✅ Score saved or updated");
    res.status(200).json({ message: "Score saved or updated" });
  } catch (err) {
    console.error("❗ Error saving score:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// 🔥 NEW: Delete a user from leaderboard
app.delete('/leaderboard/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM leaderboard WHERE username = ?', [username]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    console.error("❗ Error deleting user:", err);
    res.status(500).json({ error: 'Database error' });
  }
});
app.put('/leaderboard/rename', async (req, res) => {
  const { oldUsername, newUsername } = req.body;
 console.log("Rename route hit with body:", req.body);
  if (!oldUsername || !newUsername) {
    return res.status(400).json({ message: "Both oldUsername and newUsername are required" });
  }

  try {
    // Check if old username exists
    const [oldRows] = await pool.query('SELECT * FROM leaderboard WHERE username = ?', [oldUsername]);
    if (oldRows.length === 0) {
      return res.status(404).json({ message: "Old username not found" });
    }

    // Check if new username is already taken
    const [newRows] = await pool.query('SELECT * FROM leaderboard WHERE username = ?', [newUsername]);
    if (newRows.length > 0) {
      return res.status(409).json({ message: "New username already taken" });
    }

    // Copy old user's data to new username
    await pool.query(
      'INSERT INTO leaderboard (username, score, created_at) SELECT ?, score, created_at FROM leaderboard WHERE username = ?',
      [newUsername, oldUsername]
    );

    // Delete the old username
    await pool.query('DELETE FROM leaderboard WHERE username = ?', [oldUsername]);

    res.status(200).json({ message: "Username renamed successfully" });
  } catch (err) {
    console.error("Error renaming user:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});
