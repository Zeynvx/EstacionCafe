# Estación Café

Aplicación Angular 22 para clientes y administración de una cafetería. Mantiene la identidad café y crema, con Bootstrap 6.0.0-alpha.1 (CSS y JavaScript ESM) y DataTables 3.1.3 por CDN. No se instalaron dependencias npm de Bootstrap ni de DataTables.

## Ejecutar

```sh
npm install
npm start
npm run build
npm test -- --watch=false
```

Utiliza una versión de Node compatible con el Angular instalado. Se verificó con Node 24.19.0. Los CDN y las fotografías remotas requieren conexión a internet.

## Primer acceso

1. Abre `/login` en un navegador sin cuentas creadas en esta aplicación.
2. Completa los datos del formulario de registro y acepta los términos de demostración.
3. Pulsa **Configurar administrador local**. Se crea el usuario `admin.local` con la contraseña que elegiste.
4. Desde `/admin/empleados`, registra al personal. El usuario se genera como `primernombre.primerapellido`; se admite un sufijo numérico para homónimos.
5. Los clientes se registran en el mismo formulario mediante **Registrarme**, y acceden con correo y contraseña.

El alta inicial de administrador está disponible únicamente antes de crear la primera cuenta. No hay contraseñas predeterminadas. Para comenzar de cero en un entorno de pruebas, utiliza otro perfil de navegador o elimina las claves `ec.*` de almacenamiento local y de sesión; esto borra los datos de la demostración.

## Cliente

- `/inicio`: portada, carta y promociones.
- `/productos`: los 18 productos originales y los 5 combos, con filtro por categoría.
- `/promociones`: solo productos con descuento, conservando los importes originales de los combos.
- `/postres`: categorías marcadas como postres; `/carta-cafes` redirige aquí.
- Carrito lateral derecho persistente entre rutas y recargas, con cantidades, leche, endulzante, adicionales con precio e indicaciones.
- `/pedidos`: checkout para mesa, delivery y recojo; dirección para delivery y recojo conforme al documento. Métodos: billetera, tarjeta y efectivo.
- `/usuario`: datos personales, dirección, cambio de contraseña con comprobación de contraseña actual e historial de pedidos de la cuenta. El correo no se puede cambiar.

## Administración

Cada sección administrativa tiene su propia carpeta, componente y plantilla bajo `src/app/admin` (por ejemplo, `categorias/categorias.ts` y `categorias/categorias.html`). Cada vista contiene su lógica y su `NgForm`; sus operaciones CRUD se delegan en servicios de `src/app/service/`. Las páginas usan DataTables con búsqueda, ordenación y paginación. Crear y editar abre un diálogo. Los registros referenciados no se pueden eliminar mientras tengan dependencias.

| Rol              | Acceso                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Administrador    | Dashboard, carta, categorías, trabajadores, clientes, pedidos, stock, proveedores y compras |
| Logistica        | Dashboard operativo, consulta de pedidos, stock, proveedores y compras                      |
| Barista / Cocina | Dashboard operativo, consulta y finalización de pedidos                                     |
| Caja             | Dashboard operativo, creación, edición y finalización de pedidos, confirmación de efectivo  |

Los pedidos de caja no requieren crear un cliente. El nombre es opcional y la mesa es obligatoria para salón. Los pedidos cerrados no se editan. Un pedido cobrado no permite cambiar su importe ni cancelarlo desde este prototipo.

Cada insumo tiene una unidad (`kg`, `g`, `L`, `mL` o `unidad`), existencia y mínimo. No hay almacenes. Una compra incrementa las existencias al confirmar su recepción y no se puede recibir dos veces. La unidad queda protegida cuando existen compras asociadas. El ajuste manual de existencias permite registrar consumos; no existe descuento automático por recetas, porque el documento no define recetas ni rendimientos.

## Persistencia y alcance

Este repositorio contiene solo frontend y aún no incluye un servidor. `Store` accede a los datos por `ApiService`. Por defecto `API_MODE` es `mock`, que simula endpoints y persiste las colecciones en el almacenamiento local; el carrito también permanece local. La URL base configurable está en `src/app/core/api.config.ts`. El modo `http` habilita las llamadas CRUD para la futura API, pero todavía requiere integrar autenticación y autorización de servidor antes de conectar datos reales.

No hay cobros reales, envío de correos, integración de billeteras ni pasarela de tarjetas. Todos los pagos nuevos quedan pendientes; caja o administración pueden confirmar efectivo. La pantalla no recopila datos de tarjeta. La especificación del backend y sus endpoints está en [API_DOCUMENTACION.md](API_DOCUMENTACION.md); antes de producción hacen falta autenticación y autorización del servidor, validación de precios y roles en servidor, sesiones seguras y proveedor de pagos.

Los pedidos realizados sin iniciar sesión permanecen como pedidos invitados; no se vinculan automáticamente a cuentas por coincidencia de correo. No hay sincronización entre equipos o pestañas abiertas.

## Validación

- Compilación de producción: `npm run build`.
- Pruebas Angular: `npm test -- --watch=false`, con cobertura de persistencia del carrito, cantidades, descuentos, redondeo, permisos, recepción idempotente de compras y pagos pendientes.
- `checks/browser.cjs` prueba la compilación de producción en Edge sin interfaz usando Playwright. Sirve los archivos en `127.0.0.1:4300`, usa un contexto aislado y cierra el servidor al terminar. Se puede indicar la ruta de Playwright con `PLAYWRIGHT_MODULE`, o usar una instalación accesible de `playwright`.

Bootstrap 6 es una versión alpha. Su migración incorpora `dialog`, `drawer`, tokens de tema, controles y utilidades propios de v6. DataTables usa su tema base, porque el CDN todavía no ofrece integración específica para Bootstrap 6.
