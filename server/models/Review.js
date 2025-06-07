import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

class Review extends Model {}

Review.init({
    beer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Beers',
            key: 'id'
        }
    },
    sterne: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Review'
});

export default Review;
