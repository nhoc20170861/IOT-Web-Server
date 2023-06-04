module.exports = (sequelize, Sequelize) => {
    const Robot = sequelize.define('robots', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        robotName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        robotType: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    return Robot;
};
