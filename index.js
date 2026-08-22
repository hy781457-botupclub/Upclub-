const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const MY_KEY = "ab8eb981-1229-4cd7-b00c-a275ea6a97de";

// तेरे app.js के हिसाब से मुख्य रूट
app.get('/GetLotteryCategoryList', async (req, res) => {
    try {
        const response = await axios.post('https://bsc.nownodes.io', {
            jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1
        }, {
            headers: { 'Content-Type': 'application/json', 'api-key': MY_KEY }
        });

        const blockNum = parseInt(response.data.result, 16);
        
        // यह डेटा फॉर्मेट तेरे app.js की मांग के अनुसार है
        res.json({
            success: true,
            data: [
                {
                    categoryName: "WinGo",
                    issueNumber: blockNum.toString().slice(-6),
                    number: (blockNum % 10).toString(),
                    nextIssue: (blockNum + 1).toString().slice(-6),
                    prediction: (blockNum % 10) >= 5 ? "BIG" : "SMALL"
                }
            ]
        });
    } catch (e) {
        res.json({ success: false, data: [] });
    }
});

// तेरे app.js में मौजूद अन्य रूट्स के लिए डमी रिस्पॉन्स (ताकि एरर न आए)
app.get('/GetBannerList', (req, res) => res.json({ success: true, data: [] }));
app.get('/GetHomeSettings', (req, res) => res.json({ success: true, data: {} }));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Gaming Panel Engine Live on ${PORT}`));
