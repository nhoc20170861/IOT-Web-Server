module.exports = (sequelize, Sequelize) => {
    const PositionGoal = sequelize.define('position_goals', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        pointName: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Point type is required.'
                },
                isUnique: async function (value) {
                    const record = await PositionGoal.findOne({ where: { pointName: value } });
                    if (record) {
                        throw new Error('Point name must be unique.');
                    }
                }
            }
        },
        pointType: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Point type is required.'
                }
            }
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
        theta: {
            type: Sequelize.FLOAT,
            allowNull: false,
            defaultValue: 0
        }
    });

    return PositionGoal;
};
