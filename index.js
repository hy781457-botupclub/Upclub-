const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;


// ==============================
// HEALTH CHECK
// ==============================

app.get('/health', (req, res) => {
    res.json({
        ok: true,
        server: 'live',
        time: new Date().toISOString()
    });
});


// ==============================
// DATA ENDPOINT
// ==============================
//
// Yahan tumhara existing data/source
// logic apne current code se rahega.
// Is route ka response HTML ke expected
// format mein hona chahiye.
//
// {
//   ok: true,
//   period: "...",
//   result: "...",
//   timer: "...",
//   next: "...",
//   history: []
// }
//
// ==============================

app.get('/api/wingo', async (req, res) => {

    try {

        // Existing source/data logic yahan rakho.
        // Main lottery source-fetching logic add nahi kar raha.

        res.json({
            ok: false,
            message: 'Data source not configured'
        });

    } catch (error) {

        console.error('API Error:', error.message);

        res.status(500).json({
            ok: false,
            error: 'Server error'
        });
    }
});


// ==============================
// DASHBOARD
// ==============================

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'index.html')
    );
});


// ==============================
// START SERVER
// ==============================

app.listen(PORT, '0.0.0.0', () => {
    console.log(
        `Server running on port ${PORT}`
    );
});
