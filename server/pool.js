const mysql = require('mysql');

const pool = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  database: 'usersinfo',
  user: 'root',
  password: '123456',
  connectionLimit: 100,
})

module.exports = pool;