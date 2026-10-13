const crypto = require('node:crypto');
const { HttpError } = require('./http-error');

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({ sub: user.id, role: user.rol, iat: now, exp: now + 8 * 60 * 60 });
  const unsigned = `${head}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  const [head, body, signature, extra] = String(token || '').split('.');
  if (!head || !body || !signature || extra) throw new Error('Token inválido.');
  const header = JSON.parse(Buffer.from(head, 'base64url').toString('utf8'));
  if (header.alg !== 'HS256' || header.typ !== 'JWT') throw new Error('Token inválido.');
  const unsigned = `${head}.${body}`;
  const expected = crypto.createHmac('sha256', secret).update(unsigned).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error('Firma inválida.');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token vencido.');
  return payload;
}

function publicUser(row) {
  return {
    id: row.UsuarioId,
    nombre: row.Nombres,
    paterno: row.ApellidoPaterno,
    materno: row.ApellidoMaterno,
    correo: row.Correo,
    telefono: row.Telefono,
    direccion: row.Direccion,
    rol: row.Rol,
    usuario: row.NombreUsuario,
  };
}

module.exports = { signToken, verifyToken, publicUser };
