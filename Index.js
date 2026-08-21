const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

// ASLI LIVE WSS LINK (Network tab se nikali gayi)
const WSS_URL = "wss://ws.ar-lottery01.com/websocket"; 

let liveHack = { period: "-", num: "?", size: "WAITING", timer: 60, color: "NONE" };

function connectWSS() {
    const ws = new WebSocket(WSS_URL);

    ws.on('open', () => {
        console.log("CONNECTED TO BDG LIVE SOURCE");
        // WinGo 1M subscribe message
        ws.send(JSON.stringify({ "action": "subscribe", "game": "wingo1m" }));
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data);
        // Jab server agla result leak kare
        if (msg.type === 'result_leak' || msg.type === 'upcoming') {
            liveHack.period = msg.period;
            liveHack.num = msg.number; // Asli leaked number
            liveHack.size = msg.number >= 5 ? "BIG" : "SMALL";
            liveHack.color = [1,3,7,9].includes(msg.number) ? "GREEN" : "RED";
            liveHack.timer = msg.time_left;
        }
    });

    ws.on('close', () => setTimeout(connectWSS, 5000)); // Auto reconnect
}

connectWSS();

app.get('/api/live-data', (req, res) => res.json(liveHack));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("HACK SERVER ACTIVE"));
