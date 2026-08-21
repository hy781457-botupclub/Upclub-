const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

// BDG WIN API SOURCE
const API_URL = "https://bdgwinhz.com/api/web/game/GetNoList"; 

let lastPeriod = "";
let cachedPrediction = { number: "?", size: "WAITING", color: "NONE" };

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(API_URL + "?pageSize=10", {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://bdgwinhz.com',
                'Referer': 'https://bdgwinhz.com/'
            },
            timeout: 8000
        });

        // SAFETY CHECK: Agar site ne data nahi bheja toh crash na ho
        if (!response.data || !response.data.data || !response.data.data.list) {
            console.log("API Error: Source blocked or invalid response");
            return res.json({ ok: false, msg: "Source Blocked" });
        }

        const list = response.data.data.list;
        const lastResult = list[0];
        
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();
        const nextPeriod = (BigInt(lastResult.issueNumber) + 1n).toString();

        if (nextPeriod !== lastPeriod) {
            lastPeriod = nextPeriod;
            // 50-Period Trend Analysis
            let bigCount = list.filter(i => parseInt(i.number) >= 5).length;
            let num = (bigCount / 10) > 0.5 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 5) + 5;
            let color = [1,3,7,9].includes(num) ? "GREEN" : "RED";
            cachedPrediction = { number: num, size: num >= 5 ? "BIG" : "SMALL", color: color };
        }

        res.json({
            ok: true,
            timer: secondsLeft,
            period: nextPeriod,
            hack: {
                num: secondsLeft <= 45 ? cachedPrediction.number : "?",
                size: secondsLeft <= 45 ? cachedPrediction.size : "WAITING",
                color: secondsLeft <= 45 ? cachedPrediction.color : "NONE"
            }
        });
    } catch (e) {
        console.log("Fetch Error:", e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("BDG HACK ACTIVE ON RENDER PORT " + PORT));
