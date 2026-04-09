const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize SQLite
const db = new Database(path.join(__dirname, 'notes.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY,
    text TEXT NOT NULL DEFAULT '',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0
  )
`);

// WebSocket setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const clients = new Set();

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current board state + user count
  const notes = db.prepare('SELECT * FROM notes').all();
  ws.send(JSON.stringify({ type: 'init', notes, userCount: clients.size }));

  // Broadcast updated user count to all
  broadcast({ type: 'user_count', count: clients.size });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast({ type: 'user_count', count: clients.size });
  });

  ws.on('error', () => {
    clients.delete(ws);
    broadcast({ type: 'user_count', count: clients.size });
  });
});

// REST API

app.get('/notes', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes').all();
  res.json(notes);
});

app.post('/notes', (req, res) => {
  const { text = '', x = 0, y = 0 } = req.body;
  const result = db.prepare('INSERT INTO notes (text, x, y) VALUES (?, ?, ?)').run(text, x, y);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  broadcast({ type: 'note_created', note });
  res.json(note);
});

app.put('/notes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { text = '', x, y } = req.body;

  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  if (!existing) {
    // Note was deleted — save wins, recreate it with original ID
    db.prepare('INSERT INTO notes (id, text, x, y) VALUES (?, ?, ?, ?)').run(
      id,
      text,
      x ?? 0,
      y ?? 0
    );
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    broadcast({ type: 'note_updated', note });
    return res.json(note);
  }

  const newX = x !== undefined ? x : existing.x;
  const newY = y !== undefined ? y : existing.y;
  db.prepare('UPDATE notes SET text = ?, x = ?, y = ? WHERE id = ?').run(text, newX, newY, id);
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
  broadcast({ type: 'note_updated', note });
  res.json(note);
});

app.delete('/notes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  broadcast({ type: 'note_deleted', id });
  res.json({ success: true });
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Backend listening on port 3001');
});
