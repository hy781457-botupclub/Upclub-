const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const HISTORY_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";
const LIVE_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

let lastPeriod = "";
let cachedPrediction = null;

app.get('/api/wingo', async (req, res) => {
    try {
        // 500 period ke liye humein multiple pages ya bada data fetch karna hoga
        const [histRes, liveRes] = await Promise.all([
            axios.get(HISTORY_URL + "?pageSize=500&ts=" + Date.now()),
            axios.get(LIVE_URL + "?ts=" + Date.now())
        ]);

        const historyList = histRes.data?.data?.list || [];
        const liveData = liveRes.data?.current || {};
        const lastWin = historyList[0] || {};
        const nextP = liveData.issueNumber || "-";

        if (nextP !== lastPeriod && nextP !== "-") {
            lastPeriod = nextP;

            // --- 500 PERIOD DEEP ANALYSIS ---
            let counts = Array(10).fill(0);
            historyList.forEach(item => {
                let n = parseInt(item.number);
                if (!isNaN(n)) counts[n]++;
            });

            // Sabse kam baar aane wala number (Cold Number Theory)
            let predictedNum = counts.indexOf(Math.min(...counts));
            
            // Color Logic
            let color = "GREEN";
            if ([1, 3, 7, 9].includes(predictedNum)) color = "GREEN";
            else if ([2, 4, 6, 8].includes(predictedNum)) color = "RED";
            else if (predictedNum === 0 || predictedNum === 5) color = "VIOLET";

            cachedPrediction = {
                number: predictedNum,
                size: predictedNum >= 5 ? "BIG" : "SMALL",
                color: color
            };
        }

        res.json({
            ok: true,
            current: { period: lastWin.issueNumber, number: lastWin.number },
            next: {
                period: nextP,
                predicted_number: cachedPrediction?.number,
                predicted_size: cachedPrediction?.size,
                predicted_color: cachedPrediction?.color
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(3000, '0.0.0.0', () => console.log("500-Period Hack Server Live"));
