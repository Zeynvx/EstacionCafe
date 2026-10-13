const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { required, isUniqueError, isForeignKeyError } = require('../utils/crud');
function read(body) { return { nombre: required(body.nombre, 'El nombre'), correo: String(body.correo || '').trim().toLowerCase(), telefono: String(body.telefono || '').trim() }; }
exports.list = async (_req, res) => { const pool = await getPool(); const { recordset } = await pool.request().query('SELECT ProveedorId id,Nombre nombre,Correo correo,Telefono telefono FROM dbo.Proveedor WHERE Activo=1 ORDER BY Nombre'); res.json(recordset); };
exports.create = async (req, res) => {
  const data = read(req.body), id = required(req.body.id, 'El id');
  try { const pool = await getPool(); await pool.request().input('id', sql.NVarChar(50), id).input('nombre', sql.NVarChar(160), data.nombre).input('correo', sql.NVarChar(254), data.correo).input('telefono', sql.NVarChar(30), data.telefono).query('INSERT dbo.Proveedor(ProveedorId,Nombre,Correo,Telefono) VALUES(@id,@nombre,@correo,@telefono)'); res.status(201).json({ id, ...data }); }
  catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'SUPPLIER_EXISTS', 'Ya existe un proveedor con ese id o nombre.'); throw error; }
};
exports.update = async (req, res) => {
  const data = read(req.body);
  try { const pool = await getPool(); const result = await pool.request().input('id', sql.NVarChar(50), req.params.id).input('nombre', sql.NVarChar(160), data.nombre).input('correo', sql.NVarChar(254), data.correo).input('telefono', sql.NVarChar(30), data.telefono).query('UPDATE dbo.Proveedor SET Nombre=@nombre,Correo=@correo,Telefono=@telefono WHERE ProveedorId=@id AND Activo=1'); if (!result.rowsAffected[0]) throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'No se encontró el proveedor.'); res.json({ id: req.params.id, ...data }); }
  catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'SUPPLIER_EXISTS', 'Ya existe un proveedor con ese nombre.'); throw error; }
};
exports.remove = async (req, res) => {
  try { const pool = await getPool(); const result = await pool.request().input('id', sql.NVarChar(50), req.params.id).query('UPDATE dbo.Proveedor SET Activo=0 WHERE ProveedorId=@id AND Activo=1'); if (!result.rowsAffected[0]) throw new HttpError(404, 'SUPPLIER_NOT_FOUND', 'No se encontró el proveedor.'); res.status(204).send(); }
  catch (error) { if (isForeignKeyError(error)) throw new HttpError(409, 'SUPPLIER_IN_USE', 'No se puede borrar un proveedor que tiene compras.'); throw error; }
};
