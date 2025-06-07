import { Model, DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

class SensorData extends Model {}

SensorData.init({
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
    }
}, {
    sequelize,
    modelName: 'SensorData'
});

export default SensorData;
