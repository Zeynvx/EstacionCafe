const { getPool, sql } = require('../config/database');
const { verifyToken } = require('../utils/auth-token');
const { HttpError } = require('../utils/http-error');

async function authenticate(req, _res, next) {
  let claims;
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar.');
    claims = verifyToken(header.slice(7));
  } catch (error) {
    return next(error instanceof HttpError ? error : new HttpError(401, 'INVALID_TOKEN', 'La sesión no es válida o venció.'));
  }
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, claims.sub).query(`
      SELECT UsuarioId, Rol, Activo FROM dbo.Usuario WHERE UsuarioId = @id
    `);
    const user = result.recordset[0];
    if (!user || !user.Activo || user.Rol !== claims.role) throw new HttpError(401, 'INVALID_SESSION', 'La sesión ya no es válida.');
    req.user = { id: user.UsuarioId, rol: user.Rol };
    next();
  } catch (error) { return next(error); }
}

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) return next(new HttpError(403, 'FORBIDDEN', 'No tienes permiso para esta operación.'));
    next();
  };
}

function optionalAuthenticate(req, _res, next) {
  const header = req.get('authorization') || '';
  if (!header) return next();
  return authenticate(req, _res, next);
}

module.exports = { authenticate, optionalAuthenticate, allowRoles };
