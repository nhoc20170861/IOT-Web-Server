module.exports = (sequelize, Sequelize) => {
  const Device = sequelize.define("devices", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    deviceType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    deviceStatus: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "off",
    },
    timeActive: {
      type: Sequelize.DATE,
    },
    timeDeative: {
      type: Sequelize.DATE,
    },

    topic: {
      type: Sequelize.STRING,
      allowNull: false,
    },
  });

  return Device;
};
