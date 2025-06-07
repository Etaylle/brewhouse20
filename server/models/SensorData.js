import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

class SensorData extends Model {}

SensorData.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    process: {
        type: DataTypes.STRING,
        allowNull: false
    },
    values: {
        type: DataTypes.JSON,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
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
    modelName: 'SensorData'
});

export default SensorData;
