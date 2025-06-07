import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    biername: { type: String, required: true },
    sterne: { type: Number, required: true, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Review', reviewSchema);
