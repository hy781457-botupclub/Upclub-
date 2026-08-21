const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.static(__dirname));

// BDG WIN API ENDPOINT
const API_URL = "https://bdgwin.com/api/web/game/GetNoList"; 

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get(API_URL + "?pageSize=10");
        const list = response.data.data.list;
        const current = list[0];
        
        // BDG 1-Min Timer Logic
        const now = new Date();
        const secondsLeft = 60 - now.getSeconds();

        res.json({
            ok: true,
            timer: secondsLeft,
            period: (parseInt(current.issueNumber) + 1).toString(),
            last_num: current.number,
            // 40 sec pehle leaked data (Simulated from actual source trend)
            hack: {
                num: secondsLeft <= 40 ? current.number : "?",
                size: parseInt(current.number) >= 5 ? "BIG" : "SMALL",
                color: [1,3,7,9].includes(parseInt(current.number)) ? "GREEN" : "RED"
            }
        });
    } catch (e) { res.status(500).json({ ok: false }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log("BDG HACK LIVE"));
