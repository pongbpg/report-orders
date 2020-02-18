
const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: 'yaumjai.com',
    user: 'storewerk',
    password: 'password',
    connectionLimit: 5,
    database: 'storewerk',
    charset: 'UTF8'
});
exports.db = pool;
// module.exports = (req, res, next) => {
//     pool.getConnection()
//         .then(conn => {
//             console.log("connected db success! connection id is " + conn.threadId);
//             req._sql = conn;
//             conn.end(); //release to pool
//             next();
//         })
//         .catch(err => {
//             console.log("not connected due to error: " + err);
//         });
// }