const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    dialectModule: require('pg'),
    pool: {
      max: 10,
      min: 1,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = {sequelize};
