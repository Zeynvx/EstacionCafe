const { HttpError } = require('../utils/http-error');

function notFound(req, _res, next) {
  next(new HttpError(404, 'NOT_FOUND', `No existe la ruta ${req.method} ${req.originalUrl}.`));
}

function errorHandler(error, _req, res, _next) {
  const status = error instanceof HttpError ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Ocurrió un error interno.' : error.message,
      details: error.details || [],
    },
  });
}

module.exports = { notFound, errorHandler };
