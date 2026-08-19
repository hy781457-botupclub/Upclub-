const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";

app.get('/api/wingo', async (req, res) => {
    try {
        // NowNodes को सही तरीके से POST रिक्वेस्ट भेजना
        const response = await axios.post('https://eth.nownodes.io', {
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'api-key': MY_KEY // Key को हेडर में भेजना अनिवार्य है
            }
        });

        if (response.data && response.data.result) {
            const hexBlock = response.data.result;
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
        } else {
            res.json({ ok: false, error: "Node Error" });
        }
    } catch (e) {
        console.error("RPC Error:", e.response ? e.response.status : e.message);
        res.json({ ok: false, error: "Syncing..." });
    }
});

// HTML फाइल सर्व करना
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
