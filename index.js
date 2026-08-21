const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static(__dirname));

// NAYA DOMAIN JO CERTIFICATE SE MILA HAI
const API_URL = "https://bdgwinhz.com/api/web/game/GetNoList"; 

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(API_URL + "?pageSize=50");
        const list = response.data.data.list;
        const current = list[0];
        
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();
        const nextPeriod = (BigInt(current.issueNumber) + 1n).toString();

        // 50-Period Analysis
        let bigCount = list.filter(i => parseInt(i.number) >= 5).length;
        let num = (bigCount / 50) > 0.5 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 5) + 5;
        let color = [1,3,7,9].includes(num) ? "GREEN" : "RED";

        res.json({
            ok: true,
            timer: secondsLeft,
            period: nextPeriod,
            hack: {
                num: secondsLeft <= 45 ? num : "?",
                size: secondsLeft <= 45 ? (num >= 5 ? "BIG" : "SMALL") : "WAITING",
                color: secondsLeft <= 45 ? color : "NONE"
            }
        });
    } catch (e) { res.status(500).json({ ok: false }); }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.listen(process.env.PORT || 3000);
