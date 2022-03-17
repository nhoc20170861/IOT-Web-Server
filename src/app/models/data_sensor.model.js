
module.exports = (sequelize, Sequelize) => {
    const DataSensor = sequelize.define('data_sensors', {
    
        Humidity: {
            type: Sequelize.INTEGER,
        },
        Temperature: {
            type: Sequelize.DECIMAL,
        },
        PM2_55: {
            type: Sequelize.DECIMAL,
        },
        Battery: {
            type: Sequelize.INTEGER,
        },

    });

    return DataSensor;
};
