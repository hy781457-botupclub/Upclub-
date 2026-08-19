const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";
// NowNodes के लिए सही URL फॉर्मेट
const RPC_URL = "https://eth.nownodes.io/" + MY_KEY;

app.get('/api/wingo', async (req, res) => {
    try {
        const response = await axios.post(RPC_URL, {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data && response.data.result) {
            const hexBlock = response.data.result;
            const blockNumber = parseInt(hexBlock, 16);

            // लाइव डेटा रिस्पॉन्स
            res.json({
                ok: true,
                period: blockNumber.toString().slice(-6),
                result: (blockNumber % 10).toString(),
                next: (blockNumber + 1).toString().slice(-6),
                predicted: { 
                    size: (blockNumber % 10) >= 5 ? "BIG" : "SMALL",
                    color: (blockNumber % 2 === 0) ? "RED" : "GREEN"
                }
            });
        } else {
            // अगर Key गलत है या प्लान एक्टिव नहीं है तो यहाँ एरर आएगी
            console.log("Auth Error Details:", response.data);
            res.json({ ok: false, error: "Authentication Failed" });
        }
    } catch (e) {
        console.error("Connection Error:", e.message);
        res.json({ ok: false, error: "Node Connection Failed" });
    }
});

// Frontend Files Serve करना
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
