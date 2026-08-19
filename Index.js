const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 10000;
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

app.get('/api/wingo', async (req, res) => {
    try {
        // सीधे मदर सोर्स से डेटा खींचना
        const response = await axios.get(`<latex>{API_URL}?ts=</latex>{Date.now()}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = response.data?.data || {};
        const current = data.current || {};
        
        const p = current.issueNumber || "-";
        const n = current.number || "-";
        const next = p !== "-" ? (BigInt(p) + 1n).toString() : "-";

        res.json({
            ok: true,
            period: p,
            result: n, // लाइव नंबर यहाँ आएगा
            next: next
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: "Syncing" });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Direct Sync on ${PORT}`));
