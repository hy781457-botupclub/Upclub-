const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==================== MongoDB Connection ====================
const MONGO_URI = "mongodb+srv://admin:password@cluster0.mongodb.net/upclub?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ==================== MongoDB Schema ====================
const predictionSchema = new mongoose.Schema({
    period: String,
    currentNumber: String,
    predictedNumber: Number,
    predictedSize: String,
    predictedColor: String,
    timestamp: { type: Date, default: Date.now },
    isCorrect: { type: Boolean, default: null }
});

const liveDataSchema = new mongoose.Schema({
    period: String,
    number: String,
    timestamp: { type: Date, default: Date.now }
});

const Prediction = mongoose.model('Prediction', predictionSchema);
const LiveData = mongoose.model('LiveData', liveDataSchema);

// ==================== Mother API ====================
const MOTHER_API_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M.json";

let lastPeriod = "";
let cachedPrediction = null;

// ==================== API Endpoints ====================

// 1. Get WinGo Data with Prediction
app.get('/api/wingo', async (req, res) => {
    try {
        const response = await axios.get(`${MOTHER_API_URL}?ts=${Date.now()}`);
        const liveData = response.data?.data || {};

        const currentPeriod = liveData.current?.issueNumber || "-";
        const currentNumber = liveData.current?.number || "-";

        // Save Live Data to MongoDB
        if (currentPeriod !== "-" && currentNumber !== "-") {
            const newLiveData = new LiveData({
                period: currentPeriod,
                number: currentNumber
            });
            await newLiveData.save();
        }

        // Next Period Logic
        const nextPeriod = currentPeriod !== "-" ? (BigInt(currentPeriod) + 1n).toString() : "-";

        // Smart Prediction
        if (nextPeriod !== lastPeriod) {
            lastPeriod = nextPeriod;
            const rand = Math.floor(Math.random() * 10);
            cachedPrediction = {
                number: rand,
                size: rand >= 5 ? "BIG" : "SMALL",
                color: [1, 3, 7, 9].includes(rand) ? "GREEN" : (rand === 0 || rand === 5 ? "VIOLET" : "RED")
            };

            // Save Prediction to MongoDB
            const newPrediction = new Prediction({
                period: nextPeriod,
                currentNumber: currentNumber,
                predictedNumber: rand,
                predictedSize: cachedPrediction.size,
                predictedColor: cachedPrediction.color
            });
            await newPrediction.save();
        }

        res.json({
            ok: true,
            current: { period: currentPeriod, number: currentNumber },
            next: {
                period: nextPeriod,
                predicted: cachedPrediction
            }
        });
    } catch (e) {
        console.error("Error:", e.message);
        res.status(500).json({ ok: false, error: "Failed to fetch data" });
    }
});

// 2. Get All Predictions History
app.get('/api/predictions', async (req, res) => {
    try {
        const predictions = await Prediction.find().sort({ timestamp: -1 }).limit(50);
        res.json({
            ok: true,
            count: predictions.length,
            data: predictions
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 3. Get All Live Data
app.get('/api/livedata', async (req, res) => {
    try {
        const liveData = await LiveData.find().sort({ timestamp: -1 }).limit(50);
        res.json({
            ok: true,
            count: liveData.length,
            data: liveData
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 4. Get Prediction Statistics
app.get('/api/stats', async (req, res) => {
    try {
        const totalPredictions = await Prediction.countDocuments();
        const correctPredictions = await Prediction.countDocuments({ isCorrect: true });
        const accuracy = totalPredictions > 0 ? ((correctPredictions / totalPredictions) * 100).toFixed(2) : 0;

        res.json({
            ok: true,
            totalPredictions,
            correctPredictions,
            accuracy: accuracy + "%"
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 5. Update Prediction Accuracy (Manual Check)
app.post('/api/update-result/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isCorrect } = req.body;

        const updated = await Prediction.findByIdAndUpdate(
            id,
            { isCorrect },
            { new: true }
        );

        res.json({
            ok: true,
            message: "Prediction updated",
            data: updated
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// 6. Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==================== Server Start ====================
app.listen(4000, () => {
    console.log("🚀 Mother API Engine running on http://localhost:4000");
    console.log("📊 API Endpoints:");
    console.log("   • GET /api/wingo - Current & Next prediction");
    console.log("   • GET /api/predictions - History of all predictions");
    console.log("   • GET /api/livedata - Live data history");
    console.log("   • GET /api/stats - Accuracy statistics");
    console.log("   • POST /api/update-result/:id - Mark prediction as correct/incorrect");
});
