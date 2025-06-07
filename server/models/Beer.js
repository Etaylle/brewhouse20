import mongoose from 'mongoose';

const beerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

beerSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('Beer', beerSchema);
