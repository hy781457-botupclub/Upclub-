const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '/')));

app.get('/api/live-result', async (req, res) => {
    try {
        const ts = Date.now();
        const jsonUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        
        const response = await axios.get(jsonUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.data && response.data.list) {
            const last = response.data.list[0];
            res.json({
                period: last.issueNumber,
                next_period: parseInt(last.issueNumber) + 1,
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                number: last.number
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Offline" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Live"));
