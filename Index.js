const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";
const RPC_URL = `https://eth.nownodes.io/<latex>{MY_KEY}`;

app.use(express.static(path.join(__dirname)));

app.get('/api/wingo', async (req, res) => {
    try {
        // NowNodes को POST रिक्वेस्ट भेजना
        const response = await axios.post(RPC_URL, {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 83
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        // ब्लॉक नंबर को हेक्साडेसिमल से नंबर में बदलना
        const hexBlock = response.data.result;
        const blockNumber = parseInt(hexBlock, 16);

        // Wingo स्टाइल में दिखाने के लिए लॉजिक
        res.json({
            ok: true,
            period: blockNumber.toString().slice(-6), // ब्लॉक के आखिरी 6 अंक पीरियड की तरह
            result: (blockNumber % 10).toString(), // आखिरी अंक को रिजल्ट की तरह
            next: (blockNumber + 1).toString().slice(-6)
        });
    } catch (e) {
        console.error("RPC Error:", e.message);
        res.json({ ok: false, error: "Node Offline" });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Blockchain Panel on </latex>{PORT}`));
