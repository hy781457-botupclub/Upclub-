const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

/*
 * Health check
 */
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        server: "live",
        time: new Date().toISOString()
    });
});

/*
 * Dashboard data endpoint
 *
 * Yahan tumhara apna existing,
 * non-lottery data source connect kiya ja sakta hai.
 */
app.get("/api/data", async (req, res) => {
    try {
        res.json({
            ok: false,
            message: "Data source not configured",
            period: "—",
            result: "—",
            timer: "—",
            next: "—",
            history: []
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            ok: false,
            error: "Server error"
        });
    }
});

/*
 * Dashboard
 */
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/*
 * Start
 */
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
