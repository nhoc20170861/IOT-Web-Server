module.exports = (sequelize, Sequelize) => {
    const PostionGoal = sequelize.define('position_goals', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        pointName: {
            type: Sequelize.STRING,
            allowNull: false
        },
        pointType: {
            type: Sequelize.STRING,
            allowNull: false
        },
        xCoordinate: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        yCoordinate: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        orientation: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
        }
    });

    return PostionGoal;
};
