const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
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

let lastPeriod = "";
let cachedPrediction = null; // last computed prediction object
let lastSuccessfulData = null; // last raw data from mother API
let lastFetchAt = null; // timestamp of last successful fetch

// ==================== Helpers ====================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = RETRIES, backoff = INITIAL_BACKOFF) {
    let attempt = 0;
    while (attempt <= retries) {
        try {
            const resp = await axios.get(url, options);
            return resp;
        } catch (err) {
            attempt++;
            const isLast = attempt > retries;
            console.warn(`Fetch attempt ${attempt} failed${isLast ? ' (final)' : ''}:`, err.message);
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

async function refreshCache() {
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
        computePredictionIfNeeded(liveData);

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

// 1. Get WinGo Data with Prediction
app.get('/api/wingo', async (req, res) => {
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
                period: lastSuccessfulData?.current?.issueNumber ?? (lastSuccessfulData?.current?.issueNumber ?? '-') ,
                number: lastSuccessfulData?.current?.number ?? '-'
            },
            next: {
                period: lastPeriod,
                predicted: cachedPrediction
            }
        });
    }
});

// 2. Health endpoint
app.get('/health', (req, res) => {
    res.json({ ok: true, lastFetchAt, cachePresent: cachedPrediction !== null });
});

// 3. Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== Process-level safety ====================
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    // Keep process alive; log for operator to investigate. Prefer external process manager to restart if needed.
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // We don't immediately exit to avoid downtime; let the process manager handle restarts if needed.
});

// ==================== Server Start ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 WinGo Panel running on http://localhost:${PORT}`);
    console.log('📊 API Endpoints:');
    console.log('   • GET /api/wingo - Current & Next prediction');
    console.log('   • GET /health - Service health');
});
