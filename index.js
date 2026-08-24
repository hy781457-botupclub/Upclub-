const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// CORS को ऑन करना बहुत ज़रूरी है ताकि Acode या ब्राउज़र ब्लॉक न करे
app.use(cors());

app.get('/api/live', async (req, res) => {
    try {
        const ts = Date.now();
        const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        if (response.data && response.data.list) {
            const last = response.data.list[0];
            // सीधे सटीक डेटा भेजना
            res.json({
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                number: last.number
            });
        } else {
            res.status(404).json({ error: "No Data Found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Mother API Offline" });
    }
});

// मुख्य पेज पर एक छोटा सा मैसेज
app.get('/', (req, res) => {
    res.send("<h1>VIP SERVER ACTIVE: USE /api/live TO GET DATA</h1>");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Predictor Engine Live"));
