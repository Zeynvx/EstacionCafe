const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { publicUser } = require('../utils/auth-token');
const auth = require('./auth.controller');
const { isUniqueError } = require('../utils/crud');

const select = `SELECT UsuarioId,Nombres,ApellidoPaterno,ApellidoMaterno,Correo,Telefono,Direccion,Rol,NombreUsuario FROM dbo.Usuario`;
exports.list = async (_req, res) => { const pool = await getPool(); const result = await pool.request().query(`${select} WHERE Activo=1 ORDER BY Nombres,ApellidoPaterno`); res.json(result.recordset.map(publicUser)); };
exports.create = async (req, res) => {
  if (req.body.rol === 'Cliente') throw new HttpError(400, 'VALIDATION_ERROR', 'Los clientes se registran desde /auth/register.');
  try { return await auth.createEmployee(req, res); }
  catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'USER_EXISTS', 'El correo o nombre de usuario ya está registrado.'); throw error; }
};
exports.update = async (req, res) => {
  if (!req.body.nombre || !req.body.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(req.body.correo))) throw new HttpError(400, 'VALIDATION_ERROR', 'Nombre y correo válido son obligatorios.');
  if (!['Administrador', 'Logistica', 'Barista / Cocina', 'Caja', 'Cliente'].includes(req.body.rol)) throw new HttpError(400, 'VALIDATION_ERROR', 'Rol de cuenta no válido.');
  if (req.body.rol !== 'Cliente' && !String(req.body.usuario || '').trim()) throw new HttpError(400, 'VALIDATION_ERROR', 'El usuario es obligatorio.');
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('nombre', sql.NVarChar(120), String(req.body.nombre || '').trim()).input('paterno', sql.NVarChar(80), String(req.body.paterno || '').trim()).input('materno', sql.NVarChar(80), String(req.body.materno || '').trim()).input('correo', sql.NVarChar(254), String(req.body.correo || '').trim().toLowerCase()).input('telefono', sql.NVarChar(30), String(req.body.telefono || '').trim()).input('direccion', sql.NVarChar(300), String(req.body.direccion || '').trim()).input('rol', sql.NVarChar(30), req.body.rol).input('usuario', sql.NVarChar(80), String(req.body.usuario || '').trim().toLowerCase()).query(`UPDATE dbo.Usuario SET Nombres=@nombre,ApellidoPaterno=@paterno,ApellidoMaterno=@materno,Correo=@correo,Telefono=@telefono,Direccion=@direccion,Rol=@rol,NombreUsuario=@usuario
    OUTPUT inserted.UsuarioId,inserted.Nombres,inserted.ApellidoPaterno,inserted.ApellidoMaterno,inserted.Correo,inserted.Telefono,inserted.Direccion,inserted.Rol,inserted.NombreUsuario WHERE UsuarioId=@id AND Activo=1 AND Rol=@rol`);
  if (!result.recordset[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'No se encontró el empleado.');
  if (req.body.password) await auth.setPassword(req.params.id, req.body.password);
  res.json(publicUser(result.recordset[0]));
};
exports.remove = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`UPDATE dbo.Usuario SET Activo=0 WHERE UsuarioId=@id AND Activo=1 AND Rol<>N'Administrador'`);
  if (!result.rowsAffected[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'Cuenta no encontrada o no se permite desactivarla.');
  res.status(204).send();
};
