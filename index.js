const express = require('express');
const path = require('path');
const WebSocket = require('ws'); // npm install ws
const app = express();

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";
const WSS_URL = `wss://bsc.nownodes.io/wss/<latex>{MY_KEY}`;

app.use(express.static(__dirname));

let liveData = { ok: false, period: "-", result: "-", next: "-", predicted: { size: "-", color: "-" } };

function connectToBSC() {
    const ws = new WebSocket(WSS_URL);

    ws.on('open', () => {
        console.log('Connected to BSC WebSocket');
        // नए ब्लॉक के लिए सब्सक्राइब करना
        ws.send(JSON.stringify({ "jsonrpc": "2.0", "id": 1, "method": "eth_subscribe", "params": ["newHeads"] }));
    });

    ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.params && response.params.result) {
            const blockNum = parseInt(response.params.result.number, 16);
            const lastDigit = blockNum % 10;
            
            liveData = {
                ok: true,
                period: blockNum.toString().slice(-6),
                result: lastDigit.toString(),
                next: (blockNum + 1).toString().slice(-6),
                predicted: { 
                    size: lastDigit >= 5 ? "BIG" : "SMALL",
                    color: (lastDigit % 2 === 0) ? "RED" : "GREEN"
                }
            };
        }
    });

    ws.on('close', () => {
        console.log('WSS Closed. Reconnecting...');
        setTimeout(connectToBSC, 3000);
    });
}

connectToBSC();

// HTML इसी लिंक से डेटा लेगा
app.get('/api/wingo', (req, res) => res.json(liveData));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`WSS Server running on </latex>{PORT}`));
