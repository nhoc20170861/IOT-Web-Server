module.exports = (sequelize, Sequelize) => {
  const Home = sequelize.define("homes", {
    id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    homeName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    location: {
      type: Sequelize.STRING,
    },
  });

  return Home;
};
