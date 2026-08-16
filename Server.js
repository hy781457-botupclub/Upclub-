const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const HISTORY_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";
const LIVE_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

let lastPeriod = "";
let cachedPrediction = null;

app.get('/api/wingo', async (req, res) => {
    try {
        const [histRes, liveRes] = await Promise.all([
            axios.get(HISTORY_URL + "?ts=" + Date.now()),
            axios.get(LIVE_URL + "?ts=" + Date.now())
        ]);

        const historyList = histRes.data?.data?.list || [];
        const liveData = liveRes.data?.data || {}; // Check if it's data.data or data.current
        const lastWin = historyList[0] || {};
        const nextP = liveData.issueNumber || (parseInt(lastWin.issueNumber) + 1).toString();

        let smallCount = 0, bigCount = 0;
        const analysisData = historyList.slice(0, 50);
        analysisData.forEach(item => {
            const n = parseInt(item.number);
            if (n >= 5) bigCount++; else smallCount++;
        });

        const bigPercent = analysisData.length > 0 ? Math.round((bigCount / analysisData.length) * 100) : 50;
        const smallPercent = 100 - bigPercent;

        if (nextP !== lastPeriod) {
            lastPeriod = nextP;
            let finalNum;
            // Simple logic: Trend ke hisaab se random number
            if (bigPercent > 60) finalNum = Math.floor(Math.random() * 5) + 5; 
            else if (smallPercent > 60) finalNum = Math.floor(Math.random() * 5);
            else finalNum = Math.floor(Math.random() * 10);

            cachedPrediction = {
                number: finalNum,
                size: finalNum >= 5 ? "BIG" : "SMALL"
            };
        }

        res.json({
            ok: true,
            current: { period: lastWin.issueNumber || "-", number: lastWin.number || "-" },
            analysis: { small_percent: smallPercent + "%", big_percent: bigPercent + "%" },
            next: {
                period: nextP,
                predicted_number: cachedPrediction?.number ?? "-",
                predicted_size: cachedPrediction?.size || "-"
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));