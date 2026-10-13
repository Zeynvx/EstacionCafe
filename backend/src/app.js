require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { getPool } = require('./config/database');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/api/v1/health', async (_req, res, next) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'OK', database: 'connected', uptime: process.uptime() });
  } catch (error) { next(error); }
});
app.use('/api/v1', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
