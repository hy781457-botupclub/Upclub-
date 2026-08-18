const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==================== Mother API ====================
const MOTHER_API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

let lastPeriod = "";
let cachedPrediction = null;

// ==================== API Endpoints ====================

// 1. Get WinGo Data with Prediction
app.get('/api/wingo', async (req, res) => {
    try {
        const response = await axios.get(`${MOTHER_API_URL}?ts=${Date.now()}`);
        const liveData = response.data?.data || {};

        const currentPeriod = liveData.current?.issueNumber || "-";
        const currentNumber = liveData.current?.number || "-";

        // Next Period Logic
        const nextPeriod = currentPeriod !== "-" ? (BigInt(currentPeriod) + 1n).toString() : "-";

        // Smart Prediction
        if (nextPeriod !== lastPeriod) {
            lastPeriod = nextPeriod;
            const rand = Math.floor(Math.random() * 10);
            cachedPrediction = {
                number: rand,
                size: rand >= 5 ? "BIG" : "SMALL",
                color: [1, 3, 7, 9].includes(rand) ? "GREEN" : (rand === 0 || rand === 5 ? "VIOLET" : "RED")
            };
        }

        res.json({
            ok: true,
            current: { period: currentPeriod, number: currentNumber },
            next: {
                period: nextPeriod,
                predicted: cachedPrediction
            }
        });
    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).json({ ok: false, error: "Failed to fetch data" });
    }
});

// 2. Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== Server Start ====================
app.listen(4000, () => {
    console.log("🚀 WinGo Panel running on http://localhost:4000");
    console.log("📊 API Endpoints:");
    console.log("   • GET /api/wingo - Current & Next prediction");
});
