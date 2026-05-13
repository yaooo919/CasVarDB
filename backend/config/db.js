const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

const reconnectableErrorCodes = new Set([
    'PROTOCOL_CONNECTION_LOST',
    'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
    'PROTOCOL_ENQUEUE_AFTER_QUIT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
]);

const reconnectAttempts = Number(process.env.DB_RECONNECT_ATTEMPTS) || 10;
const reconnectDelayMs = Number(process.env.DB_RECONNECT_DELAY_MS) || 1000;

let connection = null;
let isConnecting = false;
let waitingForConnection = [];

const isReconnectableError = (err) => {
    if (!err) return false;

    const message = err.message || '';
    return (
        reconnectableErrorCodes.has(err.code) ||
        message.includes('closed state') ||
        message.includes('Connection lost') ||
        message.includes('The server closed the connection')
    );
};

const flushWaitingCallbacks = (err) => {
    const callbacks = waitingForConnection;
    waitingForConnection = [];
    callbacks.forEach((callback) => callback(err));
};

const createConnection = () => {
    const nextConnection = mysql.createConnection(dbConfig);

    nextConnection.on('error', (err) => {
        console.error('Database connection error:', err);

        if (connection === nextConnection && isReconnectableError(err)) {
            reconnect();
        }
    });

    return nextConnection;
};

const startConnectionAttempt = (attemptsLeft) => {
    isConnecting = true;
    const nextConnection = createConnection();

    nextConnection.connect((err) => {
        if (err) {
            console.error('Error connecting to the database:', err.stack);
            nextConnection.destroy();

            if (attemptsLeft > 1) {
                console.warn(`Retrying database connection in ${reconnectDelayMs}ms...`);
                setTimeout(() => startConnectionAttempt(attemptsLeft - 1), reconnectDelayMs);
                return;
            }

            isConnecting = false;
            flushWaitingCallbacks(err);
            return;
        }

        connection = nextConnection;
        isConnecting = false;
        console.log('Connected to the database');
        flushWaitingCallbacks(null);
    });
};

const connect = (callback) => {
    if (callback) {
        waitingForConnection.push(callback);
    }

    if (isConnecting) {
        return;
    }

    startConnectionAttempt(reconnectAttempts);
};

const reconnect = (callback) => {
    if (connection) {
        connection.destroy();
        connection = null;
    }

    connect(callback);
};

const runQuery = (sql, params, callback, shouldRetry) => {
    if (!connection || isConnecting) {
        connect((err) => {
            if (err) return callback(err);
            runQuery(sql, params, callback, shouldRetry);
        });
        return;
    }

    const handleResult = (err, results, fields) => {
        if (err && shouldRetry && isReconnectableError(err)) {
            console.warn('Database connection was closed. Reconnecting and retrying query once...');
            reconnect((reconnectErr) => {
                if (reconnectErr) return callback(reconnectErr);
                runQuery(sql, params, callback, false);
            });
            return;
        }

        callback(err, results, fields);
    };

    try {
        if (params === undefined) {
            connection.query(sql, handleResult);
        } else {
            connection.query(sql, params, handleResult);
        }
    } catch (err) {
        if (shouldRetry && isReconnectableError(err)) {
            console.warn('Database connection was closed. Reconnecting and retrying query once...');
            reconnect((reconnectErr) => {
                if (reconnectErr) return callback(reconnectErr);
                runQuery(sql, params, callback, false);
            });
            return;
        }

        callback(err);
    }
};

connect();

module.exports = {
    query(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = undefined;
        }

        runQuery(sql, params, callback, true);
    },
    reconnect,
};
