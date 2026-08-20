const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";

app.get('/api/wingo', async (req, res) => {
    try {
        const response = await axios.post('https://bsc.nownodes.io', {
            jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1
        }, {
            headers: { 'Content-Type': 'application/json', 'api-key': MY_KEY }
        });

        const blockNum = parseInt(response.data.result, 16);
        res.json({
            ok: true,
            period: blockNum.toString().slice(-6),
            result: (blockNum % 10).toString(),
            next: (blockNum + 1).toString().slice(-6),
            predicted: { 
                size: (blockNum % 10) >= 5 ? "BIG" : "SMALL",
                color: (blockNum % 2 === 0) ? "RED" : "GREEN"
            }
        });
    } catch (e) {
        res.json({ ok: false, error: "Syncing..." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server Live on ${PORT}`));
