const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// रास्ता (Path) बिल्कुल सही होना चाहिए
app.get('/api/live-result', async (req, res) => {
    try {
        const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${Date.now()}`;
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        if (response.data && response.data.list) {
            const last = response.data.list[0];
            res.json({
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                size: last.number >= 5 ? 'BIG' : 'SMALL'
            });
        } else {
            res.status(404).send("Data not found");
        }
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Running"));
