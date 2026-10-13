const { HttpError } = require('./http-error');

function required(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new HttpError(400, 'VALIDATION_ERROR', `${label} es obligatorio.`);
  return result;
}

function id(value, label = 'Identificador') {
  return required(value, label);
}

function isUniqueError(error) { return error?.number === 2627 || error?.number === 2601; }
function isForeignKeyError(error) { return error?.number === 547; }

module.exports = { required, id, isUniqueError, isForeignKeyError };
