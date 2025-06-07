import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Beer from './models/Beer.js';
import SensorData from './models/SensorData.js';
import Review from './models/Review.js';
import sensorData from './sensors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
}

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/brewhouse', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// API Routes
const PROCESSES = ['gaerung', 'maischen', 'hopfenkochen'];

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Current sensor data (mock API functionality)
app.get('/api/sensor-data/:process', (req, res) => {
    const process = req.params.process;
    
    if (!PROCESSES.includes(process)) {
        return res.status(404).json({ error: 'Process not found' });
    }
    
    res.json({
        timestamp: new Date(),
        process: process,
        data: sensorData[process],
    });
});

// Live sensor data from database
app.get('/api/live/:process', async (req, res) => {
    try {
        const process = req.params.process;
        const data = await SensorData.find({ process })
            .sort({ timestamp: -1 })
            .limit(50)
            .sort({ timestamp: 1 });
        res.json(data);
    } catch (err) {
        console.error('❌ Error in /api/live:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Historical data
app.get('/api/history/:process/:date', async (req, res) => {
    try {
        const { process, date } = req.params;
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const history = await SensorData.find({
            process,
            timestamp: { $gte: start, $lt: end }
        });

        res.json(history);
    } catch (err) {
        console.error('❌ Error in /api/history:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Active beer
app.get('/api/beer/active', async (req, res) => {
    try {
        const activeBeer = await Beer.findOne({ isActive: true });
        if (!activeBeer) {
            return res.status(404).json({ message: "No active beer found" });
        }
        res.json(activeBeer);
    } catch (err) {
        console.error("❌ Error fetching active beer:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Submit review
app.post('/api/review/:biername', async (req, res) => {
    try {
        const { biername } = req.params;
        const { sterne } = req.body;

        if (!sterne || sterne < 1 || sterne > 5) {
            return res.status(400).json({ error: 'Stars must be between 1 and 5' });
        }

        const review = new Review({ biername, sterne });
        await review.save();
        res.json({ success: true, review });
    } catch (err) {
        console.error('❌ Error in POST /api/review:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get reviews
app.get('/api/review/:biername', async (req, res) => {
    try {
        const { biername } = req.params;
        const reviews = await Review.find({ biername });

        const avg = reviews.length
            ? (reviews.reduce((sum, r) => sum + r.sterne, 0) / reviews.length).toFixed(2)
            : null;

        res.json({
            biername,
            anzahl: reviews.length,
            durchschnitt: avg
        });
    } catch (err) {
        console.error('❌ Error in GET /api/review:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

// Background sensor data polling
async function pollAndStoreSensorData() {
    for (const process of PROCESSES) {
        try {
            const data = sensorData[process];
            const entry = new SensorData({
                process,
                values: data,
                timestamp: new Date()
            });
            await entry.save();
            console.log(`✅ Sensor data saved for ${process}`);
        } catch (err) {
            console.error(`❌ Error saving ${process}:`, err.message);
        }
    }
}

// Start background polling every 10 seconds
setInterval(pollAndStoreSensorData, 10000);
console.log('🔄 Background sensor polling started');

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
});
