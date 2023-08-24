module.exports = (sequelize, Sequelize) => {
    const Map = sequelize.define('maps', {
        id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        mapName: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Map name is required.'
                },
                isUnique: async function (value) {
                    const record = await Map.findOne({ where: { mapName: value } });
                    if (record) {
                        throw new Error('Map name must be unique.');
                    }
                }
            }
        },
        mapImageSrc: {
            type: Sequelize.STRING,
            allowNull: false
        },
        mapConfigSrc: {
            type: Sequelize.STRING,
            allowNull: false
        }
    });

    return Map;
};
