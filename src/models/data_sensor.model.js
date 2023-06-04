module.exports = (sequelize, Sequelize) => {
    const DataSensor = sequelize.define('data_sensors', {
        humidity: {
            type: Sequelize.FLOAT
        },
        temperature: {
            type: Sequelize.FLOAT
        },
        pm2_5: {
            type: Sequelize.FLOAT
        },
        battery: {
            type: Sequelize.FLOAT
        }
    });

    return DataSensor;
};
