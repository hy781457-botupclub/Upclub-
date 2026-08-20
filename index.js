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
let cachedPrediction = { number: "-", size: "-", color: "-" };

app.get('/api/wingo', async (req, res) => {
    try {
        const [histRes, liveRes] = await Promise.all([
            axios.get(HISTORY_URL + "?pageSize=50&ts=" + Date.now()),
            axios.get(LIVE_URL + "?ts=" + Date.now())
        ]);

        const historyList = histRes.data?.data?.list || [];
        const liveData = liveRes.data?.current || {};
        const lastWin = historyList[0] || {};
        const nextP = liveData.issueNumber || "-";

        if (nextP !== lastPeriod && nextP !== "-") {
            lastPeriod = nextP;
            // 50-Period Analysis Logic
            let bigCount = historyList.slice(0, 50).filter(i => parseInt(i.number) >= 5).length;
            let bigProb = (bigCount / 50) * 100;
            
            let num = bigProb > 55 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 5) + 5;
            let color = [1,3,7,9].includes(num) ? "GREEN" : ([2,4,6,8].includes(num) ? "RED" : "VIOLET");
            
            cachedPrediction = { number: num, size: num >= 5 ? "BIG" : "SMALL", color: color };
        }

        res.json({
            ok: true,
            current: { period: lastWin.issueNumber, number: lastWin.number },
            next: {
                period: nextP,
                predicted_number: cachedPrediction.number,
                predicted_size: cachedPrediction.size,
                predicted_color: cachedPrediction.color
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
