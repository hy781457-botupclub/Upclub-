const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static(__dirname));

// LIVE WINGO SOURCE (Not History)
const LIVE_API = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json"; 

app.get('/api/live-hack', async (req, res) => {
    try {
        const response = await axios.get(LIVE_API + "?ts=" + Date.now());
        const data = response.data;
        
        // Timer calculation
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();

        res.json({
            ok: true,
            timer: secondsLeft,
            period: data.current.issueNumber, // Current active period
            // Direct result leak logic
            hack: {
                num: data.current.number, // Asli leaked number
                size: parseInt(data.current.number) >= 5 ? "BIG" : "SMALL",
                color: [1,3,7,9].includes(parseInt(data.current.number)) ? "GREEN" : "RED"
            }
        });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("BDG LIVE SOURCE ACTIVE"));
