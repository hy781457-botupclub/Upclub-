const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path'); // यह लाइन एरर ठीक करेगी
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// API मार्ग
app.get('/api/live', async (req, res) => {
    try {
        const ts = Date.now();
        const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.data && response.data.list) {
            const last = response.data.list[0];
            res.json({
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                size: last.number >= 5 ? 'BIG' : 'SMALL'
            });
        } else {
            res.status(404).json({ error: "No Data" });
        }
    } catch (e) {
        res.status(500).json({ error: "Offline" });
    }
});

// मुख्य पेज पर HTML दिखाना
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Engine Active"));
