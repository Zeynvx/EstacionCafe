const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { required, isUniqueError, isForeignKeyError } = require('../utils/crud');

const productSelect = `SELECT p.ProductoId id,p.Nombre nombre,p.Descripcion descripcion,p.Precio precio,p.CategoriaId categoria,p.ImagenUrl imagen,p.DescuentoPct descuento,p.Personalizable personalizable,
  COALESCE((SELECT STRING_AGG(CONCAT(a.Nombre,':',CONVERT(varchar(32),a.Precio)),',') WITHIN GROUP (ORDER BY a.AdicionalId) FROM dbo.ProductoAdicional a WHERE a.ProductoId=p.ProductoId AND a.Activo=1),'') adicionales
  FROM dbo.Producto p JOIN dbo.Categoria c ON c.CategoriaId=p.CategoriaId`;
async function readProduct(pool, productId) {
  const result = await pool.request().input('id', sql.Int, productId).query(`${productSelect} WHERE p.ProductoId=@id AND p.Activo=1`);
  return result.recordset[0];
}
function productData(body) {
  const price = Number(body.precio), discount = Number(body.descuento ?? 0);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(discount) || discount < 0 || discount > 100) throw new HttpError(400, 'VALIDATION_ERROR', 'Precio y descuento deben ser válidos.');
  return { nombre: required(body.nombre, 'El nombre'), descripcion: String(body.descripcion || ''), categoria: required(body.categoria, 'La categoría'), imagen: String(body.imagen || ''), precio: price, descuento: discount, personalizable: !!body.personalizable, adicionales: String(body.adicionales || '') };
}
async function saveExtras(transaction, productId, raw) {
  await new sql.Request(transaction).input('id', sql.Int, productId).query('DELETE dbo.ProductoAdicional WHERE ProductoId=@id');
  for (const entry of raw.split(',').map((x) => x.trim()).filter(Boolean)) {
    const sep = entry.lastIndexOf(':');
    const name = required(sep < 0 ? entry : entry.slice(0, sep), 'El adicional');
    const price = sep < 0 ? 0 : Number(entry.slice(sep + 1));
    if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'VALIDATION_ERROR', 'El precio de los adicionales debe ser válido.');
    await new sql.Request(transaction).input('id', sql.Int, productId).input('name', sql.NVarChar(100), name).input('price', sql.Decimal(10, 2), price).query('INSERT dbo.ProductoAdicional(ProductoId,Nombre,Precio) VALUES(@id,@name,@price)');
  }
}
exports.list = async (_req, res) => { const pool = await getPool(); const result = await pool.request().query(`${productSelect} WHERE p.Activo=1 ORDER BY p.ProductoId`); res.json(result.recordset); };
exports.get = async (req, res) => { const product = await readProduct(await getPool(), req.params.id); if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto.'); res.json(product); };
exports.create = async (req, res) => {
  const data = productData(req.body), id = Number(req.body.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'VALIDATION_ERROR', 'El id del producto debe ser un entero positivo.');
  const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    await new sql.Request(tx).input('id', sql.Int, id).input('name', sql.NVarChar(150), data.nombre).input('desc', sql.NVarChar(1000), data.descripcion).input('cat', sql.NVarChar(50), data.categoria).input('image', sql.NVarChar(1000), data.imagen).input('price', sql.Decimal(10, 2), data.precio).input('discount', sql.Decimal(5, 2), data.descuento).input('custom', sql.Bit, data.personalizable).query('INSERT dbo.Producto(ProductoId,Nombre,Descripcion,CategoriaId,ImagenUrl,Precio,DescuentoPct,Personalizable) VALUES(@id,@name,@desc,@cat,@image,@price,@discount,@custom)');
    await saveExtras(tx, id, data.adicionales); await tx.commit(); res.status(201).json(await readProduct(pool, id));
  } catch (error) { await tx.rollback(); if (isUniqueError(error)) throw new HttpError(409, 'PRODUCT_EXISTS', 'Ya existe un producto con ese id.'); if (isForeignKeyError(error)) throw new HttpError(400, 'CATEGORY_NOT_FOUND', 'La categoría indicada no existe.'); throw error; }
};
exports.update = async (req, res) => {
  const data = productData(req.body), id = Number(req.params.id);
  const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    const result = await new sql.Request(tx).input('id', sql.Int, id).input('name', sql.NVarChar(150), data.nombre).input('desc', sql.NVarChar(1000), data.descripcion).input('cat', sql.NVarChar(50), data.categoria).input('image', sql.NVarChar(1000), data.imagen).input('price', sql.Decimal(10, 2), data.precio).input('discount', sql.Decimal(5, 2), data.descuento).input('custom', sql.Bit, data.personalizable).query('UPDATE dbo.Producto SET Nombre=@name,Descripcion=@desc,CategoriaId=@cat,ImagenUrl=@image,Precio=@price,DescuentoPct=@discount,Personalizable=@custom WHERE ProductoId=@id AND Activo=1');
    if (!result.rowsAffected[0]) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto.');
    await saveExtras(tx, id, data.adicionales); await tx.commit(); res.json(await readProduct(pool, id));
  } catch (error) { await tx.rollback(); if (isForeignKeyError(error)) throw new HttpError(400, 'CATEGORY_NOT_FOUND', 'La categoría indicada no existe.'); throw error; }
};
exports.remove = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, req.params.id).query('UPDATE dbo.Producto SET Activo=0 WHERE ProductoId=@id AND Activo=1');
  if (!result.rowsAffected[0]) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto.');
  res.status(204).send();
};
