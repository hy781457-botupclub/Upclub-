const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

// DIRECT BDG WIN API SOURCE
const SOURCE_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(SOURCE_URL + "?pageSize=5");
        const current = response.data.data.list[0];
        
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();
        const nextPeriod = (BigInt(current.issueNumber) + 1n).toString();

        res.json({
            ok: true,
            timer: secondsLeft,
            period: nextPeriod,
            // Direct source data bypass
            hack: {
                num: secondsLeft <= 45 ? current.number : "?",
                size: parseInt(current.number) >= 5 ? "BIG" : "SMALL",
                color: [1,3,7,9].includes(parseInt(current.number)) ? "GREEN" : "RED"
            }
        });
    } catch (e) { res.status(500).json({ ok: false }); }
});
