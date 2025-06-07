import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class Review extends Model {}

Review.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    beer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Beer',
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
    kommentar: {
        type: DataTypes.TEXT
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Review'
});

Review.associate = (models) => {
    Review.belongsTo(models.Beer, {
        foreignKey: 'beer_id',
        onDelete: 'CASCADE'
    });
};

export default Review;
