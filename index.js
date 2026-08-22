const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const BDG_API = "https://api.bdg88zf.com/GetWinTheLotteryResult";

// सुरक्षित डेटा फेचिंग फंक्शन
async function fetchBDGData() {
    try {
        const response = await axios.post(BDG_API, { type: 1 }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Mobile Safari/537.36',
                'Referer': 'https://bdg88zf.com/',
                'Origin': 'https://bdg88zf.com'
            },
            timeout: 5000
        });
        return response.data.data || null;
    } catch (e) {
        return null;
    }
}

// मास्टर डेटा रूट (HTML और Script दोनों के लिए)
app.all(['/api/data', '/GetWinTheLotteryResult', '/GetLotteryCategoryList'], async (req, res) => {
    const data = await fetchBDGData();
    
    if (data) {
        const num = data.number;
        res.json({
            ok: true,
            success: true,
            timer: 60 - new Date().getSeconds(),
            period: data.issueNumber,
            hack: {
                num: num,
                size: parseInt(num) >= 5 ? "BIG" : "SMALL",
                color: (num == 0 || num == 5) ? "VIOLET" : (num % 2 === 0 ? "RED" : "GREEN")
            },
            data: [{ categoryName: "WinGo", issueNumber: data.issueNumber, number: num }]
        });
    } else {
        res.json({ ok: false, message: "Proxy Syncing..." });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.
