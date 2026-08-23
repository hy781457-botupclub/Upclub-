const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// यह आपकी HTML फाइल को इंटरनेट पर दिखाने के लिए है
app.use(express.static(path.join(__dirname, '/')));

// यह मुख्य API है जो लाइव डेटा मंगाती है
app.get('/api/live-result', async (req, res) => {
    try {
        // ताज़ा समय (Timestamp) ताकि पुराना डेटा न मिले
        const ts = Date.now();
        const jsonUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=<latex>{ts}`;
        
        // सीधे JSON सोर्स को हिट करना
        const response = await axios.get(jsonUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
                'Accept': 'application/json'
            },
            timeout: 5000 // 5 सेकंड का टाइमआउट
        });

        if (response.data && response.data.list) {
            const last = response.data.list[0];
            
            // डेटा को प्रोसेस करना
            res.json({
                period: last.issueNumber,
                next_period: parseInt(last.issueNumber) + 1,
                size: last.number >= 5 ? 'BIG' : 'SMALL',
                number: last.number,
                status: "Success"
            });
        } else {
            res.status(404).json({ error: "Data format error" });
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
        res.status(500).json({ error: "Live Server Offline" });
    }
});

// Render के पोर्ट पर सर्वर शुरू करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port </latex>{PORT}`);
});
