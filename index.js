const mysql = require("mysql2");
const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Create MySQL connection pool
const pool = mysql.createPool({
    user: "Forum",
    password: "123",
    host: "localhost",
    database: "forum",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Endpoint to create tables if they do not exist
app.get('/create_table', (req, res) => {
    const userTable = `CREATE TABLE IF NOT EXISTS User (
        user_id INT AUTO_INCREMENT,
        user_name VARCHAR(255) NOT NULL,
        PRIMARY KEY (user_id)
    )`;

    const questionTable = `CREATE TABLE IF NOT EXISTS Question (
        question_id INT AUTO_INCREMENT,
        user_id INT,
        title VARCHAR(255) NOT NULL,
        content VARCHAR(1000) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (question_id),
        FOREIGN KEY (user_id) REFERENCES User(user_id)
    )`;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting: ', err.message);
            return res.status(500).send('Failed to connect to database');
        }

        connection.query(userTable, (err, result) => {
            if (err) {
                console.error('Error creating User table:', err.message);
                connection.release();
                return res.status(500).send('Error creating User table');
            } else {
                console.log("User table created successfully");

                connection.query(questionTable, (err, result) => {
                    if (err) {
                        console.error('Error creating Question table:', err.message);
                        connection.release();
                        return res.status(500).send('Error creating Question table');
                    } else {
                        console.log("Question table created successfully");
                        connection.release();
                        return res.send('Tables created successfully!');
                    }
                });
            }
        });
    });
});

// Endpoint to handle creating a new user
app.post('/user', (req, res) => {
    const { user_name } = req.body;
    console.log('Request Body:', req.body); // Log request body to debug

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting: ', err.message);
            return res.status(500).send('Failed to connect to database');
        }

        const insertUser = "INSERT INTO User (user_name) VALUES (?)";

        connection.query(insertUser, [user_name], (err, result) => {
            connection.release();
            if (err) {
                console.error('Error inserting into User table:', err.message);
                return res.status(500).send('Failed to insert into User table');
            }
            console.log('User created successfully');
            return res.send('User created successfully!');
        });
    });
});

// Endpoint to handle creating a new question
app.post('/question', (req, res) => {
    const { user_name, title, content } = req.body;
    console.log('Request Body:', req.body); // Log request body to debug

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting: ', err.message);
            return res.status(500).send('Failed to connect to database');
        }

        const getUser = "SELECT user_id FROM User WHERE user_name = ?";
        connection.query(getUser, [user_name], (err, results) => {
            if (err) {
                console.error('Error fetching user ID:', err.message);
                connection.release();
                return res.status(500).send('Failed to fetch user ID');
            }

            if (results.length === 0) {
                connection.release();
                return res.status(404).send('User not found');
            }

            const user_id = results[0].user_id;
            const insertQuestion = "INSERT INTO Question (user_id, title, content) VALUES (?, ?, ?)";

            connection.query(insertQuestion, [user_id, title, content], (err, result) => {
                connection.release();
                if (err) {
                    console.error('Error inserting into Question table:', err.message);
                    return res.status(500).send('Failed to insert into Question table');
                }
                console.log('Question created successfully');
                return res.send('Question created successfully!');
            });
        });
    });
});

// Endpoint to get a single question by ID
app.get('/api/question/:question_id', (req, res) => {
    const { question_id } = req.params;

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting: ', err.message);
            return res.status(500).send({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred.'
            });
        }

        const getQuestion = "SELECT * FROM Question WHERE question_id = ?";
        connection.query(getQuestion, [question_id], (err, results) => {
            connection.release();
            if (err) {
                console.error('Error fetching question:', err.message);
                return res.status(500).send({
                    error: 'Internal Server Error',
                    message: 'An unexpected error occurred.'
                });
            }

            if (results.length === 0) {
                return res.status(404).send({
                    error: 'Not Found',
                    message: 'The requested question could not be found.'
                });
            }

            const question = results[0];
            return res.status(200).send({ question });
        });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Express app listening on port ${port}`);
});
