const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static('.')); // HTML फाइल को सर्व करने के लिए

app.get('/api/live-result', async (req, res) => {
    try {
        // आपके द्वारा दिया गया लाइव JSON सोर्स
        const ts = Date.now();
        const jsonUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=<latex>{ts}`;
        
        const response = await axios.get(jsonUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (response.data && response.data.list) {
            const last = response.data.list[0];
            
            // लाइव डेटा रिस्पॉन्स
            res.json({
                period: last.issueNumber,
                number: last.number,
                color: last.number % 2 === 0 ? 'RED' : 'GREEN',
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                next_period: parseInt(last.issueNumber) + 1,
                server_time: new Date().toLocaleTimeString()
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Live Server Offline" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Live Sync Active on </latex>{PORT}`));
