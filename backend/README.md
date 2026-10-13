# Backend de Estación Café

API REST con Express 5 y Microsoft SQL Server. La aplicación no usa `data.json` como almacenamiento: el archivo queda únicamente como referencia de la simulación anterior.

## Requisitos y arranque

1. Ejecuta `database/sqlserver_estacion_cafe.sql` en SQL Server. Crea `EstacionCafeDb`, el esquema y los datos de ejemplo.
2. Copia `.env.example` como `.env` y configura servidor, credenciales, origen Angular y una clave JWT privada.
3. Desde `backend/`, ejecuta `npm install` y luego `npm run dev` (o `npm start`).
4. La API escucha en `http://localhost:3000/api/v1`; `GET /health` verifica también la conexión a SQL Server.
5. El frontend apunta a esta URL en `src/app/core/api.config.ts` y `API_MODE` está en `http`.

## Estructura

- `src/routes/`: rutas modulares por recurso.
- `src/controllers/`: validación, reglas y consultas SQL de cada ruta.
- `src/middleware/`: autenticación, autorización por rol y errores.
- `src/config/database.js`: conexión SQL Server con pool compartido.
- `src/utils/`: tokens, errores y validaciones comunes.

No se agregaron vistas ni modelos JavaScript: el esquema y la persistencia los administra SQL Server.

## Rutas principales

| Recurso | Operaciones | Acceso |
|---|---|---|
| `/auth` | estado/bootstrap de admin, registro, login, perfil, cambio de clave, `/me/orders` | Público para estado/bootstrap/registro/login; resto con Bearer |
| `/categories` | GET, POST, PUT, DELETE | GET público; escritura Administrador |
| `/products` | GET, GET por id, POST, PUT, DELETE lógico | GET público; escritura Administrador |
| `/users` | CRUD de empleados; borrar desactiva | Administrador |
| `/orders` | GET, POST, PUT, cambio de estado, confirmar efectivo | Bearer; permisos específicos por rol |
| `/stock` | CRUD de insumos; crea movimientos de ajuste | Administrador/Logistica; borrar Administrador |
| `/suppliers` | CRUD lógico | Administrador/Logistica |
| `/purchases` | CRUD pendiente y `POST /:id/receive` | Administrador/Logistica |

La especificación ampliada de requests, respuestas y reglas permanece en [`../API_DOCUMENTACION.md`](../API_DOCUMENTACION.md).

## Seguridad

- JWT firmado HS256, vigencia de 8 horas; el middleware revalida usuario activo y rol con la BD en cada request.
- Contraseñas PBKDF2-SHA256 con sal aleatoria; nunca se devuelven hashes ni sales.
- Consultas parametrizadas y transacciones para pedidos, adicionales, ajustes iniciales y recepción de compras.
- CORS acepta solicitudes desde cualquier origen (`cors()` sin lista de dominios). La API no usa cookies de sesión; autentica rutas privadas con Bearer token.
- Para RDS en `us-east-1`, `DB_CA_CERT=./certs/us-east-1-bundle.pem` configura la CA regional incluida; mantén `DB_TRUST_SERVER_CERTIFICATE=false` para verificar el certificado del servidor.
