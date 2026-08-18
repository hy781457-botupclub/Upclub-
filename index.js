const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL || '1000', 10); // 1s default

if (!MONGO_URI) {
  console.error('MONGO_URI not set. Set it in environment.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.static('public'));

let dbClient;
let db;
let currentResult = null;
const sseClients = new Set();

async function connectDB() {
  dbClient = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await dbClient.connect();
  db = dbClient.db(); // default DB from URI
  console.log('Connected to MongoDB');
}

async function fetchLatestFromDB() {
  // Assumes collection name 'results' and documents like { period: Number, number: String, source: 'wingo', white_label: true, createdAt: Date }
  const coll = db.collection('results');
  return await coll.find({ source: 'wingo', white_label: true })
                   .sort({ period: -1, createdAt: -1 })
                   .limit(1)
                   .next();
}

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (e) { /* ignore */ }
  }
}

setInterval(async () => {
  try {
    const latest = await fetchLatestFromDB();
    if (latest && (!currentResult || latest.period !== currentResult.period || latest.number !== currentResult.number)) {
      currentResult = latest;
      broadcastSSE('current', currentResult);
      console.log('New current result:', currentResult);
    }
  } catch (err) {
    console.error('Poll error:', err.message);
  }
}, REFRESH_INTERVAL);

app.get('/api/current', async (req, res) => {
  try {
    if (!currentResult) {
      currentResult = await fetchLatestFromDB();
    }
    if (!currentResult) return res.status(404).json({ error: 'No result found' });
    res.json(currentResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/events', (req, res) => {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  res.write('\n');

  // send immediate current if available
  if (currentResult) {
    res.write(`event: current\ndata: ${JSON.stringify(currentResult)}\n\n`);
  }

  sseClients.add(res);
  req.on('close', () => { sseClients.delete(res); });
});

(async function start() {
  try {
    await connectDB();
    // initialize currentResult immediately
    currentResult = await fetchLatestFromDB();
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
