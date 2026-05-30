const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const query = (sql, params, callback) => {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    const connection = mysql.createConnection(dbConfig);

    connection.connect((connectErr) => {
        if (connectErr) {
            console.error('Error connecting to the database:', connectErr.stack);
            connection.destroy();
            callback(connectErr);
            return;
        }

        console.log('Connected to the database');

        const handleResult = (queryErr, results, fields) => {
            connection.end((endErr) => {
                if (endErr) {
                    console.error('Error closing database connection:', endErr);
                }
            });

            callback(queryErr, results, fields);
        };

        if (params === undefined) {
            connection.query(sql, handleResult);
            return;
        }

        connection.query(sql, params, handleResult);
    });
};

module.exports = {
    query,
};
