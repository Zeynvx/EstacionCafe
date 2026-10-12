require('dotenv').config();
const sql = require('mssql');

const config = {
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
server: process.env.DB_HOST,
database: process.env.DB_NAME,
port: parseInt(process.env.DB_PORT, 10),
options: {
    encrypt: true,
    trustServerCertificate: true
},
pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
}
};

const poolPromise = new sql.ConnectionPool(config)
.connect()
.then(pool => {
    console.log('Conectado exitosamente a SQL Server en AWS RDS');
    return pool;
})
.catch(err => {
    console.error('Error al inicializar BD:', err.message);
    process.exit(1);
});

module.exports = {
sql,
poolPromise
};