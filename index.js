const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

// BDG/WinGo API Source
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(API_URL + "?pageSize=5");
        const lastResult = response.data.data.list[0];
        
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();
        
        // Next Period ID Calculation
        const nextPeriod = (BigInt(lastResult.issueNumber) + 1n).toString();

        res.json({
            ok: true,
            timer: secondsLeft,
            period: nextPeriod,
            hack: {
                num: secondsLeft <= 40 ? lastResult.number : "?",
                size: parseInt(lastResult.number) >= 5 ? "BIG" : "SMALL",
                color: [1,3,7,9].includes(parseInt(lastResult.number)) ? "GREEN" : "RED"
            }
        });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Active on Port " + PORT));
