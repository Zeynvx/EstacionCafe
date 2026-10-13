const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { required, isUniqueError, isForeignKeyError } = require('../utils/crud');

exports.list = async (_req, res) => {
  const pool = await getPool();
  const { recordset } = await pool.request().query('SELECT CategoriaId id, Nombre nombre, EsPostre postre FROM dbo.Categoria ORDER BY Nombre');
  res.json(recordset);
};
exports.create = async (req, res) => {
  const data = { id: required(req.body.id, 'El id'), nombre: required(req.body.nombre, 'El nombre'), postre: !!req.body.postre };
  try {
    const pool = await getPool();
    await pool.request().input('id', sql.NVarChar(50), data.id).input('nombre', sql.NVarChar(100), data.nombre).input('postre', sql.Bit, data.postre)
      .query('INSERT dbo.Categoria(CategoriaId,Nombre,EsPostre) VALUES(@id,@nombre,@postre)');
    res.status(201).json(data);
  } catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'CATEGORY_EXISTS', 'Ya existe una categoría con ese identificador o nombre.'); throw error; }
};
exports.update = async (req, res) => {
  const data = { id: req.params.id, nombre: required(req.body.nombre, 'El nombre'), postre: !!req.body.postre };
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.NVarChar(50), data.id).input('nombre', sql.NVarChar(100), data.nombre).input('postre', sql.Bit, data.postre)
      .query('UPDATE dbo.Categoria SET Nombre=@nombre,EsPostre=@postre WHERE CategoriaId=@id');
    if (!result.rowsAffected[0]) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
    res.json(data);
  } catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'CATEGORY_EXISTS', 'Ya existe una categoría con ese nombre.'); throw error; }
};
exports.remove = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.NVarChar(50), req.params.id).query('DELETE dbo.Categoria WHERE CategoriaId=@id');
    if (!result.rowsAffected[0]) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
    res.status(204).send();
  } catch (error) { if (isForeignKeyError(error)) throw new HttpError(409, 'CATEGORY_IN_USE', 'No se puede borrar una categoría que tiene productos.'); throw error; }
};
