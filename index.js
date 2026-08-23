const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

const TEST_API =
    "https://jsonplaceholder.typicode.com/posts";


// ================================
// HEALTH CHECK
// ================================

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        server: "live",
        time: new Date().toISOString()
    });
});


// ================================
// TEST DATA API
// ================================

app.get("/api/data", async (req, res) => {

    try {

        const response = await axios.get(TEST_API);

        const posts = Array.isArray(response.data)
            ? response.data.slice(0, 10)
            : [];

        const latest = posts[0] || {};

        res.json({
            ok: true,

            period:
                latest.id
                    ? String(latest.id)
                    : "—",

            result:
                latest.userId !== undefined
                    ? String(latest.userId)
                    : "—",

            timer: null,

            next:
                latest.id
                    ? String(Number(latest.id) + 1)
                    : "—",

            history: posts.map(item => ({
                issueNumber: String(item.id),
                number: String(item.userId),
                title: item.title
            }))
        });

    } catch (error) {

        console.error(
            "Test API error:",
            error.message
        );

        res.status(500).json({
            ok: false,
            error: "Unable to load test data"
        });
    }
});


// ================================
// DASHBOARD
// ================================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "index.html")
    );
});


// ================================
// START SERVER
// ================================

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Server running on port ${PORT}`
    );
});
