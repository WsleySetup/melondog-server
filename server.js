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

app.get('/', (req, res) => {
  res.send('Melondog Server is running!');
});

let pool;

async function initDb() {
  pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();
  console.log('DB Connected');
  conn.release();
}

app.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, score, created_at FROM leaderboard ORDER BY score DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.post("/score", express.json(), (req, res) => {
  console.log("📥 Received score submission:", req.body); // <-- Add this

  const { username, score } = req.body;

  if (!username || typeof score !== "number") {
    console.log("❌ Invalid data:", req.body);
    return res.status(400).json({ error: "Invalid data" });
  }

  // Save to DB
  scoresCollection.insertOne({ username, score, date: new Date() })
    .then(() => {
      console.log("✅ Score saved successfully");
      res.status(200).json({ message: "Score saved" });
    })
    .catch((err) => {
      console.error("❗ Error saving score:", err);const express = require('express');
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

app.get('/', (req, res) => {
  res.send('Melondog Server is running!');
});

let pool;

async function initDb() {
  pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();
  console.log('DB Connected');
  conn.release();
}

app.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT username, score, created_at FROM leaderboard ORDER BY score DESC LIMIT 10');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB query failed' });
  }
});

app.post("/score", express.json(), (req, res) => {
  console.log("📥 Received score submission:", req.body); // <-- Add this

  const { username, score } = req.body;

  if (!username || typeof score !== "number") {
    console.log("❌ Invalid data:", req.body);
    return res.status(400).json({ error: "Invalid data" });
  }

  // Save to DB
  scoresCollection.insertOne({ username, score, date: new Date() })
    .then(() => {
      console.log("✅ Score saved successfully");
      res.status(200).json({ message: "Score saved" });
    })
    .catch((err) => {
      console.error("❗ Error saving score:", err);
      res.status(500).json({ error: "Database error" });
    });
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

      res.status(500).json({ error: "Database error" });
    });
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
