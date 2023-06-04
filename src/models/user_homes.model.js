const userModel = require("./user.model");
const homeModel = require("./home.model");

module.exports = (sequelize, DataTypes) => {
  const UserHomes = sequelize.define("user_homes", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      references: {
        model: userModel, // 'Movies' would also work
        key: "id",
      },
    },
    homeId: {
      type: DataTypes.INTEGER,
      references: {
        model: homeModel, // 'Actors' would also work
        key: "id",
      },
    },
    isOwner: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  return UserHomes;
};
