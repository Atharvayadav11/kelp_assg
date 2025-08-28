import mysql from 'mysql2/promise';

const conn = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'kelp',
    waitForConnections: true,
    connectionLimit: 10,
});

const db = {
    getconn: () => conn,
    init: async () => {
        try {
            const connection = await conn.getConnection();
            console.log('Database connected successfully');
            connection.release();
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }
};

export default db;