const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const Redis = require('ioredis');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==================== Configuration ====================
const MOTHER_API_URL = process.env.MOTHER_API_URL || "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";
const DEFAULT_TIMEOUT = 10000; // ms
const RETRIES = 3;
const INITIAL_BACKOFF = 500; // ms
const CACHE_REFRESH_INTERVAL = 15 * 1000; // 15s background refresh
const REDIS_URL = process.env.REDIS_URL || null; // optional
const CIRCUIT_FAILURE_THRESHOLD = 5; // open circuit after this many consecutive failures
const CIRCUIT_OPEN_MS = 60 * 1000; // keep open for 60s

let lastPeriod = "";
let lastSentPeriod = null; // last period we've pushed to SSE clients
let cachedPrediction = null; // last computed prediction object
let lastSuccessfulData = null; // last raw data from mother API
let lastFetchAt = null; // timestamp of last successful fetch

// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

// ==================== Redis (optional persistent cache) ====================
let redis = null;
const REDIS_CACHE_KEY = 'wingo:lastSuccessfulData';
const REDIS_PRED_KEY = 'wingo:cachedPrediction';

if (REDIS_URL) {
    redis = new Redis(REDIS_URL);
    redis.on('connect', () => console.info('Connected to Redis'));
    redis.on('error', (e) => console.error('Redis error:', e.message));

    // load cached values from Redis on startup if present
    (async () => {
        try {
            const raw = await redis.get(REDIS_CACHE_KEY);
            const pred = await redis.get(REDIS_PRED_KEY);
            if (raw) {
                lastSuccessfulData = JSON.parse(raw);
            }
            if (pred) {
                cachedPrediction = JSON.parse(pred);
            }
            if (lastSuccessfulData) console.info('Loaded lastSuccessfulData from Redis');
        } catch (e) {
            console.warn('Failed to load cache from Redis:', e.message);
        }
    })();
}

// ==================== Helpers ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = RETRIES, backoff = INITIAL_BACKOFF) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            const resp = await axios.get(url, options);
            // success -> reset failures
            consecutiveFailures = 0;
            return resp;
        } catch (err) {
            attempt++;
            consecutiveFailures++;
            const isLast = attempt > retries;
            console.warn(`Fetch attempt ${attempt} failed${isLast ? ' (final)' : ''}:`, err.message);
            if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
                circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
                console.warn(`Circuit opened until ${new Date(circuitOpenUntil).toISOString()}`);
                throw new Error('Circuit opened due to repeated failures');
            }
            if (isLast) throw err;
            await sleep(backoff);
            backoff *= 2;
        }
    }
}

function computePredictionIfNeeded(liveData) {
    const currentPeriod = liveData.current?.issueNumber ?? "-";
    const currentNumber = liveData.current?.number ?? "-";

    let nextPeriod = "-";
    try {
        if (currentPeriod !== "-") {
            // guard BigInt in case currentPeriod is not numeric
            nextPeriod = (BigInt(currentPeriod) + 1n).toString();
        }
    } catch (e) {
        console.warn('BigInt parse failed for currentPeriod=', currentPeriod);
        nextPeriod = "-";
    }

    if (nextPeriod !== lastPeriod) {
        lastPeriod = nextPeriod;
        const rand = Math.floor(Math.random() * 10);
        cachedPrediction = {
            number: rand,
            size: rand >= 5 ? "BIG" : "SMALL",
            color: [1, 3, 7, 9].includes(rand) ? "GREEN" : (rand === 0 || rand === 5 ? "VIOLET" : "RED"),
            generatedAt: new Date().toISOString(),
            source: 'computed'
        };
    }

    return { currentPeriod, currentNumber, nextPeriod };
}

async function persistCacheToRedis() {
    if (!redis) return;
    try {
        if (lastSuccessfulData) await redis.set(REDIS_CACHE_KEY, JSON.stringify(lastSuccessfulData));
        if (cachedPrediction) await redis.set(REDIS_PRED_KEY, JSON.stringify(cachedPrediction));
    } catch (e) {
        console.warn('Failed to persist cache to Redis:', e.message);
    }
}

// ==================== SSE (Server-Sent Events) ====================
const sseClients = new Set();
function sendSSE(event, data) {
    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
        try {
            res.write(payload);
        } catch (e) {
            // ignore write errors; client cleanup happens on 'close'
        }
    }
}

// ==================== Cache refresh ====================
async function refreshCache() {
    // circuit breaker: if open, skip trying to fetch
    if (Date.now() < circuitOpenUntil) {
        console.warn('Circuit is open, skipping fetch');
        return { ok: false, error: 'circuit_open' };
    }

    try {
        const resp = await fetchWithRetry(`${MOTHER_API_URL}?ts=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: DEFAULT_TIMEOUT
        });

        const data = resp.data;
        // API might return { data: {...} } or direct object — be flexible
        const liveData = data?.data ?? data ?? {};

        // store last successful raw data
        lastSuccessfulData = liveData;
        lastFetchAt = new Date().toISOString();

        // compute prediction if period changed
        const { currentPeriod, currentNumber } = computePredictionIfNeeded(liveData);

        // If current period changed compared to lastSentPeriod, push to SSE clients immediately
        if (currentPeriod && currentPeriod !== lastSentPeriod) {
            lastSentPeriod = currentPeriod;
            sendSSE('current', { period: currentPeriod, number: currentNumber, lastFetchAt });
            console.info('Pushed SSE current event for period', currentPeriod);
        }

        // persist to Redis if available
        await persistCacheToRedis();

        console.info('Cache refreshed from mother API at', lastFetchAt);
        return { ok: true, liveData };
    } catch (err) {
        console.error('refreshCache failed:', err.message);
        return { ok: false, error: err.message };
    }
}

// Background cache refresher so live requests get immediate data
refreshCache();
setInterval(() => {
    // don't await on purpose; keep it fire-and-forget
    refreshCache().catch(e => console.error('Background refresh error:', e.message));
}, CACHE_REFRESH_INTERVAL);

// ==================== API Endpoints ====================

// 1. Get WinGo Data with Prediction (unchanged)
app.get('/api/wingo', async (req, res) => {
    // If circuit open, skip live fetch and return cache immediately
    if (Date.now() < circuitOpenUntil) {
        console.warn('Circuit open: returning cached data');
        return res.json({
            ok: true,
            source: 'cache',
            lastFetchAt,
            warning: 'Circuit open - returning cached data',
            current: {
                period: lastSuccessfulData?.current?.issueNumber ?? '-',
                number: lastSuccessfulData?.current?.number ?? '-'
            },
            next: {
                period: lastPeriod,
                predicted: cachedPrediction
            }
        });
    }

    // Try a fresh fetch but do not block longer than RETRIES/backoff (fetchWithRetry has timeouts)
    try {
        const resp = await fetchWithRetry(`${MOTHER_API_URL}?ts=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: DEFAULT_TIMEOUT
        });

        const data = resp.data;
        const liveData = data?.data ?? data ?? {};

        // update last successful
        lastSuccessfulData = liveData;
        lastFetchAt = new Date().toISOString();

        const { currentPeriod, currentNumber, nextPeriod } = computePredictionIfNeeded(liveData);

        // If current period changed compared to lastSentPeriod, push to SSE clients immediately
        if (currentPeriod && currentPeriod !== lastSentPeriod) {
            lastSentPeriod = currentPeriod;
            sendSSE('current', { period: currentPeriod, number: currentNumber, lastFetchAt });
            console.info('Pushed SSE current event for period', currentPeriod);
        }

        // persist to Redis if available (best-effort)
        persistCacheToRedis().catch(e => console.warn('persistCacheToRedis failed:', e.message));

        return res.json({
            ok: true,
            source: 'live',
            lastFetchAt,
            current: { period: currentPeriod, number: currentNumber },
            next: {
                period: nextPeriod,
                predicted: cachedPrediction
            }
        });

    } catch (e) {
        // If live fetch failed, return cached prediction / last successful data immediately (so panel doesn't go blank)
        console.warn('Live fetch failed in /api/wingo, returning cached data:', e.message);

        return res.json({
            ok: true,
            source: 'cache',
            lastFetchAt,
            warning: 'Live fetch failed, returning cached data',
            current: {
                period: lastSuccessfulData?.current?.issueNumber ?? '-',
                number: lastSuccessfulData?.current?.number ?? '-'
            },
            next: {
                period: lastPeriod,
                predicted: cachedPrediction
            }
        });
    }
});

// NEW: Lightweight endpoint that returns ONLY the current period & number (white-label mother API)
app.get('/api/current', async (req, res) => {
    // If circuit is open, return cached current only
    if (Date.now() < circuitOpenUntil) {
        return res.json({
            ok: true,
            source: 'cache',
            lastFetchAt,
            current: {
                period: lastSuccessfulData?.current?.issueNumber ?? '-',
                number: lastSuccessfulData?.current?.number ?? '-'
            }
        });
    }

    try {
        const resp = await fetchWithRetry(`${MOTHER_API_URL}?ts=${Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: DEFAULT_TIMEOUT
        });

        const data = resp.data;
        const liveData = data?.data ?? data ?? {};

        // update cache
        lastSuccessfulData = liveData;
        lastFetchAt = new Date().toISOString();

        // compute prediction in background but do not return it here
        const { currentPeriod, currentNumber } = computePredictionIfNeeded(liveData);

        // push update if period changed
        if (currentPeriod && currentPeriod !== lastSentPeriod) {
            lastSentPeriod = currentPeriod;
            sendSSE('current', { period: currentPeriod, number: currentNumber, lastFetchAt });
            console.info('Pushed SSE current event for period', currentPeriod);
        }

        persistCacheToRedis().catch(() => {});

        return res.json({
            ok: true,
            source: 'live',
            lastFetchAt,
            current: {
                period: liveData.current?.issueNumber ?? '-',
                number: liveData.current?.number ?? '-'
            }
        });
    } catch (e) {
        console.warn('Live fetch failed in /api/current, returning cached current:', e.message);
        return res.json({
            ok: true,
            source: 'cache',
            lastFetchAt,
            current: {
                period: lastSuccessfulData?.current?.issueNumber ?? '-',
                number: lastSuccessfulData?.current?.number ?? '-'
            }
        });
    }
});

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    res.write('\n');

    // send initial comment
    res.write(': connected\n\n');

    sseClients.add(res);
    console.info('SSE client connected, total clients:', sseClients.size);

    // send current data immediately if available
    if (lastSuccessfulData && lastSuccessfulData.current) {
        const cp = lastSuccessfulData.current.issueNumber ?? '-';
        const cn = lastSuccessfulData.current.number ?? '-';
        res.write(`event: current\ndata: ${JSON.stringify({ period: cp, number: cn, lastFetchAt })}\n\n`);
        lastSentPeriod = cp;
    }

    // Trigger an immediate fetch to try to get the freshest data when a client connects
    refreshCache().catch(() => {});

    req.on('close', () => {
        sseClients.delete(res);
        try { res.end(); } catch (e) {}
        console.info('SSE client disconnected, total clients:', sseClients.size);
    });
});

// 2. Health endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, lastFetchAt, cachePresent: cachedPrediction !== null, circuitOpen: Date.now() < circuitOpenUntil });
});

// 3. Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== Process-level safety / graceful shutdown ====================
async function shutdown(signal) {
    console.info(`Received ${signal} - shutting down gracefully`);
    try {
        if (redis) {
            await redis.quit();
            console.info('Redis connection closed');
        }
    } catch (e) {
        console.warn('Error while closing Redis:', e.message);
    }
    // allow process manager to restart or exit
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    // Do not exit immediately; rely on process manager to restart if needed
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Do not exit immediately; rely on process manager to restart if needed
});

// ==================== Server Start ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 WinGo Panel running on http://localhost:${PORT}`);
    console.log('📊 API Endpoints:');
    console.log('   • GET /api/wingo - Current & Next prediction');
    console.log('   • GET /api/current - Current period & number only (white-label)');
    console.log('   • GET /events - Server-Sent Events for real-time updates');
    console.log('   • GET /health - Service health');
});
