const express = require('express');
const axios = require('axios');
const cors = require('cors'); // यह ज़रूरी है
const path = require('path');
const app = express();

app.use(cors()); // सभी को अनुमति दें
app.use(express.static(path.join(__dirname, '/')));

app.get('/api/live-result', async (req, res) => {
    try {
        const ts = Date.now();
        const jsonUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;
        const response = await axios.get(jsonUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000 
        });
        
        if (response.data && response.data.list) {
            const last = response.data.list[0];
            return res.json({
                next_period: parseInt(last.issueNumber) + 1,
                size: last.number >= 5 ? 'BIG' : 'SMALL'
            });
        }
        res.status(404).json({ error: "No Data" });
    } catch (error) {
        console.error("Server Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server Live on Port " + PORT));
