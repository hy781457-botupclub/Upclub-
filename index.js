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
        const response = await axios.get(`<latex>{API_URL}?ts=</latex>{Date.now()}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        // यूनियन लॉजिक: लाइव और इतिहास को जोड़ना [cite chunk_id=c11_maths_ch76_p14_para0 source="📘 NCERT Mathematics - Sets, Pg:14" source_short="📘"]
        const data = response.data?.data || {};
        const history = data.list || [];
        const current = data.current || {};

        // अगर करंट नंबर खाली है, तो इतिहास का पहला नंबर उठाओ
        const period = current.issueNumber || (history[0] ? history[0].issueNumber : "-");
        const number = current.number || (history[0] ? history[0].number : "-");

        const nextPeriod = period !== "-" ? (BigInt(period) + 1n).toString() : "-";

        res.json({
            ok: true,
            period: period,
            result: number,
            next: nextPeriod
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: "Syncing..." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server Live on ${PORT}`));
