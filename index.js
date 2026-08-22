const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.post('https://bsc.nownodes.io', {
            jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1
        }, {
            headers: { 'Content-Type': 'application/json', 'api-key': MY_KEY }
        });

        const blockNum = parseInt(response.data.result, 16);
        const lastDigit = blockNum % 10;
        
        // लाइव टाइमर लॉजिक
        const now = new Date();
        const timer = 60 - now.getSeconds();

        res.json({
            ok: true,
            timer: timer,
            period: blockNum.toString().slice(-6),
            hack: {
                num: lastDigit.toString(),
                size: lastDigit >= 5 ? "BIG" : "SMALL",
                color: (lastDigit % 2 === 0) ? "RED" : "GREEN"
            }
        });
    } catch (e) {
        res.json({ ok: false });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Engine Live on ${PORT}`));
