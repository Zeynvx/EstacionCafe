const sql = require('mssql');
const fs = require('node:fs');
const path = require('node:path');

let poolPromise;
function getPool() {
  if (!poolPromise) {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length) return Promise.reject(new Error(`Faltan variables SQL Server: ${missing.join(', ')}`));
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT || 1433),
      options: {
        encrypt: process.env.DB_ENCRYPT !== 'false',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        ...(process.env.DB_CA_CERT ? { cryptoCredentialsDetails: { ca: fs.readFileSync(path.resolve(__dirname, '../../', process.env.DB_CA_CERT)) } } : {}),
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    };
    poolPromise = new sql.ConnectionPool(config).connect().catch((error) => {
      poolPromise = undefined;
      throw error;
    });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
