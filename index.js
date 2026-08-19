const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";
const RPC_URL = `https://eth.nownodes.io/</latex>{MY_KEY}`;

app.get('/api/wingo', async (req, res) => {
    try {
        const response = await axios.post(RPC_URL, {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 83
        }, {
            headers: { 'Content-Type': 'application/json' }
        });

        const hexBlock = response.data.result;
        if (!hexBlock) throw new Error("No data from Node");
        
        const blockNumber = parseInt(hexBlock, 16);

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
    } catch (e) {
        console.error("RPC Error:", e.message);
        res.json({ ok: false, error: "Node Syncing..." });
    }
});

// index.html को सर्व करने के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Blockchain Panel on ${PORT}`));
