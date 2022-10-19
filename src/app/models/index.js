const config = require('../../config/db.config');

const Sequelize = require('sequelize');
const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
    host: config.HOST,
    dialect: config.dialect,
    operatorsAliases: 0,
    dialectOptions: {
        useUTC: 0, // for reading from database
    },
    timezone: '+07:00', // for writing to database
    pool: {
        max: config.pool.max,
        min: config.pool.min,
        acquire: config.pool.acquire,
        idle: config.pool.idle,
    },
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.user = require('../models/user.model.js')(sequelize, Sequelize);
db.role = require('../models/role.model.js')(sequelize, Sequelize);
db.question = require('../models/question.model.js')(sequelize, Sequelize);


db.role.belongsToMany(db.user, {
    through: 'user_roles',
    foreignKey: 'roleId',
    otherKey: 'userId',
});

db.user.belongsToMany(db.role, {
    through: 'user_roles',
    foreignKey: 'userId',
    otherKey: 'roleId',
});


// create data_sensor table relative with device table follow key: deviceId
db.device =  require('../models/device.model.js')(sequelize, Sequelize);
db.data_sensor = require('../models/data_sensor.model.js')(sequelize, Sequelize);
db.device.hasOne(db.data_sensor, {
    onDelete: 'CASCADE',
}
    );
db.data_sensor.belongsTo(db.device, {
    foreignKey: 'deviceId',
    as: 'devices',

});


db.ROLES = ['user', 'admin', 'moderator'];

module.exports = db;
