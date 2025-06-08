import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { sequelize } from './config/database.js';
import Beer from './models/Beer.js';
import SensorData from './models/SensorData.js';
import Review from './models/Review.js';
import sensorData from './sensors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting server...');
console.log('Checking environment variables...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);

dotenv.config();
console.log('Environment variables loaded');

const app = express();
const PORT = process.env.PORT || 3002;
console.log('Using port:', PORT);

// Middleware
app.use(cors());
app.use(express.json());
console.log('Middleware configured');

// Database connection
console.log('Connecting to database...');
sequelize.sync()
    .then(() => {
        console.log('✅ Database connected');
    })
    .catch(err => {
        console.error('❌ Database error:', err);
        process.exit(1);
    });

// API Routes
const PROCESSES = ['gaerung', 'maischen', 'hopfenkochen'];
console.log('API routes configured');

// Health check
app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create a new beer
app.post('/api/beer', async (req, res) => {
    console.log('Creating new beer');
    try {
        const { name, type, description, isActive } = req.body;
        const beer = await Beer.create({
            name,
            type,
            description,
            isActive
        });
        console.log('Beer created:', beer);
        res.status(201).json(beer);
    } catch (err) {
        console.error('Error creating beer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all beers
app.get('/api/beers', async (req, res) => {
    console.log('Getting all beers');
    try {
        const beers = await Beer.findAll();
        console.log('Found', beers.length, 'beers');
        res.json(beers);
    } catch (err) {
        console.error('Error fetching beers:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Active beer - MUST come before /api/beer/:id route
app.get('/api/beer/active', async (req, res) => {
    console.log('Active beer requested');
    try {
        const activeBeer = await Beer.findOne({ where: { isActive: true } });
        if (!activeBeer) {
            console.log('No active beer found');
            return res.status(404).json({ message: "No active beer found" });
        }
        res.json(activeBeer);
    } catch (err) {
        console.error("Error fetching active beer:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get a specific beer by ID
app.get('/api/beer/:id', async (req, res) => {
    console.log('Getting beer by ID:', req.params.id);
    try {
        const beer = await Beer.findByPk(req.params.id);
        if (!beer) {
            console.log('Beer not found');
            return res.status(404).json({ message: 'Beer not found' });
        }
        res.json(beer);
    } catch (err) {
        console.error('Error fetching beer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update a beer
app.put('/api/beer/:id', async (req, res) => {
    console.log('Updating beer:', req.params.id);
    try {
        const beer = await Beer.findByPk(req.params.id);
        if (!beer) {
            console.log('Beer not found');
            return res.status(404).json({ message: 'Beer not found' });
        }
        await beer.update(req.body);
        console.log('Beer updated');
        res.json(beer);
    } catch (err) {
        console.error('Error updating beer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete a beer
app.delete('/api/beer/:id', async (req, res) => {
    console.log('Deleting beer:', req.params.id);
    try {
        const beer = await Beer.findByPk(req.params.id);
        if (!beer) {
            console.log('Beer not found');
            return res.status(404).json({ message: 'Beer not found' });
        }
        await beer.destroy();
        console.log('Beer deleted');
        res.json({ message: 'Beer deleted successfully' });
    } catch (err) {
        console.error('Error deleting beer:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Current sensor data (mock API functionality)
app.get('/api/sensor-data/:process', (req, res) => {
    console.log('Sensor data requested for:', req.params.process);
    const process = req.params.process;
    
    if (!PROCESSES.includes(process)) {
        console.log('Invalid process:', process);
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
    console.log('Live data requested for:', req.params.process);
    try {
        const process = req.params.process;
        const data = await SensorData.findAll({
            where: { process },
            order: [['timestamp', 'DESC']],
            limit: 50
        });
        console.log('Found', data.length, 'records');
        res.json(data);
    } catch (err) {
        console.error('Error in /api/live:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Historical data
app.get('/api/history/:process/:date', async (req, res) => {
    console.log('History requested for:', req.params.process, req.params.date);
    try {
        const { process, date } = req.params;
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);

        const history = await SensorData.findAll({
            where: {
                process,
                timestamp: {
                    [Op.gte]: start,
                    [Op.lt]: end
                }
            },
            order: [['timestamp', 'ASC']]
        });

        console.log('Found', history.length, 'historical records');
        res.json(history);
    } catch (err) {
        console.error('Error in /api/history:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Submit review
app.post('/api/review/:biername', async (req, res) => {
    console.log('Review submitted for:', req.params.biername);
    try {
        const { biername } = req.params;
        const { sterne } = req.body;

        if (!sterne || sterne < 1 || sterne > 5) {
            console.log('Invalid rating:', sterne);
            return res.status(400).json({ message: "Invalid rating" });
        }

        const beer = await Beer.findOne({ where: { name: biername } });
        if (!beer) {
            console.log('Beer not found:', biername);
            return res.status(404).json({ message: "Beer not found" });
        }

        const review = await Review.create({
            beer_id: beer.id,
            sterne
        });

        console.log('Review created successfully');
        res.status(201).json({ message: "Review submitted" });
    } catch (err) {
        console.error("Error submitting review:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get reviews for a beer
app.get('/api/review/:biername', async (req, res) => {
    console.log('Reviews requested for:', req.params.biername);
    try {
        const { biername } = req.params;
        const beer = await Beer.findOne({ where: { name: biername } });
        if (!beer) {
            console.log('Beer not found:', biername);
            return res.status(404).json({ message: "Beer not found" });
        }

        const reviews = await Review.findAll({ where: { beer_id: beer.id } });
        const anzahl = reviews.length;
        const durchschnitt = anzahl > 0 ? (reviews.reduce((sum, r) => sum + r.sterne, 0) / anzahl).toFixed(2) : 0;
        console.log('Found', anzahl, 'reviews with average', durchschnitt);
        res.json({ anzahl, durchschnitt });
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Sensor polling and storage
async function pollAndStoreSensorData() {
    console.log('Starting sensor polling');
    for (const process of PROCESSES) {
        try {
            const data = sensorData[process];
            await SensorData.create({
                process,
                values: data,
                timestamp: new Date()
            });
            console.log(`✅ Saved sensor data for ${process}`);
        } catch (err) {
            console.error(`❌ Error saving ${process}:`, err);
        }
    }
}

// Start internal sensor polling every 5 seconds
setInterval(pollAndStoreSensorData, 5000);
console.log('🔄 Background sensor polling started');

// UPDATED: Always serve React frontend (removed production check)
console.log('Setting up static file serving...');
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
    console.log('Serving React app for route:', req.path);
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📊 API endpoints available at http://0.0.0.0:${PORT}/api/`);
    console.log(`🌐 Frontend served at http://0.0.0.0:${PORT}`);
    console.log(`🌐 Accessible via VPN at http://10.123.26.22:${PORT}`);
}).on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});
