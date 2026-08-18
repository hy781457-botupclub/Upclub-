const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3000;
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL || '1000', 10); // 1s default
const DISPLAY_OFFSET = parseInt(process.env.DISPLAY_OFFSET || '15', 10); // seconds

const DEMO_MODE = !MONGO_URI; // if no MONGO_URI, run in demo mode

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

let dbClient;
let db;
let currentResult = null;
const sseClients = new Set();

async function connectDB() {
  if (DEMO_MODE) {
    console.log('No MONGO_URI provided — running in DEMO mode');
    return;
  }
  dbClient = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  await dbClient.connect();
  db = dbClient.db(); // default DB from URI
  console.log('Connected to MongoDB');
}

async function fetchLatestFromDB() {
  if (DEMO_MODE) {
    return currentResult; // in demo mode rely on manual seed
  }
  // Assumes collection name 'results' and documents like { period: Number, number: String, source: 'wingo', white_label: true, createdAt: Date }
  const coll = db.collection('results');
  return await coll.find({ source: 'wingo', white_label: true })
                   .sort({ period: -1, createdAt: -1 })
                   .limit(1)
                   .next();
}

function isWithinDisplayOffset(result) {
  if (!result || !result.createdAt) return false;
  const created = new Date(result.createdAt).getTime();
  const now = Date.now();
  const offsetMs = DISPLAY_OFFSET * 1000;
  // Show if the result was created in the last DISPLAY_OFFSET seconds
  return (now - created) <= offsetMs;
}

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (e) { /* ignore */ }
  }
}

// Polling loop — in DEMO mode this will just check currentResult; in real mode it queries DB
setInterval(async () => {
  try {
    const latest = await fetchLatestFromDB();
    if (!latest) return;

    // If new period or a recent result within DISPLAY_OFFSET, update
    const isNewPeriod = !currentResult || latest.period !== currentResult.period;
    const isRecent = isWithinDisplayOffset(latest) || DEMO_MODE; // allow demo to show immediately

    if (isNewPeriod && isRecent) {
      currentResult = latest;
      broadcastSSE('current', currentResult);
      console.log('New current result (within offset):', currentResult);
    } else if (!isNewPeriod && (!currentResult || latest.number !== currentResult.number)) {
      // If same period but number changed, update immediately
      currentResult = latest;
      broadcastSSE('current', currentResult);
      console.log('Updated current result:', currentResult);
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

// Admin endpoint to set demo result quickly (unguarded). Use only if you trust the network.
// Example: POST /admin/set with JSON { "period": 123456, "number": "04-15-20", "ageSeconds": 5 }
app.post('/admin/set', (req, res) => {
  const { period, number, ageSeconds } = req.body || {};
  if (!period || !number) return res.status(400).json({ error: 'period and number required' });
  const createdAt = new Date(Date.now() - ((ageSeconds || 0) * 1000)).toISOString();
  currentResult = { period, number, source: 'wingo', white_label: true, createdAt };
  broadcastSSE('current', currentResult);
  console.log('Admin set currentResult:', currentResult);
  return res.json({ ok: true, currentResult });
});

// Convenience GET endpoint: /admin/set?period=...&number=...&age=5
app.get('/admin/set', (req, res) => {
  const { period, number, age } = req.query;
  if (!period || !number) return res.status(400).send('period and number query params required');
  const createdAt = new Date(Date.now() - ((parseInt(age || '0', 10)) * 1000)).toISOString();
  currentResult = { period: parseInt(period, 10), number: String(number), source: 'wingo', white_label: true, createdAt };
  broadcastSSE('current', currentResult);
  console.log('Admin GET set currentResult:', currentResult);
  return res.send('ok');
});

(async function start() {
  try {
    await connectDB();
    // initialize currentResult immediately with a safe demo value if DEMO_MODE
    if (DEMO_MODE && !currentResult) {
      const createdAt = new Date().toISOString();
      currentResult = { period: 999999, number: '00-00-00', source: 'wingo', white_label: true, createdAt };
    } else {
      currentResult = await fetchLatestFromDB();
    }
    app.listen(PORT, () => console.log(`Server listening on ${PORT} (offset=${DISPLAY_OFFSET}s, poll=${REFRESH_INTERVAL}ms) DEMO_MODE=${DEMO_MODE}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();
