const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 10000;
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

app.get('/api/wingo', async (req, res) => {
    try {
        // IP Security Headers: API को भ्रमित करने के लिए [cite chunk_id=c11_chemistry_ch62_p12_para2 source="📘 NCERT Chemistry Part-I - S.., Pg:12" source_short="📘"]
        const response = await axios.get(`<latex>{API_URL}?ts=</latex>{Date.now()}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://ar-lottery01.com/',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 5000
        });

        const data = response.data?.data || {};
        const current = data.current || {};
        const history = data.list || [];

        // पक्का रिजल्ट मैपिंग
        const period = current.issueNumber || (history[0] ? history[0].issueNumber : "-");
        const number = current.number || (history[0] ? history[0].number : "-");
        const nextPeriod = period !== "-" ? (BigInt(period) + 1n).toString() : "-";

        res.json({
            ok: true,
            period: period,
            result: number,
            next: nextPeriod,
            history: history.slice(0, 10)
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: "Syncing..." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Secure Server Live on ${PORT}`));
