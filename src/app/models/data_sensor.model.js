
module.exports = (sequelize, Sequelize) => {
    const DataSensor = sequelize.define('data_sensors', {
    
        humidity: {
            type: Sequelize.INTEGER,
        },
        temperature: {
            type: Sequelize.DECIMAL,
        },
        pm2_5: {
            type: Sequelize.DECIMAL,
        },
        battery: {
            type: Sequelize.INTEGER,
        },

    });

    return DataSensor;
};
