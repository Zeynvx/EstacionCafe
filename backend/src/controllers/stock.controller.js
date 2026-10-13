const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { required, isUniqueError, isForeignKeyError } = require('../utils/crud');
const units = ['kg', 'g', 'L', 'mL', 'unidad'];
function read(body) {
  const cantidad = Number(body.cantidad), minimo = Number(body.minimo);
  if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isFinite(minimo) || minimo < 0 || !units.includes(body.unidad)) throw new HttpError(400, 'VALIDATION_ERROR', 'Unidad, cantidad y mínimo deben ser válidos.');
  return { nombre: required(body.nombre, 'El nombre'), unidad: body.unidad, cantidad, minimo };
}
exports.list = async (_req, res) => { const pool = await getPool(); const { recordset } = await pool.request().query('SELECT InsumoId id,Nombre nombre,Unidad unidad,Cantidad cantidad,Minimo minimo FROM dbo.Insumo ORDER BY Nombre'); res.json(recordset); };
exports.create = async (req, res) => {
  const data = read(req.body), id = required(req.body.id, 'El id');
  const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    await new sql.Request(tx).input('id', sql.NVarChar(50), id).input('nombre', sql.NVarChar(150), data.nombre).input('unidad', sql.NVarChar(10), data.unidad).input('cantidad', sql.Decimal(12, 3), data.cantidad).input('minimo', sql.Decimal(12, 3), data.minimo).query('INSERT dbo.Insumo(InsumoId,Nombre,Unidad,Cantidad,Minimo) VALUES(@id,@nombre,@unidad,@cantidad,@minimo)');
    if (data.cantidad > 0) await new sql.Request(tx).input('id', sql.NVarChar(50), id).input('cantidad', sql.Decimal(12, 3), data.cantidad).input('user', sql.UniqueIdentifier, req.user.id).query(`INSERT dbo.MovimientoStock(InsumoId,Tipo,Cantidad,Observacion,UsuarioId) VALUES(@id,N'Ajuste',@cantidad,N'Saldo inicial',@user)`);
    await tx.commit();
    res.status(201).json({ id, ...data });
  } catch (error) { await tx.rollback(); if (isUniqueError(error)) throw new HttpError(409, 'STOCK_EXISTS', 'Ya existe un insumo con ese id o nombre.'); throw error; }
};
exports.update = async (req, res) => {
  const data = read(req.body), id = req.params.id, pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    const prior = await new sql.Request(tx).input('id', sql.NVarChar(50), id).query('SELECT Cantidad,Unidad FROM dbo.Insumo WITH (UPDLOCK) WHERE InsumoId=@id');
    if (!prior.recordset[0]) throw new HttpError(404, 'STOCK_NOT_FOUND', 'No se encontró el insumo.');
    if (prior.recordset[0].Unidad !== data.unidad) {
      const uses = await new sql.Request(tx).input('id', sql.NVarChar(50), id).query('SELECT TOP 1 1 AS found FROM dbo.Compra WHERE InsumoId=@id');
      if (uses.recordset.length) throw new HttpError(409, 'UNIT_IN_USE', 'No se puede cambiar la unidad porque el insumo ya tiene compras.');
    }
    await new sql.Request(tx).input('id', sql.NVarChar(50), id).input('nombre', sql.NVarChar(150), data.nombre).input('unidad', sql.NVarChar(10), data.unidad).input('cantidad', sql.Decimal(12, 3), data.cantidad).input('minimo', sql.Decimal(12, 3), data.minimo).query('UPDATE dbo.Insumo SET Nombre=@nombre,Unidad=@unidad,Cantidad=@cantidad,Minimo=@minimo WHERE InsumoId=@id');
    const delta = data.cantidad - Number(prior.recordset[0].Cantidad);
    if (Math.abs(delta) >= 0.001) await new sql.Request(tx).input('id', sql.NVarChar(50), id).input('tipo', sql.NVarChar(20), delta > 0 ? 'Ajuste' : 'Consumo').input('cantidad', sql.Decimal(12, 3), Math.abs(delta)).input('user', sql.UniqueIdentifier, req.user.id).query(`INSERT dbo.MovimientoStock(InsumoId,Tipo,Cantidad,Observacion,UsuarioId) VALUES(@id,@tipo,@cantidad,N'Ajuste desde inventario',@user)`);
    await tx.commit(); res.json({ id, ...data });
  } catch (error) { await tx.rollback(); if (isUniqueError(error)) throw new HttpError(409, 'STOCK_EXISTS', 'Ya existe un insumo con ese nombre.'); throw error; }
};
exports.remove = async (req, res) => {
  try { const pool = await getPool(); const result = await pool.request().input('id', sql.NVarChar(50), req.params.id).query('DELETE dbo.Insumo WHERE InsumoId=@id'); if (!result.rowsAffected[0]) throw new HttpError(404, 'STOCK_NOT_FOUND', 'No se encontró el insumo.'); res.status(204).send(); }
  catch (error) { if (isForeignKeyError(error)) throw new HttpError(409, 'STOCK_IN_USE', 'No se puede borrar un insumo con compras o movimientos.'); throw error; }
};
