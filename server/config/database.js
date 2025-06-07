import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
        timezone: 'UTC'
    }
});

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('❌ Unable to connect to the database:', err);
        process.exit(1);
    });
