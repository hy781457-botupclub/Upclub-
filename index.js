const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// WinGo के लाइव डेटा का स्रोत
const API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.get('/api/wingo', async (req, res) => {
    try {
        // ताज़ा डेटा मंगाना
        const response = await axios.get(API_URL + "?ts=" + Date.now());
        const list = response.data?.data?.list || [];
        const lastWin = list[0] || {}; 

        const currentP = lastWin.issueNumber || "-";
        
        // अगले पीरियड की गणना (n + 1)
        const nextP = currentP !== "-" ? String(BigInt(currentP) + 1n) : "-";

        res.json({
            ok: true,
            current: {
                period: currentP,
                number: lastWin.number || "-",
                last_num: lastWin.number || "-"
            },
            next: {
                period: nextP,
                // रैंडम प्रेडिक्शन (Simulation)
                number: Math.floor(Math.random() * 10) 
            }
        });
    } catch (e) {
        // एरर मैसेज को साफ़ दिखाना
        res.json({ ok: false, error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server Live on ${PORT}`));
