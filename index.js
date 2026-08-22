const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";

// NowNodes से लाइव डेटा लाने वाला फंक्शन
async function getBlockchainData() {
    try {
        const res = await axios.post('https://bsc.nownodes.io', 
        { jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 },
        { headers: { 'api-key': MY_KEY } });
        const block = parseInt(res.data.result, 16);
        return {
            period: block.toString().slice(-6),
            num: (block % 10).toString()
        };
    } catch (e) { return { period: "---", num: "-" }; }
}

// मास्टर रूट: जो तेरी स्क्रिप्ट मांग रही है
app.all(['/GetLotteryCategoryList', '/GetWinTheLotteryResult', '/api/data'], async (req, res) => {
    const data = await getBlockchainData();
    res.json({
        success: true,
        ok: true, // दोनों तरह के रिस्पॉन्स के लिए
        timer: 60 - new Date().getSeconds(),
        period: data.period,
        data: [{ categoryName: "WinGo", issueNumber: data.period, number: data.num }],
        hack: { num: data.num, size: parseInt(data.num) >= 5 ? "BIG" : "SMALL", color: parseInt(data.num) % 2 === 0 ? "RED" : "GREEN" }
    });
});

// बाकी सभी Get रिक्वेस्ट के लिए खाली जवाब
app.get('/Get*', (req, res) => res.json({ success: true, data: [] }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Master Proxy Engine Live"));
