require('dotenv').config();
const app = require('./src/app');
const { initializeDatabase } = require('./src/config/dbConfig');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server failed to start:', error);
        process.exit(1);
    }
};

startServer();
