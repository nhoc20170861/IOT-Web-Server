
module.exports = (sequelize, Sequelize) => {
    const Device = sequelize.define('devices', {   
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING,
        },  
        topic: {
            type: Sequelize.STRING,
        } 

    });

    return Device;
};
