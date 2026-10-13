const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { getPool, sql } = require('../config/database');
const { HttpError } = require('../utils/http-error');
const { publicUser, signToken } = require('../utils/auth-token');

const pbkdf2 = promisify(crypto.pbkdf2);
const roles = ['Administrador', 'Logistica', 'Barista / Cocina', 'Caja', 'Cliente'];

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'La contraseña debe tener entre 8 y 128 caracteres.');
  }
}

function readProfile(body, { allowRole = false } = {}) {
  const profile = {
    id: body.id || crypto.randomUUID(),
    nombre: String(body.nombre || '').trim(),
    paterno: String(body.paterno || '').trim(),
    materno: String(body.materno || '').trim(),
    correo: String(body.correo || '').trim().toLowerCase(),
    telefono: String(body.telefono || '').trim(),
    direccion: String(body.direccion || '').trim(),
    rol: allowRole ? body.rol : 'Cliente',
    usuario: String(body.usuario || '').trim().toLowerCase(),
  };
  if (!profile.nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.correo)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Ingresa nombres y un correo válido.');
  }
  if (allowRole && !roles.includes(profile.rol)) throw new HttpError(400, 'VALIDATION_ERROR', 'El rol indicado no es válido.');
  return profile;
}

async function saveNewUser(transaction, profile, password) {
  const salt = crypto.randomBytes(24);
  const hash = await pbkdf2(password, salt, 100000, 32, 'sha256');
  await new sql.Request(transaction)
    .input('id', sql.UniqueIdentifier, profile.id)
    .input('nombre', sql.NVarChar(120), profile.nombre)
    .input('paterno', sql.NVarChar(80), profile.paterno)
    .input('materno', sql.NVarChar(80), profile.materno)
    .input('correo', sql.NVarChar(254), profile.correo)
    .input('telefono', sql.NVarChar(30), profile.telefono)
    .input('direccion', sql.NVarChar(300), profile.direccion)
    .input('rol', sql.NVarChar(30), profile.rol)
    .input('usuario', sql.NVarChar(80), profile.usuario)
    .input('hash', sql.VarBinary(64), hash)
    .input('salt', sql.VarBinary(64), salt)
    .query(`INSERT dbo.Usuario(UsuarioId,Nombres,ApellidoPaterno,ApellidoMaterno,Correo,Telefono,Direccion,Rol,NombreUsuario,PasswordHash,PasswordSalt)
            VALUES(@id,@nombre,@paterno,@materno,@correo,@telefono,@direccion,@rol,@usuario,@hash,@salt)`);
}

async function setPassword(userId, password) {
  validatePassword(password);
  const salt = crypto.randomBytes(24);
  const hash = await pbkdf2(password, salt, 100000, 32, 'sha256');
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, userId).input('hash', sql.VarBinary(64), hash).input('salt', sql.VarBinary(64), salt).query('UPDATE dbo.Usuario SET PasswordHash=@hash,PasswordSalt=@salt WHERE UsuarioId=@id AND Activo=1');
  if (!result.rowsAffected[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'No se encontró el empleado.');
}

async function createAccount(req, res, role, bootstrapOnly = false) {
  validatePassword(req.body.password);
  const profile = readProfile({ ...req.body, rol: role }, { allowRole: true });
  profile.rol = role;
  if (role !== 'Cliente' && !profile.usuario) throw new HttpError(400, 'VALIDATION_ERROR', 'El nombre de usuario es obligatorio para empleados.');
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const count = await new sql.Request(transaction).query('SELECT COUNT_BIG(1) AS total FROM dbo.Usuario');
    if (bootstrapOnly && Number(count.recordset[0].total) > 0) throw new HttpError(409, 'BOOTSTRAP_CLOSED', 'El administrador inicial ya fue creado.');
    if (bootstrapOnly) profile.rol = 'Administrador';
    await saveNewUser(transaction, profile, req.body.password);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    if (error instanceof HttpError) throw error;
    if (error.number === 2627 || error.number === 2601) throw new HttpError(409, 'USER_EXISTS', 'El correo o nombre de usuario ya está registrado.');
    throw error;
  }
  const user = publicUser({ ...profile, UsuarioId: profile.id, Nombres: profile.nombre, ApellidoPaterno: profile.paterno, ApellidoMaterno: profile.materno, Correo: profile.correo, Telefono: profile.telefono, Direccion: profile.direccion, Rol: profile.rol, NombreUsuario: profile.usuario });
  if (role === 'Cliente') return res.status(201).json({ accessToken: signToken(user), tokenType: 'Bearer', expiresIn: 28800, user });
  res.status(201).json(user);
}

exports.bootstrapAdmin = (req, res) => createAccount(req, res, 'Administrador', true);
exports.bootstrapStatus = async (_req, res) => {
  const pool = await getPool();
  const result = await pool.request().query('SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.Usuario) THEN CAST(0 AS bit) ELSE CAST(1 AS bit) END AS disponible');
  res.json({ disponible: result.recordset[0].disponible });
};
exports.registerCustomer = (req, res) => createAccount(req, res, 'Cliente');
exports.createEmployee = (req, res) => createAccount(req, res, req.body.rol);
exports.setPassword = setPassword;

exports.login = async (req, res) => {
  const login = String(req.body.login || '').trim().toLowerCase();
  const password = req.body.password;
  if (!login || typeof password !== 'string') throw new HttpError(400, 'VALIDATION_ERROR', 'Usuario/correo y contraseña son obligatorios.');
  const pool = await getPool();
  const result = await pool.request().input('login', sql.NVarChar(254), login).query(`
    SELECT UsuarioId,Rol,NombreUsuario,Correo,Nombres,ApellidoPaterno,ApellidoMaterno,Telefono,Direccion,PasswordHash,PasswordSalt,Activo
    FROM dbo.Usuario WHERE LOWER(Correo)=@login OR LOWER(NombreUsuario)=@login
  `);
  const row = result.recordset[0];
  if (!row || !row.Activo) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
  const candidate = await pbkdf2(password, row.PasswordSalt, 100000, 32, 'sha256');
  if (candidate.length !== row.PasswordHash.length || !crypto.timingSafeEqual(candidate, row.PasswordHash)) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');
  const user = publicUser(row);
  res.json({ accessToken: signToken(user), tokenType: 'Bearer', expiresIn: 28800, user });
};

exports.logout = (_req, res) => res.status(204).send();
exports.me = async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.user.id).query(`SELECT UsuarioId,Nombres,ApellidoPaterno,ApellidoMaterno,Correo,Telefono,Direccion,Rol,NombreUsuario FROM dbo.Usuario WHERE UsuarioId=@id AND Activo=1`);
  if (!result.recordset[0]) throw new HttpError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  res.json(publicUser(result.recordset[0]));
};

exports.updateProfile = async (req, res) => {
  const profile = readProfile({ ...req.body, rol: 'Cliente', usuario: '' });
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.UniqueIdentifier, req.user.id)
    .input('nombre', sql.NVarChar(120), profile.nombre)
    .input('paterno', sql.NVarChar(80), profile.paterno)
    .input('materno', sql.NVarChar(80), profile.materno)
    .input('telefono', sql.NVarChar(30), profile.telefono)
    .input('direccion', sql.NVarChar(300), profile.direccion)
    .query(`UPDATE dbo.Usuario SET Nombres=@nombre,ApellidoPaterno=@paterno,ApellidoMaterno=@materno,Telefono=@telefono,Direccion=@direccion
            OUTPUT inserted.UsuarioId,inserted.Nombres,inserted.ApellidoPaterno,inserted.ApellidoMaterno,inserted.Correo,inserted.Telefono,inserted.Direccion,inserted.Rol,inserted.NombreUsuario
            WHERE UsuarioId=@id AND Rol=N'Cliente'`);
  if (!result.recordset[0]) throw new HttpError(403, 'FORBIDDEN', 'Solo un cliente puede editar su perfil.');
  res.json(publicUser(result.recordset[0]));
};

exports.changePassword = async (req, res) => {
  validatePassword(req.body.newPassword);
  const pool = await getPool();
  const result = await pool.request().input('id', sql.UniqueIdentifier, req.user.id).query('SELECT PasswordHash,PasswordSalt FROM dbo.Usuario WHERE UsuarioId=@id AND Activo=1');
  const row = result.recordset[0];
  if (!row) throw new HttpError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  const current = await pbkdf2(String(req.body.currentPassword || ''), row.PasswordSalt, 100000, 32, 'sha256');
  if (current.length !== row.PasswordHash.length || !crypto.timingSafeEqual(current, row.PasswordHash)) throw new HttpError(400, 'CURRENT_PASSWORD_INVALID', 'La contraseña actual es incorrecta.');
  const salt = crypto.randomBytes(24);
  const hash = await pbkdf2(req.body.newPassword, salt, 100000, 32, 'sha256');
  await pool.request().input('id', sql.UniqueIdentifier, req.user.id).input('hash', sql.VarBinary(64), hash).input('salt', sql.VarBinary(64), salt).query('UPDATE dbo.Usuario SET PasswordHash=@hash,PasswordSalt=@salt WHERE UsuarioId=@id');
  res.status(204).send();
};

exports.myOrders = async (req, res) => {
  const controller = require('./orders.controller');
  req.query.mine = '1';
  return controller.list(req, res);
};
