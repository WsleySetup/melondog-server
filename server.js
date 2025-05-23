const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// dbConfig must be defined BEFORE initDb is called
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
  const { oldUsername, newUsername } = req.body;

  if (!oldUsername || !newUsername) {
    return res.status(400).json({ error: "Missing username values" });
  }

  try {
    // Check if new username already exists
    const check = await db.query("SELECT * FROM leaderboard WHERE username = $1", [newUsername]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Update the username
    await db.query("UPDATE leaderboard SET username = $1 WHERE username = $2", [newUsername, oldUsername]);

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

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});
