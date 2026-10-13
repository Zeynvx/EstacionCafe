const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { required, isUniqueError, isForeignKeyError } = require('../utils/crud');
const select = `SELECT CONVERT(varchar(36),c.CompraId) id,c.ProveedorId proveedor,c.InsumoId insumo,c.Cantidad cantidad,c.CostoTotal costo,CONVERT(varchar(10),c.Fecha,23) fecha,c.Recibida recibida FROM dbo.Compra c`;
function data(body) {
  const cantidad = Number(body.cantidad), costo = Number(body.costo), fecha = body.fecha ? new Date(body.fecha) : new Date();
  if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(costo) || costo < 0 || Number.isNaN(fecha.getTime())) throw new HttpError(400, 'VALIDATION_ERROR', 'Cantidad, costo y fecha deben ser válidos.');
  return { proveedor: required(body.proveedor, 'El proveedor'), insumo: required(body.insumo, 'El insumo'), cantidad, costo, fecha, recibida: !!body.recibida };
}
exports.list = async (_req, res) => { const pool = await getPool(); const { recordset } = await pool.request().query(`${select} JOIN dbo.Proveedor p ON p.ProveedorId=c.ProveedorId JOIN dbo.Insumo i ON i.InsumoId=c.InsumoId ORDER BY c.Fecha DESC`); res.json(recordset); };
exports.create = async (req, res) => {
  const d = data(req.body), id = req.body.id || require('node:crypto').randomUUID();
  if (d.recibida) throw new HttpError(400, 'RECEIPT_REQUIRED', 'Crea la compra pendiente y usa la acción de recepción para aumentar el stock.');
  try { const pool = await getPool(); await pool.request().input('id', sql.UniqueIdentifier, id).input('supplier', sql.NVarChar(50), d.proveedor).input('stock', sql.NVarChar(50), d.insumo).input('qty', sql.Decimal(12, 3), d.cantidad).input('cost', sql.Decimal(12, 2), d.costo).input('date', sql.DateTime2, d.fecha).query('INSERT dbo.Compra(CompraId,ProveedorId,InsumoId,Cantidad,CostoTotal,Fecha,Recibida) VALUES(@id,@supplier,@stock,@qty,@cost,@date,0)'); res.status(201).json({ ...d, id, recibida: false }); }
  catch (error) { if (isUniqueError(error)) throw new HttpError(409, 'PURCHASE_EXISTS', 'La compra ya existe.'); if (isForeignKeyError(error)) throw new HttpError(400, 'REFERENCE_NOT_FOUND', 'El proveedor o el insumo no existe.'); throw error; }
};
exports.update = async (req, res) => {
  const d = data(req.body), pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('supplier', sql.NVarChar(50), d.proveedor).input('stock', sql.NVarChar(50), d.insumo).input('qty', sql.Decimal(12, 3), d.cantidad).input('cost', sql.Decimal(12, 2), d.costo).input('date', sql.DateTime2, d.fecha).query('UPDATE dbo.Compra SET ProveedorId=@supplier,InsumoId=@stock,Cantidad=@qty,CostoTotal=@cost,Fecha=@date WHERE CompraId=@id AND Recibida=0');
  if (!result.rowsAffected[0]) throw new HttpError(404, 'PURCHASE_NOT_EDITABLE', 'No existe la compra pendiente o ya fue recibida.');
  res.json({ ...d, id: req.params.id, recibida: false });
};
exports.remove = async (req, res) => { const pool = await getPool(); const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query('DELETE dbo.Compra WHERE CompraId=@id AND Recibida=0'); if (!result.rowsAffected[0]) throw new HttpError(404, 'PURCHASE_NOT_EDITABLE', 'No existe la compra pendiente o ya fue recibida.'); res.status(204).send(); };
exports.receive = async (req, res) => {
  const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    const purchase = await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).query('SELECT CompraId,InsumoId,Cantidad FROM dbo.Compra WITH (UPDLOCK,ROWLOCK) WHERE CompraId=@id');
    if (!purchase.recordset[0]) throw new HttpError(404, 'PURCHASE_NOT_FOUND', 'No se encontró la compra.');
    const row = purchase.recordset[0];
    const updated = await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).query('UPDATE dbo.Compra SET Recibida=1,FechaRecepcion=SYSUTCDATETIME() WHERE CompraId=@id AND Recibida=0');
    if (updated.rowsAffected[0]) {
      await new sql.Request(tx).input('stock', sql.NVarChar(50), row.InsumoId).input('qty', sql.Decimal(12, 3), row.Cantidad).query('UPDATE dbo.Insumo SET Cantidad=Cantidad+@qty WHERE InsumoId=@stock');
      await new sql.Request(tx).input('stock', sql.NVarChar(50), row.InsumoId).input('purchase', sql.UniqueIdentifier, row.CompraId).input('qty', sql.Decimal(12, 3), row.Cantidad).input('user', sql.UniqueIdentifier, req.user.id).query(`INSERT dbo.MovimientoStock(InsumoId,CompraId,Tipo,Cantidad,Observacion,UsuarioId) VALUES(@stock,@purchase,N'Entrada',@qty,N'Recepción de compra',@user)`);
    }
    await tx.commit();
    const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`${select} WHERE c.CompraId=@id`); res.json(result.recordset[0]);
  } catch (error) { await tx.rollback(); throw error; }
};
