const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// DB config
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

let pool;

async function initDb() {
  pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();
  console.log('DB Connected');
  conn.release();
}

app.post('/update-username', async (req, res) => {
  const { userId, newUsername } = req.body;

  if (!userId || !newUsername) {
    return res.status(400).json({ error: "Missing userId or newUsername" });
  }

  try {
    // Check if new username is taken
    const [rows] = await pool.query("SELECT * FROM leaderboard WHERE username = ?", [newUsername]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Update username by user ID
    const [result] = await pool.query("UPDATE leaderboard SET username = ? WHERE id = ?", [newUsername, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "Username updated" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get('/', (req, res) => {
  res.send('Melondog Server is running!');
});

app.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, score, created_at FROM leaderboard ORDER BY score DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.post("/score", async (req, res) => {
  const { userId, score } = req.body;

  if (!userId || typeof score !== "number") {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const query = `
      UPDATE leaderboard
      SET score = IF(? > score, ?, score),
          created_at = IF(? > score, NOW(), created_at)
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [score, score, score, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Score updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post('/create-user', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  try {
    // Check if username is taken
    const [rows] = await pool.query("SELECT id FROM leaderboard WHERE username = ?", [username]);
    if (rows.length > 0) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Insert new user with score 0
    const [result] = await pool.query(
      "INSERT INTO leaderboard (username, score, created_at) VALUES (?, 0, NOW())",
      [username]
    );

    // result.insertId is the new user's id
    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
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
