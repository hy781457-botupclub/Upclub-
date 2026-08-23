const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;


// =====================================
// HEALTH
// =====================================

app.get("/health", (req, res) => {

    res.json({
        ok: true,
        server: "live",
        time: new Date().toISOString()
    });

});


// =====================================
// DASHBOARD DATA
// =====================================

app.get("/api/data", async (req, res) => {

    try {

        /*
         * SOURCE DATA PLACEHOLDER
         *
         * Yahan tumhara existing source-response
         * provide hona chahiye.
         */

        const SOURCE_DATA = null;

        const list =
            SOURCE_DATA?.data?.list || [];

        const latest =
            list[0] || {};

        const sourceData = {

            period:
                latest.issueNumber ?? null,

            history:
                list.slice(0,10)

        };


        res.json({

            ok: true,

            period:
                sourceData.period ?? "—",

            // Result intentionally hidden
            result: null,

            // Source mein available hone par fill hoga
            timer: null,

            next: null,

            history:
                sourceData.history

        });

    } catch(error) {

        console.error(
            "Data error:",
            error.message
        );

        res.status(500).json({

            ok: false,

            error: "Unable to load data",

            period: "—",

            result: null,

            timer: null,

            next: null,

            history: []

        });

    }

});


// =====================================
// DASHBOARD
// =====================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// =====================================
// START
// =====================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
