import { mysqlConfig } from '../configs';

import { Sequelize, DataTypes } from 'sequelize';
const sequelize = new Sequelize(mysqlConfig.DB, mysqlConfig.USER, mysqlConfig.PASSWORD, {
    host: mysqlConfig.HOST,
    dialect: mysqlConfig.dialect,
    operatorsAliases: 0,
    dialectOptions: {
        useUTC: 0 // for reading from database
    },
    timezone: '+07:00', // for writing to database
    pool: {
        max: mysqlConfig.pool.max,
        min: mysqlConfig.pool.min,
        acquire: mysqlConfig.pool.acquire,
        idle: mysqlConfig.pool.idle
    }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.home = require('./home.model.js')(sequelize, Sequelize);
db.user = require('./user.model.js')(sequelize, Sequelize);
db.role = require('./role.model.js')(sequelize, Sequelize);
// db.question = require("../models/question.model.js")(sequelize, Sequelize);

// Create many to many relationship between users table and roles table through user_roles table
db.role.belongsToMany(db.user, {
    through: 'user_roles',
    foreignKey: 'roleId',
    otherKey: 'userId'
});

db.user.belongsToMany(db.role, {
    through: 'user_roles',
    foreignKey: 'userId',
    otherKey: 'roleId'
});

// Create one to many relationship between users table and homes table through  users_homes
db.user_homes = require('./user_homes.model.js')(sequelize, DataTypes);
db.home.belongsToMany(db.user, {
    through: 'user_homes'
});

db.user.belongsToMany(db.home, {
    through: 'user_homes'
});

// create data_sensor table relative with device table follow key: deviceId
db.device = require('./device.model.js')(sequelize, Sequelize);
db.data_sensor = require('./data_sensor.model.js')(sequelize, Sequelize);
db.device.hasOne(db.data_sensor, {
    onDelete: 'CASCADE'
});
db.data_sensor.belongsTo(db.device, {
    foreignKey: 'deviceId',
    as: 'devices'
});

db.ROLES = ['user', 'admin', 'moderator'];

// Code fore robot
db.position_goals = require('./Robot/position_goal.model')(sequelize, Sequelize);
db.robot = require('./Robot/robot.model')(sequelize, Sequelize);
module.exports = db;
