const { Sequelize } = require('sequelize');
const UserModel = require('../models/user.model');

const sequelize = new Sequelize({
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    retry: {
        max: 3
    },
    dialectOptions: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
    }
});

const initializeDatabase = async () => {
    try {
        // First try to create database if it doesn't exist
        const tempSequelize = new Sequelize({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10),
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            dialect: 'mysql',
            logging: false
        });

        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME};`);
        await tempSequelize.close();

        // Initialize models
        const User = UserModel(sequelize);
        
        // Now connect to the database and sync
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        // Force sync in development, normal sync in production
        const syncOptions = {
            alter: true
        };
        
        await sequelize.sync(syncOptions);
        console.log('Database tables synchronized successfully.');

        return {
            sequelize,
            User
        };
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

module.exports = { sequelize, initializeDatabase };