const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

// 1. सुरक्षा और फाइल सेटिंग्स
app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// 2. लाइव रिजल्ट API मार्ग
app.get('/api/live-result', async (req, res) => {
    try {
        // मदर JSON सोर्स से डेटा मंगाना
        const ts = Date.now();
        const jsonUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=<latex>{ts}`;
        
        const response = await axios.get(jsonUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 10000 // 10 सेकंड का इंतज़ार
        });

        if (response.data && response.data.list && response.data.list.length > 0) {
            const last = response.data.list[0];
            
            // डेटा को क्लीन करके भेजना
            res.json({
                period: last.issueNumber,
                next_period: (BigInt(last.issueNumber) + 1n).toString(),
                number: last.number,
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                status: "success"
            });
        } else {
            res.status(404).json({ error: "No data found in JSON" });
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ error: "Live Server Error" });
    }
});

// 3. सर्वर को चालू करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`VIP Server active on port </latex>{PORT}`);
});
