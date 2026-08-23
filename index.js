const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// यहाँ से बदलाव शुरू है
app.get('/api/live-result', async (req, res) => {
    try {
        const ts = Date.now();
        const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Sec-Ch-Ua': '"Not=A?Brand";v="99", "Android WebView";v="151", "Chromium";v="151"',
                'Sec-Ch-Ua-Mobile': '?1',
                'Sec-Ch-Ua-Platform': '"Android"',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 10000
        });

        if (response.data && response.data.list) {
            const last = response.data.list[0];
            res.json({
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                size: last.number >= 5 ? 'BIG' : 'SMALL'
            });
        } else {
            res.status(404).json({ error: "No Data" });
        }
    } catch (error) {
        res.status(500).json({ error: "Connection Failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Engine Active"));
