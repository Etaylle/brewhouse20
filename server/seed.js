import mongoose from 'mongoose';
import Beer from './models/Beer.js';
import Review from './models/Review.js';

async function seed() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/brewhouse');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Beer.deleteMany({});
        await Review.deleteMany({});
        console.log('✅ Cleared existing data');

        // Seed beers
        const beers = [
            {
                name: 'Weisse Bier',
                type: 'Weisse',
                description: 'Ein frisches, leichtes Weisse Bier mit einem leichten Hopfenaroma.',
                isActive: true
            },
            {
                name: 'Pilsner',
                type: 'Pils',
                description: 'Ein klassischer Pilsner mit einem ausgewogenen Hopfenaroma und einem sauberen Finish.',
                isActive: false
            }
        ];

        await Beer.insertMany(beers);
        console.log(`✅ Seeded ${beers.length} beers`);

        // Seed reviews
        const reviews = [
            {
                biername: 'Weisse Bier',
                sterne: 4.5
            },
            {
                biername: 'Weisse Bier',
                sterne: 4.2
            },
            {
                biername: 'Pilsner',
                sterne: 4.8
            }
        ];

        await Review.insertMany(reviews);
        console.log(`✅ Seeded ${reviews.length} reviews`);

        console.log('✅ Seeding completed successfully');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        mongoose.connection.close();
    }
}

seed();
