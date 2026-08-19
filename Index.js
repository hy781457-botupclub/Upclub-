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
        // सही URL फॉर्मेट और टाइमस्टैम्प
        const response = await axios.get(`<latex>{API_URL}?ts=</latex>{Date.now()}`, {
            headers: { 
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        // डेटा स्ट्रक्चर को चेक करना
        const apiData = response.data;
        // ध्यान दें: अगर API सीधे ऑब्जेक्ट भेजती है तो response.data ही काफी है
        const current = apiData?.data?.current || apiData?.current || {};
        
        const p = current.issueNumber || "999999";
        const n = current.number || "00-00-00";

        res.json({
            ok: true,
            period: p,
            result: n,
            time: new Date().toLocaleTimeString()
        });
    } catch (e) {
        console.error("Fetch Error:", e.message);
        res.status(500).json({ ok: false, error: "Connection Error" });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Direct Sync on ${PORT}`));
