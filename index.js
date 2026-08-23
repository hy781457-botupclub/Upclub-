const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;


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
// DASHBOARD API
// ================================

app.get("/api/data", async (req, res) => {

    try {

        /*
         * ==========================================
         * EXISTING SOURCE DATA
         * ==========================================
         *
         * Yahan tumhara existing source-response
         * variable aayega.
         *
         * Example structure:
         *
         * responseData = {
         *   data: {
         *     list: [...]
         *   },
         *   serviceTime: ...
         * }
         *
         * LIVE LOTTERY SOURCE REQUEST
         * Yahan intentionally add nahi kiya gaya.
         */

        const responseData = null;


        // ==========================================
        // HISTORY
        // ==========================================

        const list =
            responseData?.data?.list || [];


        // ==========================================
        // LATEST RESULT
        // ==========================================

        const latest =
            list[0] || {};


        // ==========================================
        // SOURCE MAPPING
        // ==========================================

        const period =
            latest.issueNumber ?? null;

        const result =
            latest.number ?? null;

        const color =
            latest.color ?? null;

        const serviceTime =
            responseData?.serviceTime ?? null;


        // ==========================================
        // RESPONSE FOR index.html
        // ==========================================

        res.json({

            ok: true,

            period:
                period ?? "—",

            result:
                result ?? "—",

            timer:
                null,

            next:
                null,

            color:
                color ?? "—",

            history:
                Array.isArray(list)
                    ? list.slice(0, 10)
                    : [],

            serviceTime:
                serviceTime ?? null

        });

    } catch (error) {

        console.error(
            "API ERROR:",
            error.message
        );

        res.status(500).json({

            ok: false,

            error: "Unable to load data",

            period: "—",

            result: "—",

            timer: null,

            next: null,

            history: []

        });
    }
});


// ================================
// DASHBOARD PAGE
// ================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// ================================
// 404
// ================================

app.use((req, res) => {

    res.status(404).json({
        ok: false,
        error: "Not found"
    });

});


// ================================
// START SERVER
// ================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
