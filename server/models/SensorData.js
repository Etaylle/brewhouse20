import mongoose from 'mongoose';

const sensorDataSchema = new mongoose.Schema({
    process: { type: String, required: true },
    values: { type: Object, required: true },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('SensorData', sensorDataSchema);
