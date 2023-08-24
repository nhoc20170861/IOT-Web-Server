module.exports = (sequelize, Sequelize) => {
    const PositionGoal = sequelize.define('position_goals', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        mapId: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        pointName: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Point name is required.'
                },
                isUnique: async function (value) {
                    const record = await PositionGoal.findOne({ where: { pointName: value } });
                    // console.log('🚀 ~ file: position_goal.model.js:22 ~ record:', record);
                    if (record && record.dataValues.mapId === this.mapId) {
                        throw new Error('Point name in this map is exist.');
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
