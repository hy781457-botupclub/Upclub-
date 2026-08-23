const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

app.get('/api/live-result', async (req, res) => {
    try {
        const ts = Date.now();
        // मदर JSON सोर्स का पक्का लिंक
        const url = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000 
        });

        if (response.data && response.data.list && response.data.list.length > 0) {
            const last = response.data.list[0];
            // JSON रिस्पॉन्स भेजना
            res.status(200).json({
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                number: last.number
            });
        } else {
            res.status(404).json({ error: "Data not available at source" });
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ error: "Server connection failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Engine Started"));
