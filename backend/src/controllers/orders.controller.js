const crypto = require('node:crypto');
const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');

const roles = ['Administrador', 'Logistica', 'Barista / Cocina', 'Caja', 'Cliente'];
const orderQuery = `SELECT p.PedidoId id,p.UsuarioId userId,p.NombreContacto nombre,p.CorreoContacto correo,p.TelefonoContacto telefono,p.DireccionEntrega direccion,p.Mesa mesa,
  p.TipoEntrega entrega,p.MetodoPago pago,p.Pagado pagado,p.Estado estado,p.Fecha fecha,p.Total total,
  d.PedidoDetalleId lineId,d.ProductoId productoId,d.NombreProducto lineName,d.PrecioUnitario precio,d.Cantidad cantidad,d.Leche leche,d.Endulzante endulzante,d.Indicaciones indicaciones,a.Nombre extraName
  FROM dbo.Pedido p LEFT JOIN dbo.PedidoDetalle d ON d.PedidoId=p.PedidoId LEFT JOIN dbo.PedidoDetalleAdicional a ON a.PedidoDetalleId=d.PedidoDetalleId`;
async function loadOrders(pool, where, bind) {
  const request = pool.request(); bind(request);
  const { recordset } = await request.query(`${orderQuery} ${where} ORDER BY p.Fecha DESC,d.PedidoDetalleId,a.PedidoDetalleAdicionalId`);
  const orders = new Map();
  for (const row of recordset) {
    let order = orders.get(row.id);
    if (!order) { order = { id: row.id, userId: row.userId, nombre: row.nombre, correo: row.correo, telefono: row.telefono, direccion: row.direccion, mesa: row.mesa, entrega: row.entrega, pago: row.pago, pagado: row.pagado, estado: row.estado, fecha: row.fecha, total: Number(row.total), items: [] }; orders.set(row.id, order); }
    if (row.lineId !== null) {
      let line = order.items.find((item) => item.id === String(row.lineId));
      if (!line) { line = { id: String(row.lineId), productoId: row.productoId, nombre: row.lineName, precio: Number(row.precio), cantidad: row.cantidad, leche: row.leche, endulzante: row.endulzante, extras: [], indicaciones: row.indicaciones }; order.items.push(line); }
      if (row.extraName && !line.extras.includes(row.extraName)) line.extras.push(row.extraName);
    }
  }
  return [...orders.values()];
}
exports.list = async (req, res) => {
  const pool = await getPool();
  const customerOnly = req.user.rol === 'Cliente' || req.query.mine === '1';
  const orders = await loadOrders(pool, customerOnly ? 'WHERE p.UsuarioId=@uid' : '', (r) => { if (customerOnly) r.input('uid', sql.UniqueIdentifier, req.user.id); });
  res.json(orders);
};
function normalizeDelivery(value) {
  const v = String(value || '').trim();
  if (v === 'Mesa') return 'Mesa'; if (v === 'Delivery') return 'Delivery'; if (v === 'Recojo') return 'Recojo';
  throw new HttpError(400, 'VALIDATION_ERROR', 'Tipo de entrega no válido.');
}
function normalizePayment(value) {
  const v = String(value || '').trim();
  if (v === 'Billetera digital') return 'Billetera'; if (v === 'Tarjeta crédito / débito') return 'Tarjeta';
  if (['Billetera', 'Tarjeta', 'Efectivo'].includes(v)) return v;
  throw new HttpError(400, 'VALIDATION_ERROR', 'Método de pago no válido.');
}
function validateOrder(body) {
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 80) throw new HttpError(400, 'VALIDATION_ERROR', 'El pedido debe incluir productos.');
  const entrega = normalizeDelivery(body.entrega), pago = normalizePayment(body.pago);
  const nombre = String(body.nombre || '').trim(), correo = String(body.correo || '').trim().toLowerCase(), telefono = String(body.telefono || '').trim();
  if (!nombre || !correo || !telefono) throw new HttpError(400, 'VALIDATION_ERROR', 'Nombre, correo y teléfono son obligatorios.');
  const direccion = String(body.direccion || '').trim(), mesa = String(body.mesa || '').trim();
  if (entrega === 'Mesa' ? !mesa : !direccion) throw new HttpError(400, 'VALIDATION_ERROR', 'Ingresa mesa o dirección de entrega.');
  return { entrega, pago, nombre, correo, telefono, direccion, mesa };
}
async function saveLines(tx, body, orderId) {
  let total = 0;
  for (const item of body.items) {
    const productId = Number(item.productoId), qty = Number(item.cantidad);
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || qty < 1 || qty > 99) throw new HttpError(400, 'VALIDATION_ERROR', 'Producto o cantidad no válidos.');
    const result = await new sql.Request(tx).input('id', sql.Int, productId).query(`SELECT p.ProductoId,p.Nombre,p.Precio,p.DescuentoPct,p.Personalizable FROM dbo.Producto p WHERE p.ProductoId=@id AND p.Activo=1`);
    const product = result.recordset[0]; if (!product) throw new HttpError(400, 'PRODUCT_NOT_AVAILABLE', 'Uno de los productos ya no está disponible.');
    if (item.extras?.length && !product.Personalizable) throw new HttpError(400, 'INVALID_EXTRA', 'El producto no admite adicionales.');
    const chosen = Array.isArray(item.extras) ? item.extras.map(String) : [];
    if (chosen.length > 10) throw new HttpError(400, 'VALIDATION_ERROR', 'Hay demasiados adicionales en una línea.');
    let extraTotal = 0;
    const extraRows = [];
    for (const name of chosen) {
      const extra = await new sql.Request(tx).input('pid', sql.Int, productId).input('name', sql.NVarChar(100), name).query('SELECT Nombre,Precio FROM dbo.ProductoAdicional WHERE ProductoId=@pid AND Nombre=@name AND Activo=1');
      if (!extra.recordset[0]) throw new HttpError(400, 'INVALID_EXTRA', `El adicional ${name} no está disponible.`);
      extraRows.push(extra.recordset[0]); extraTotal += Number(extra.recordset[0].Precio);
    }
    const unit = Math.round((Number(product.Precio) * (1 - Number(product.DescuentoPct) / 100) + extraTotal) * 100) / 100;
    total += unit * qty;
    const line = await new sql.Request(tx).input('orderId', sql.UniqueIdentifier, orderId).input('productId', sql.Int, productId).input('name', sql.NVarChar(150), product.Nombre).input('price', sql.Decimal(10, 2), unit).input('qty', sql.Int, qty).input('milk', sql.NVarChar(60), String(item.leche || '')).input('sweet', sql.NVarChar(60), String(item.endulzante || '')).input('instructions', sql.NVarChar(500), String(item.indicaciones || '')).query(`INSERT dbo.PedidoDetalle(PedidoId,ProductoId,NombreProducto,PrecioUnitario,Cantidad,Leche,Endulzante,Indicaciones) OUTPUT inserted.PedidoDetalleId VALUES(@orderId,@productId,@name,@price,@qty,@milk,@sweet,@instructions)`);
    for (const extra of extraRows) await new sql.Request(tx).input('lineId', sql.BigInt, line.recordset[0].PedidoDetalleId).input('name', sql.NVarChar(100), extra.Nombre).input('price', sql.Decimal(10, 2), extra.Precio).query('INSERT dbo.PedidoDetalleAdicional(PedidoDetalleId,Nombre,Precio) VALUES(@lineId,@name,@price)');
  }
  return Math.round(total * 100) / 100;
}
exports.create = async (req, res) => {
  const fields = validateOrder(req.body), id = req.body.id || crypto.randomUUID();
  if (req.user && !['Administrador', 'Caja', 'Cliente'].includes(req.user.rol)) throw new HttpError(403, 'FORBIDDEN', 'No tienes permiso para crear pedidos.');
  const userId = req.user?.rol === 'Cliente' ? req.user.id : (['Administrador', 'Caja'].includes(req.user?.rol) ? (req.body.userId || null) : null);
  const pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('uid', sql.UniqueIdentifier, userId).input('name', sql.NVarChar(160), fields.nombre).input('email', sql.NVarChar(254), fields.correo).input('phone', sql.NVarChar(30), fields.telefono).input('address', sql.NVarChar(300), fields.direccion).input('table', sql.NVarChar(20), fields.mesa).input('delivery', sql.NVarChar(20), fields.entrega).input('payment', sql.NVarChar(20), fields.pago).query(`INSERT dbo.Pedido(PedidoId,UsuarioId,NombreContacto,CorreoContacto,TelefonoContacto,DireccionEntrega,Mesa,TipoEntrega,MetodoPago,Estado,Pagado,Total) VALUES(@id,@uid,@name,@email,@phone,@address,@table,@delivery,@payment,N'Pendiente',0,0)`);
    const total = await saveLines(tx, req.body, id);
    await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('total', sql.Decimal(12, 2), total).query('UPDATE dbo.Pedido SET Total=@total WHERE PedidoId=@id');
    await tx.commit(); const order = (await loadOrders(pool, 'WHERE p.PedidoId=@id', (r) => r.input('id', sql.UniqueIdentifier, id)))[0]; res.status(201).json(order);
  } catch (error) { await tx.rollback(); throw error; }
};
exports.update = async (req, res) => {
  const fields = validateOrder(req.body), pool = await getPool(), tx = new sql.Transaction(pool); await tx.begin();
  try {
    const found = await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).query('SELECT Estado,Pagado FROM dbo.Pedido WITH (UPDLOCK) WHERE PedidoId=@id');
    if (!found.recordset[0] || ['Finalizado', 'Cancelado'].includes(found.recordset[0].Estado)) throw new HttpError(404, 'ORDER_NOT_EDITABLE', 'El pedido no existe o ya no se puede editar.');
    await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).input('name', sql.NVarChar(160), fields.nombre).input('email', sql.NVarChar(254), fields.correo).input('phone', sql.NVarChar(30), fields.telefono).input('address', sql.NVarChar(300), fields.direccion).input('table', sql.NVarChar(20), fields.mesa).input('delivery', sql.NVarChar(20), fields.entrega).input('payment', sql.NVarChar(20), fields.pago).query('UPDATE dbo.Pedido SET NombreContacto=@name,CorreoContacto=@email,TelefonoContacto=@phone,DireccionEntrega=@address,Mesa=@table,TipoEntrega=@delivery,MetodoPago=@payment WHERE PedidoId=@id');
    await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).query('DELETE dbo.PedidoDetalle WHERE PedidoId=@id');
    const total = await saveLines(tx, req.body, req.params.id);
    await new sql.Request(tx).input('id', sql.UniqueIdentifier, req.params.id).input('total', sql.Decimal(12, 2), total).query('UPDATE dbo.Pedido SET Total=@total WHERE PedidoId=@id');
    await tx.commit(); res.json((await loadOrders(pool, 'WHERE p.PedidoId=@id', (r) => r.input('id', sql.UniqueIdentifier, req.params.id)))[0]);
  } catch (error) { await tx.rollback(); throw error; }
};
exports.updateStatus = async (req, res) => {
  const status = String(req.body.estado || ''), allowed = ['Pendiente', 'En preparación', 'Listo', 'Finalizado', 'Cancelado'];
  if (!allowed.includes(status)) throw new HttpError(400, 'VALIDATION_ERROR', 'Estado de pedido no válido.');
  const pool = await getPool();
  const prior = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query('SELECT Estado FROM dbo.Pedido WHERE PedidoId=@id');
  if (!prior.recordset[0]) throw new HttpError(404, 'ORDER_NOT_FOUND', 'No se encontró el pedido.');
  if (['Finalizado', 'Cancelado'].includes(prior.recordset[0].Estado)) throw new HttpError(409, 'ORDER_CLOSED', 'El pedido ya fue cerrado.');
  if (req.user.rol === 'Barista / Cocina' && status !== 'Finalizado') throw new HttpError(403, 'FORBIDDEN', 'Barista / Cocina solo puede finalizar pedidos.');
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).input('status', sql.NVarChar(20), status).query('UPDATE dbo.Pedido SET Estado=@status WHERE PedidoId=@id');
  res.json((await loadOrders(pool, 'WHERE p.PedidoId=@id', (r) => r.input('id', sql.UniqueIdentifier, req.params.id)))[0]);
};
exports.confirmCash = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.params.id).query(`UPDATE dbo.Pedido SET Pagado=1 WHERE PedidoId=@id AND MetodoPago=N'Efectivo' AND Estado NOT IN (N'Cancelado',N'Finalizado')`);
  if (!result.rowsAffected[0]) throw new HttpError(409, 'PAYMENT_NOT_ALLOWED', 'El pedido no permite confirmar pago en efectivo.');
  res.json((await loadOrders(pool, 'WHERE p.PedidoId=@id', (r) => r.input('id', sql.UniqueIdentifier, req.params.id)))[0]);
};
