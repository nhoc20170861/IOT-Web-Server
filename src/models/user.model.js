module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define("users", {
    username: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    password: {
      type: Sequelize.STRING,
    },
    firstName: {
      type: Sequelize.STRING,
    },
    lastName: {
      type: Sequelize.STRING,
    },
    accountConfirm: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    refreshToken: {
      type: Sequelize.STRING,
    },
    avatarUrl: {
      type: Sequelize.STRING,
    },
  });

  return User;
};
