/*
  Estacion Cafe - esquema inicial para Microsoft SQL Server
  Alcance: requisitos documentados e implementados en el frontend del proyecto.
  Ejecutar en SSMS o Azure Data Studio. Crea la BD si no existe y luego las tablas.
  Seguridad: Usuarios guarda hash y salt, nunca contrasenas en texto plano.
*/
IF DB_ID(N'EstacionCafeDb') IS NULL
    CREATE DATABASE EstacionCafe;
GO
USE EstacionCafe;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'dbo.Categoria', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categoria (
        CategoriaId       nvarchar(50) NOT NULL CONSTRAINT PK_Categoria PRIMARY KEY,
        Nombre            nvarchar(100) NOT NULL,
        EsPostre          bit NOT NULL CONSTRAINT DF_Categoria_EsPostre DEFAULT (0),
        CONSTRAINT UQ_Categoria_Nombre UNIQUE (Nombre)
    );
END;
GO

IF OBJECT_ID(N'dbo.Usuario', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Usuario (
        UsuarioId         uniqueidentifier NOT NULL CONSTRAINT DF_Usuario_Id DEFAULT NEWSEQUENTIALID(),
        Nombres           nvarchar(120) NOT NULL,
        ApellidoPaterno   nvarchar(80) NOT NULL CONSTRAINT DF_Usuario_ApellidoPaterno DEFAULT (N''),
        ApellidoMaterno   nvarchar(80) NOT NULL CONSTRAINT DF_Usuario_ApellidoMaterno DEFAULT (N''),
        Correo            nvarchar(254) NOT NULL,
        Telefono          nvarchar(30) NOT NULL CONSTRAINT DF_Usuario_Telefono DEFAULT (N''),
        Direccion         nvarchar(300) NOT NULL CONSTRAINT DF_Usuario_Direccion DEFAULT (N''),
        Rol               nvarchar(30) NOT NULL,
        NombreUsuario     nvarchar(80) NOT NULL CONSTRAINT DF_Usuario_NombreUsuario DEFAULT (N''),
        PasswordHash      varbinary(64) NOT NULL,
        PasswordSalt      varbinary(64) NOT NULL,
        Activo            bit NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
        FechaCreacion     datetime2(0) NOT NULL CONSTRAINT DF_Usuario_Fecha DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Usuario PRIMARY KEY (UsuarioId),
        CONSTRAINT UQ_Usuario_Correo UNIQUE (Correo),
        CONSTRAINT CK_Usuario_Rol CHECK (Rol IN (N'Administrador', N'Logistica', N'Barista / Cocina', N'Caja', N'Cliente'))
    );
END;
GO

/* Los clientes autentican por correo y pueden no tener NombreUsuario. */
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Usuario') AND name = N'UQ_Usuario_NombreUsuario')
    ALTER TABLE dbo.Usuario DROP CONSTRAINT UQ_Usuario_NombreUsuario;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Usuario') AND name = N'UX_Usuario_NombreUsuario')
    CREATE UNIQUE INDEX UX_Usuario_NombreUsuario ON dbo.Usuario(NombreUsuario) WHERE NombreUsuario <> N'';
GO

IF OBJECT_ID(N'dbo.Producto', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Producto (
        ProductoId        int NOT NULL,
        Nombre            nvarchar(150) NOT NULL,
        Descripcion       nvarchar(1000) NOT NULL CONSTRAINT DF_Producto_Descripcion DEFAULT (N''),
        CategoriaId       nvarchar(50) NOT NULL,
        ImagenUrl         nvarchar(1000) NOT NULL CONSTRAINT DF_Producto_Imagen DEFAULT (N''),
        Precio            decimal(10,2) NOT NULL,
        DescuentoPct      decimal(5,2) NOT NULL CONSTRAINT DF_Producto_Descuento DEFAULT (0),
        Personalizable    bit NOT NULL CONSTRAINT DF_Producto_Personalizable DEFAULT (0),
        Activo            bit NOT NULL CONSTRAINT DF_Producto_Activo DEFAULT (1),
        CONSTRAINT PK_Producto PRIMARY KEY (ProductoId),
        CONSTRAINT FK_Producto_Categoria FOREIGN KEY (CategoriaId) REFERENCES dbo.Categoria(CategoriaId),
        CONSTRAINT CK_Producto_Precio CHECK (Precio > 0),
        CONSTRAINT CK_Producto_Descuento CHECK (DescuentoPct BETWEEN 0 AND 100)
    );
END;
GO

IF OBJECT_ID(N'dbo.ProductoAdicional', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductoAdicional (
        AdicionalId      int IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductoAdicional PRIMARY KEY,
        ProductoId       int NOT NULL,
        Nombre           nvarchar(100) NOT NULL,
        Precio           decimal(10,2) NOT NULL CONSTRAINT DF_Adicional_Precio DEFAULT (0),
        Activo           bit NOT NULL CONSTRAINT DF_Adicional_Activo DEFAULT (1),
        CONSTRAINT FK_Adicional_Producto FOREIGN KEY (ProductoId) REFERENCES dbo.Producto(ProductoId),
        CONSTRAINT UQ_Adicional_Producto_Nombre UNIQUE (ProductoId, Nombre),
        CONSTRAINT CK_Adicional_Precio CHECK (Precio >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Pedido', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pedido (
        PedidoId             uniqueidentifier NOT NULL CONSTRAINT DF_Pedido_Id DEFAULT NEWSEQUENTIALID(),
        UsuarioId            uniqueidentifier NULL,
        Fecha                 datetime2(0) NOT NULL CONSTRAINT DF_Pedido_Fecha DEFAULT (SYSUTCDATETIME()),
        NombreContacto        nvarchar(160) NOT NULL CONSTRAINT DF_Pedido_Nombre DEFAULT (N''),
        CorreoContacto        nvarchar(254) NOT NULL CONSTRAINT DF_Pedido_Correo DEFAULT (N''),
        TelefonoContacto      nvarchar(30) NOT NULL CONSTRAINT DF_Pedido_Telefono DEFAULT (N''),
        DireccionEntrega      nvarchar(300) NOT NULL CONSTRAINT DF_Pedido_Direccion DEFAULT (N''),
        Mesa                  nvarchar(20) NOT NULL CONSTRAINT DF_Pedido_Mesa DEFAULT (N''),
        TipoEntrega           nvarchar(20) NOT NULL,
        MetodoPago            nvarchar(20) NOT NULL,
        Estado                nvarchar(20) NOT NULL CONSTRAINT DF_Pedido_Estado DEFAULT (N'Pendiente'),
        Pagado                bit NOT NULL CONSTRAINT DF_Pedido_Pagado DEFAULT (0),
        Total                 decimal(12,2) NOT NULL CONSTRAINT DF_Pedido_Total DEFAULT (0),
        CONSTRAINT PK_Pedido PRIMARY KEY (PedidoId),
        CONSTRAINT FK_Pedido_Usuario FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuario(UsuarioId) ON DELETE SET NULL,
        CONSTRAINT CK_Pedido_Entrega CHECK (TipoEntrega IN (N'Mesa', N'Delivery', N'Recojo')),
        CONSTRAINT CK_Pedido_Pago CHECK (MetodoPago IN (N'Billetera', N'Tarjeta', N'Efectivo')),
        CONSTRAINT CK_Pedido_Estado CHECK (Estado IN (N'Pendiente', N'En preparación', N'Listo', N'Finalizado', N'Cancelado')),
        CONSTRAINT CK_Pedido_Total CHECK (Total >= 0),
        CONSTRAINT CK_Pedido_Mesa CHECK (TipoEntrega <> N'Mesa' OR LEN(LTRIM(RTRIM(Mesa))) > 0),
        CONSTRAINT CK_Pedido_Direccion CHECK (TipoEntrega = N'Mesa' OR LEN(LTRIM(RTRIM(DireccionEntrega))) > 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.PedidoDetalle', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PedidoDetalle (
        PedidoDetalleId     bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PedidoDetalle PRIMARY KEY,
        PedidoId            uniqueidentifier NOT NULL,
        ProductoId          int NULL,
        NombreProducto      nvarchar(150) NOT NULL,
        PrecioUnitario      decimal(10,2) NOT NULL,
        Cantidad            int NOT NULL,
        Leche               nvarchar(60) NOT NULL CONSTRAINT DF_Detalle_Leche DEFAULT (N''),
        Endulzante          nvarchar(60) NOT NULL CONSTRAINT DF_Detalle_Endulzante DEFAULT (N''),
        Indicaciones        nvarchar(500) NOT NULL CONSTRAINT DF_Detalle_Indicaciones DEFAULT (N''),
        CONSTRAINT FK_Detalle_Pedido FOREIGN KEY (PedidoId) REFERENCES dbo.Pedido(PedidoId) ON DELETE CASCADE,
        CONSTRAINT FK_Detalle_Producto FOREIGN KEY (ProductoId) REFERENCES dbo.Producto(ProductoId) ON DELETE SET NULL,
        CONSTRAINT CK_Detalle_Precio CHECK (PrecioUnitario >= 0),
        CONSTRAINT CK_Detalle_Cantidad CHECK (Cantidad BETWEEN 1 AND 99)
    );
END;
GO

IF OBJECT_ID(N'dbo.PedidoDetalleAdicional', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PedidoDetalleAdicional (
        PedidoDetalleAdicionalId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_PedidoDetalleAdicional PRIMARY KEY,
        PedidoDetalleId          bigint NOT NULL,
        Nombre                   nvarchar(100) NOT NULL,
        Precio                   decimal(10,2) NOT NULL CONSTRAINT DF_PedidoAdicional_Precio DEFAULT (0),
        CONSTRAINT FK_PedidoAdicional_Detalle FOREIGN KEY (PedidoDetalleId) REFERENCES dbo.PedidoDetalle(PedidoDetalleId) ON DELETE CASCADE,
        CONSTRAINT CK_PedidoAdicional_Precio CHECK (Precio >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Insumo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Insumo (
        InsumoId          nvarchar(50) NOT NULL CONSTRAINT PK_Insumo PRIMARY KEY,
        Nombre            nvarchar(150) NOT NULL,
        Unidad            nvarchar(10) NOT NULL,
        Cantidad          decimal(12,3) NOT NULL CONSTRAINT DF_Insumo_Cantidad DEFAULT (0),
        Minimo            decimal(12,3) NOT NULL CONSTRAINT DF_Insumo_Minimo DEFAULT (0),
        CONSTRAINT UQ_Insumo_Nombre UNIQUE (Nombre),
        CONSTRAINT CK_Insumo_Unidad CHECK (Unidad IN (N'kg', N'g', N'L', N'mL', N'unidad')),
        CONSTRAINT CK_Insumo_Cantidad CHECK (Cantidad >= 0),
        CONSTRAINT CK_Insumo_Minimo CHECK (Minimo >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.Proveedor', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Proveedor (
        ProveedorId       nvarchar(50) NOT NULL CONSTRAINT PK_Proveedor PRIMARY KEY,
        Nombre            nvarchar(160) NOT NULL,
        Correo            nvarchar(254) NOT NULL CONSTRAINT DF_Proveedor_Correo DEFAULT (N''),
        Telefono          nvarchar(30) NOT NULL CONSTRAINT DF_Proveedor_Telefono DEFAULT (N''),
        Activo            bit NOT NULL CONSTRAINT DF_Proveedor_Activo DEFAULT (1),
        CONSTRAINT UQ_Proveedor_Nombre UNIQUE (Nombre)
    );
END;
GO

IF OBJECT_ID(N'dbo.Compra', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Compra (
        CompraId          uniqueidentifier NOT NULL CONSTRAINT DF_Compra_Id DEFAULT NEWSEQUENTIALID(),
        ProveedorId       nvarchar(50) NOT NULL,
        InsumoId          nvarchar(50) NOT NULL,
        Cantidad          decimal(12,3) NOT NULL,
        CostoTotal        decimal(12,2) NOT NULL,
        Fecha              date NOT NULL,
        Recibida           bit NOT NULL CONSTRAINT DF_Compra_Recibida DEFAULT (0),
        FechaRecepcion     datetime2(0) NULL,
        CONSTRAINT PK_Compra PRIMARY KEY (CompraId),
        CONSTRAINT FK_Compra_Proveedor FOREIGN KEY (ProveedorId) REFERENCES dbo.Proveedor(ProveedorId),
        CONSTRAINT FK_Compra_Insumo FOREIGN KEY (InsumoId) REFERENCES dbo.Insumo(InsumoId),
        CONSTRAINT CK_Compra_Cantidad CHECK (Cantidad > 0),
        CONSTRAINT CK_Compra_Costo CHECK (CostoTotal >= 0),
        CONSTRAINT CK_Compra_Recepcion CHECK ((Recibida = 0 AND FechaRecepcion IS NULL) OR (Recibida = 1 AND FechaRecepcion IS NOT NULL))
    );
END;
GO

IF OBJECT_ID(N'dbo.MovimientoStock', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MovimientoStock (
        MovimientoId      bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_MovimientoStock PRIMARY KEY,
        InsumoId          nvarchar(50) NOT NULL,
        CompraId          uniqueidentifier NULL,
        Tipo              nvarchar(20) NOT NULL,
        Cantidad          decimal(12,3) NOT NULL,
        Fecha              datetime2(0) NOT NULL CONSTRAINT DF_Movimiento_Fecha DEFAULT (SYSUTCDATETIME()),
        Observacion        nvarchar(300) NOT NULL CONSTRAINT DF_Movimiento_Observacion DEFAULT (N''),
        UsuarioId          uniqueidentifier NULL,
        CONSTRAINT FK_Movimiento_Insumo FOREIGN KEY (InsumoId) REFERENCES dbo.Insumo(InsumoId),
        CONSTRAINT FK_Movimiento_Compra FOREIGN KEY (CompraId) REFERENCES dbo.Compra(CompraId),
        CONSTRAINT FK_Movimiento_Usuario FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuario(UsuarioId) ON DELETE SET NULL,
        CONSTRAINT CK_Movimiento_Tipo CHECK (Tipo IN (N'Entrada', N'Ajuste', N'Consumo')),
        CONSTRAINT CK_Movimiento_Cantidad CHECK (Cantidad > 0)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Pedido') AND name = N'IX_Pedido_Fecha_Estado')
    CREATE INDEX IX_Pedido_Fecha_Estado ON dbo.Pedido(Fecha DESC, Estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Pedido') AND name = N'IX_Pedido_Usuario_Fecha')
    CREATE INDEX IX_Pedido_Usuario_Fecha ON dbo.Pedido(UsuarioId, Fecha DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Compra') AND name = N'IX_Compra_Proveedor_Fecha')
    CREATE INDEX IX_Compra_Proveedor_Fecha ON dbo.Compra(ProveedorId, Fecha DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.MovimientoStock') AND name = N'IX_MovimientoStock_Insumo_Fecha')
    CREATE INDEX IX_MovimientoStock_Insumo_Fecha ON dbo.MovimientoStock(InsumoId, Fecha DESC);
GO

/* Catálogo inicial tomado de src/app/core/store.ts y menu.json. */
IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE CategoriaId = N'cafes')
    INSERT dbo.Categoria(CategoriaId, Nombre, EsPostre) VALUES (N'cafes', N'Cafés de especialidad', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE CategoriaId = N'postres')
    INSERT dbo.Categoria(CategoriaId, Nombre, EsPostre) VALUES (N'postres', N'Postres y repostería', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE CategoriaId = N'bebidas')
    INSERT dbo.Categoria(CategoriaId, Nombre, EsPostre) VALUES (N'bebidas', N'Bebidas frías', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE CategoriaId = N'combos')
    INSERT dbo.Categoria(CategoriaId, Nombre, EsPostre) VALUES (N'combos', N'Combos', 0);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Producto)
BEGIN
    INSERT dbo.Producto(ProductoId, Nombre, Descripcion, CategoriaId, ImagenUrl, Precio, DescuentoPct, Personalizable)
    VALUES
    (1,N'Café Expreso',N'Extracción pura, intensa y aromática con crema avellanada persistente.',N'cafes',N'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400&q=80',6.00,0,1),
    (2,N'Capuchino Clásico',N'Espresso doble con leche texturizada al vapor y abundante espuma sedosa.',N'cafes',N'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',8.50,0,1),
    (3,N'Café Americano',N'Espresso balanceado con agua caliente a punto, de notas suaves y tostadas.',N'cafes',N'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80',7.00,0,1),
    (4,N'Caramel Macchiato',N'Vainilla suave, leche vaporizada, mancha de espresso y espiral de caramelo.',N'cafes',N'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&q=80',10.50,0,1),
    (5,N'Mocaccino Belga',N'Combinación armoniosa de espresso, ganache de chocolate amargo y leche cremosa.',N'cafes',N'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&q=80',11.00,0,1),
    (6,N'Flat White Artesanal',N'Doble ristretto concentrado cubierto con una fina microespuma aterciopelada.',N'cafes',N'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&q=80',9.50,0,1),
    (7,N'Torta Tres Leches',N'Bizcochuelo artesanal embebido en mezcla de tres leches y canela molida.',N'postres',N'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&q=80',9.00,0,0),
    (8,N'Cheesecake de Oreo',N'Base crocante de galleta, crema horneada de queso y trozos generosos de Oreo.',N'postres',N'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80',12.00,0,0),
    (9,N'Croissant Mantequilla',N'Hojaldrado francés crujiente por fuera, suave y aireado en su interior.',N'postres',N'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',6.50,0,0),
    (10,N'Queque de Plátano & Nueces',N'Porción húmeda y casera aromatizada con canela, nueces tostadas y miel.',N'postres',N'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&q=80',7.50,0,0),
    (11,N'Pie de Limón Clásico',N'Masa sableé crocante, cuajada ácida de limón criollo y merengue tostado.',N'postres',N'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=400&q=80',9.50,0,0),
    (12,N'Brownie con Fudge',N'Bizcocho denso de chocolate al 70% bañado con fudge tibio de la casa.',N'postres',N'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&q=80',8.00,0,0),
    (13,N'Jugo de Naranja Natural',N'Zumo 100% puro de naranjas seleccionadas, recién exprimido al momento.',N'bebidas',N'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80',7.00,0,1),
    (14,N'Iced Matcha Latte',N'Té verde ceremonial japonés batido con leche vegetal sobre cubos de hielo.',N'bebidas',N'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80',12.50,0,1),
    (15,N'Frappé de Moka & Crema',N'Café helado batido con chocolate espeso, coronado con chantilly y virutas.',N'bebidas',N'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80',13.00,0,1),
    (16,N'Cold Brew Especial',N'Café infusionado en frío durante 18 horas; cuerpo sedoso y cero acidez.',N'bebidas',N'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&q=80',10.00,0,1),
    (17,N'Limonada de Hierbabuena',N'Refrescante limonada frappé macerada con hojas frescas de hierbabuena.',N'bebidas',N'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',7.50,0,1),
    (18,N'Iced Caramel Latte',N'Espresso vertido sobre leche fría, hielo compacto y sirope de caramelo salado.',N'bebidas',N'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',11.00,0,1),
    (101,N'Desayunito Favorito',N'Cappuccino cremoso caliente + Croissant artesanal horneado a la mantequilla.',N'combos',N'/combo1.jpg',17.00,26.47,1),
    (102,N'Matcha & Dulce Tarde',N'Matcha Latte ceremonial caliente con arte latte + Generosa porción de queque artesanal del día.',N'combos',N'/combo2.jpg',19.50,28.72,1),
    (103,N'Generosa Porción',N'2 panes artesanales con chicharrón crocante y sarza criolla + 1 jugo natural grande a elección.',N'combos',N'/combo3.jpg',33.00,24.24,0),
    (104,N'Pecado de Chocolate',N'Café bombón multicapa con crema batida y chocolate + Generosa porción de cheesecake de Oreo y manjar.',N'combos',N'/combo4.jpg',28.00,21.79,1),
    (105,N'Club Sándwich Clásico',N'Tradicional sándwich de 3 pisos en pan tostado con pollo, jamón, palta y vegetales + crocantes papas fritas.',N'combos',N'/combo5.jpg',26.00,21.15,0);
END;
GO

/* Adicionales del catálogo actual. Esta carga es idempotente por producto y nombre. */
INSERT dbo.ProductoAdicional(ProductoId, Nombre, Precio)
SELECT p.ProductoId, a.Nombre, a.Precio
FROM (VALUES
 (1,N'Shot extra',2.00),(1,N'Jarabe de vainilla',1.50),(1,N'Canela',0.00),
 (2,N'Shot extra',2.00),(2,N'Jarabe de vainilla',1.50),(2,N'Canela',0.00),
 (3,N'Shot extra',2.00),(3,N'Jarabe de vainilla',1.50),(3,N'Canela',0.00),
 (4,N'Shot extra',2.00),(4,N'Jarabe de vainilla',1.50),(4,N'Canela',0.00),
 (5,N'Shot extra',2.00),(5,N'Jarabe de vainilla',1.50),(5,N'Canela',0.00),
 (6,N'Shot extra',2.00),(6,N'Jarabe de vainilla',1.50),(6,N'Canela',0.00),
 (13,N'Shot extra',2.00),(13,N'Jarabe de vainilla',1.50),(13,N'Canela',0.00),
 (14,N'Shot extra',2.00),(14,N'Jarabe de vainilla',1.50),(14,N'Canela',0.00),
 (15,N'Shot extra',2.00),(15,N'Jarabe de vainilla',1.50),(15,N'Canela',0.00),
 (16,N'Shot extra',2.00),(16,N'Jarabe de vainilla',1.50),(16,N'Canela',0.00),
 (17,N'Shot extra',2.00),(17,N'Jarabe de vainilla',1.50),(17,N'Canela',0.00),
 (18,N'Shot extra',2.00),(18,N'Jarabe de vainilla',1.50),(18,N'Canela',0.00)
) a(ProductoId, Nombre, Precio)
JOIN dbo.Producto p ON p.ProductoId = a.ProductoId
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.ProductoAdicional pa
    WHERE pa.ProductoId = p.ProductoId AND pa.Nombre = a.Nombre
);
GO

/* Insumos de ejemplo que ya existen en el Store frontend. */
IF NOT EXISTS (SELECT 1 FROM dbo.Insumo WHERE InsumoId = N'cafe')
    INSERT dbo.Insumo(InsumoId, Nombre, Unidad, Cantidad, Minimo) VALUES (N'cafe', N'Café en grano', N'kg', 12, 3);
IF NOT EXISTS (SELECT 1 FROM dbo.Insumo WHERE InsumoId = N'leche')
    INSERT dbo.Insumo(InsumoId, Nombre, Unidad, Cantidad, Minimo) VALUES (N'leche', N'Leche entera', N'L', 20, 5);
GO

/* Insumos peruanos adicionales para que las compras de ejemplo tengan referencias reales. */
INSERT dbo.Insumo(InsumoId, Nombre, Unidad, Cantidad, Minimo)
SELECT v.InsumoId, v.Nombre, v.Unidad, v.Cantidad, v.Minimo
FROM (VALUES
 (N'azucar',N'Azúcar rubia',N'kg',0.000,4.000),
 (N'naranja',N'Naranja de mesa',N'kg',0.000,5.000),
 (N'harina',N'Harina pastelera',N'kg',0.000,5.000),
 (N'chocolate',N'Chocolate bitter',N'kg',0.000,2.000),
 (N'avena',N'Leche de avena',N'L',0.000,3.000),
 (N'mantequilla',N'Mantequilla sin sal',N'kg',0.000,2.000),
 (N'huevos',N'Huevos de corral',N'unidad',0.000,30.000),
 (N'vasos',N'Vasos para bebidas frías',N'unidad',0.000,50.000)
) v(InsumoId, Nombre, Unidad, Cantidad, Minimo)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Insumo i WHERE i.InsumoId = v.InsumoId);
GO

/*
  Usuarios ficticios de demostración. Contraseña común de las 9 cuentas:
  CafeDemo2026!  (PBKDF2-HMAC-SHA256, 100 000 iteraciones, sal individual).
  Cambiar credenciales antes de usar estos datos en un ambiente compartido.
*/
INSERT dbo.Usuario(UsuarioId, Nombres, ApellidoPaterno, ApellidoMaterno, Correo, Telefono, Direccion, Rol, NombreUsuario, PasswordHash, PasswordSalt)
SELECT v.UsuarioId, v.Nombres, v.ApellidoPaterno, v.ApellidoMaterno, v.Correo, v.Telefono, v.Direccion, v.Rol, v.NombreUsuario, CONVERT(varbinary(64), v.PasswordHash, 2), CONVERT(varbinary(64), CONVERT(varchar(64), v.PasswordSalt))
FROM (VALUES
 (CONVERT(uniqueidentifier,N'10000000-0000-0000-0000-000000000001'),N'Andrea',N'Rojas',N'Paredes',N'admin@estacioncafe.test',N'+51 999 100 001',N'Lima, Perú',N'Administrador',N'admin.local',N'640B7D5DF40F7950B44A5F80062EA23E7655F4A2AE83F522D793A3718D8AD62B',N'ec-demo-admin-2026'),
 (CONVERT(uniqueidentifier,N'10000000-0000-0000-0000-000000000002'),N'Lucía',N'Quispe',N'Flores',N'lucia.quispe@estacioncafe.test',N'+51 976 220 110',N'Av. La Marina 1240, San Miguel, Lima',N'Logistica',N'logistica.lucia',N'431B8AE2F5A3965CBCA83FB91208C2B7B66CD482208037578442D49DD594BB92',N'ec-demo-logistica-2026'),
 (CONVERT(uniqueidentifier,N'10000000-0000-0000-0000-000000000003'),N'Mateo',N'Vargas',N'Ríos',N'mateo.vargas@estacioncafe.test',N'+51 987 321 220',N'Jr. Tacna 560, Magdalena del Mar, Lima',N'Barista / Cocina',N'barista.mateo',N'65CC3816DD7ABEB5867194F20C9CC382A9DF680D2A070268004DFBFC501F5430',N'ec-demo-barista-2026'),
 (CONVERT(uniqueidentifier,N'10000000-0000-0000-0000-000000000004'),N'Valeria',N'Soto',N'León',N'valeria.soto@estacioncafe.test',N'+51 965 430 330',N'Calle Las Dalias 180, Miraflores, Lima',N'Caja',N'caja.valeria',N'4896027410DC3064AD87DA3CDDA67497AE5949719C563EAF38131AF2F5C7FB3F',N'ec-demo-caja-2026'),
 (CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000001'),N'Camila',N'Torres',N'Vega',N'camila.torres@example.test',N'+51 944 510 101',N'Av. Arequipa 1850, Lince, Lima',N'Cliente',N'cliente01',N'F0A79E15D4C96EBF4F8FA2AAEEC3D5304945008A66C6B063544EB98A3D669888',N'ec-demo-cliente-01-2026'),
 (CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000002'),N'Diego',N'Mendoza',N'Ruiz',N'diego.mendoza@example.test',N'+51 955 620 202',N'Av. Brasil 920, Jesús María, Lima',N'Cliente',N'cliente02',N'A471C8B0DF26363EA1EF10B9D1EE3CA1808C517944FDFF0086A5485AFFADB28A',N'ec-demo-cliente-02-2026'),
 (CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000003'),N'Fernanda',N'Paredes',N'Gómez',N'fernanda.paredes@example.test',N'+51 966 730 303',N'Jr. Colón 245, Barranco, Lima',N'Cliente',N'cliente03',N'38C0C3DEAF03A95ED9AD7E84A356BE39EB6A20252897CFFB46D7E78CDB159CB1',N'ec-demo-cliente-03-2026'),
 (CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000004'),N'José',N'Navarro',N'Castro',N'jose.navarro@example.test',N'+51 977 840 404',N'Calle Los Cedros 320, Surco, Lima',N'Cliente',N'cliente04',N'C380D82519F4AF54B82E74D646B68A7AEA7B9AAEDC90047829FC7F1738021F67',N'ec-demo-cliente-04-2026'),
 (CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000005'),N'Rosa',N'Huamán',N'Chávez',N'rosa.huaman@example.test',N'+51 988 950 505',N'Av. La Paz 780, Miraflores, Lima',N'Cliente',N'cliente05',N'F57ED38CA21D3624C37466872F69E5798188BCFF6C1D3170CE52DC9507BE3F8B',N'ec-demo-cliente-05-2026')
) v(UsuarioId, Nombres, ApellidoPaterno, ApellidoMaterno, Correo, Telefono, Direccion, Rol, NombreUsuario, PasswordHash, PasswordSalt)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Usuario u WHERE u.UsuarioId = v.UsuarioId OR u.Correo = v.Correo);
GO

/* Proveedores ficticios peruanos: café de Jaén, lácteos de Lima, abarrotes y fruta local. */
INSERT dbo.Proveedor(ProveedorId, Nombre, Correo, Telefono)
SELECT v.ProveedorId, v.Nombre, v.Correo, v.Telefono
FROM (VALUES
 (N'prov-cafe-jaen',N'Cooperativa Cafetalera Valle Verde S.A.C. — Jaén, Cajamarca',N'ventas@valleverde.example.test',N'+51 976 410 001'),
 (N'prov-lacteos-lima',N'Lácteos La Campiña S.A.C. — Lima',N'pedidos@lacampina.example.test',N'+51 944 520 002'),
 (N'prov-abarrotes',N'Abastecimientos Santa Anita E.I.R.L. — Lima',N'comercial@santa-anita.example.test',N'+51 955 630 003'),
 (N'prov-frutas',N'Frutos del Valle Mercado Mayorista — Lima',N'ventas@frutosdelvalle.example.test',N'+51 966 740 004')
) v(ProveedorId, Nombre, Correo, Telefono)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Proveedor p WHERE p.ProveedorId = v.ProveedorId OR p.Nombre = v.Nombre);
GO

/* Compras de ejemplo: entradas recibidas actualizan existencias y dejan movimiento de auditoría. */
DECLARE @ComprasNuevas TABLE (CompraId uniqueidentifier, InsumoId nvarchar(50), Cantidad decimal(12,3), Recibida bit, FechaRecepcion datetime2(0));
INSERT dbo.Compra(CompraId, ProveedorId, InsumoId, Cantidad, CostoTotal, Fecha, Recibida, FechaRecepcion)
OUTPUT inserted.CompraId, inserted.InsumoId, inserted.Cantidad, inserted.Recibida, inserted.FechaRecepcion
INTO @ComprasNuevas(CompraId, InsumoId, Cantidad, Recibida, FechaRecepcion)
SELECT v.CompraId, v.ProveedorId, v.InsumoId, v.Cantidad, v.CostoTotal, v.Fecha, v.Recibida, v.FechaRecepcion
FROM (VALUES
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000001'),N'prov-cafe-jaen',N'cafe',5.000,235.00,CONVERT(date,'2026-10-08'),CONVERT(bit,1),CONVERT(datetime2(0),'2026-10-08T09:30:00')),
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000002'),N'prov-lacteos-lima',N'leche',24.000,132.00,CONVERT(date,'2026-10-09'),CONVERT(bit,1),CONVERT(datetime2(0),'2026-10-09T08:45:00')),
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000003'),N'prov-abarrotes',N'azucar',20.000,116.00,CONVERT(date,'2026-10-09'),CONVERT(bit,1),CONVERT(datetime2(0),'2026-10-09T11:10:00')),
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000004'),N'prov-frutas',N'naranja',18.000,81.00,CONVERT(date,'2026-10-10'),CONVERT(bit,1),CONVERT(datetime2(0),'2026-10-10T07:50:00')),
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000005'),N'prov-abarrotes',N'chocolate',8.000,248.00,CONVERT(date,'2026-10-12'),CONVERT(bit,0),CONVERT(datetime2(0),NULL)),
 (CONVERT(uniqueidentifier,N'40000000-0000-0000-0000-000000000006'),N'prov-abarrotes',N'harina',25.000,112.50,CONVERT(date,'2026-10-12'),CONVERT(bit,0),CONVERT(datetime2(0),NULL))
) v(CompraId, ProveedorId, InsumoId, Cantidad, CostoTotal, Fecha, Recibida, FechaRecepcion)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Compra c WHERE c.CompraId = v.CompraId);

UPDATE i SET Cantidad = i.Cantidad + c.Cantidad
FROM dbo.Insumo i JOIN @ComprasNuevas c ON c.InsumoId = i.InsumoId
WHERE c.Recibida = 1;

INSERT dbo.MovimientoStock(InsumoId, CompraId, Tipo, Cantidad, Fecha, Observacion)
SELECT c.InsumoId, c.CompraId, N'Entrada', c.Cantidad, c.FechaRecepcion, N'Recepción de compra de demostración'
FROM @ComprasNuevas c
WHERE c.Recibida = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.MovimientoStock m WHERE m.CompraId = c.CompraId AND m.Tipo = N'Entrada');
GO

/* Cinco clientes con pedidos distribuidos en todos los estados operativos del sistema. */
INSERT dbo.Pedido(PedidoId, UsuarioId, Fecha, NombreContacto, CorreoContacto, TelefonoContacto, DireccionEntrega, Mesa, TipoEntrega, MetodoPago, Estado, Pagado, Total)
SELECT v.PedidoId, v.UsuarioId, v.Fecha, v.NombreContacto, v.CorreoContacto, v.TelefonoContacto, v.DireccionEntrega, v.Mesa, v.TipoEntrega, v.MetodoPago, v.Estado, v.Pagado, v.Total
FROM (VALUES
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000001'),CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000001'),CONVERT(datetime2(0),'2026-10-12T09:15:00'),N'Camila Torres Vega',N'camila.torres@example.test',N'+51 944 510 101',N'',N'4',N'Mesa',N'Efectivo',N'Pendiente',CONVERT(bit,0),CONVERT(decimal(12,2),12.00)),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000002'),CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000002'),CONVERT(datetime2(0),'2026-10-12T09:35:00'),N'Diego Mendoza Ruiz',N'diego.mendoza@example.test',N'+51 955 620 202',N'Av. Brasil 920, Jesús María, Lima',N'',N'Delivery',N'Billetera',N'En preparación',CONVERT(bit,0),CONVERT(decimal(12,2),21.00)),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000003'),CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000003'),CONVERT(datetime2(0),'2026-10-12T10:05:00'),N'Fernanda Paredes Gómez',N'fernanda.paredes@example.test',N'+51 966 730 303',N'Jr. Colón 245, Barranco, Lima',N'',N'Recojo',N'Tarjeta',N'Listo',CONVERT(bit,0),CONVERT(decimal(12,2),19.50)),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000004'),CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000004'),CONVERT(datetime2(0),'2026-10-11T16:20:00'),N'José Navarro Castro',N'jose.navarro@example.test',N'+51 977 840 404',N'',N'2',N'Mesa',N'Efectivo',N'Finalizado',CONVERT(bit,1),CONVERT(decimal(12,2),13.00)),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000005'),CONVERT(uniqueidentifier,N'20000000-0000-0000-0000-000000000005'),CONVERT(datetime2(0),'2026-10-11T17:10:00'),N'Rosa Huamán Chávez',N'rosa.huaman@example.test',N'+51 988 950 505',N'',N'6',N'Mesa',N'Tarjeta',N'Cancelado',CONVERT(bit,0),CONVERT(decimal(12,2),8.00))
) v(PedidoId, UsuarioId, Fecha, NombreContacto, CorreoContacto, TelefonoContacto, DireccionEntrega, Mesa, TipoEntrega, MetodoPago, Estado, Pagado, Total)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Pedido p WHERE p.PedidoId = v.PedidoId);

INSERT dbo.PedidoDetalle(PedidoId, ProductoId, NombreProducto, PrecioUnitario, Cantidad, Leche, Endulzante, Indicaciones)
SELECT v.PedidoId, p.ProductoId, p.Nombre, ROUND(p.Precio * (1 - p.DescuentoPct / 100.0), 2), v.Cantidad, v.Leche, v.Endulzante, v.Indicaciones
FROM (VALUES
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000001'),1,2,N'Entera',N'Sin endulzante',N''),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000002'),14,1,N'Avena',N'Stevia',N'Poca espuma'),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000002'),2,1,N'Entera',N'Sin endulzante',N''),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000003'),16,1,N'',N'',N''),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000003'),11,1,N'',N'',N''),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000004'),9,2,N'',N'',N'Calentar ligeramente'),
 (CONVERT(uniqueidentifier,N'30000000-0000-0000-0000-000000000005'),12,1,N'',N'',N'')
) v(PedidoId, ProductoId, Cantidad, Leche, Endulzante, Indicaciones)
JOIN dbo.Producto p ON p.ProductoId = v.ProductoId
WHERE EXISTS (SELECT 1 FROM dbo.Pedido o WHERE o.PedidoId = v.PedidoId)
  AND NOT EXISTS (SELECT 1 FROM dbo.PedidoDetalle d WHERE d.PedidoId = v.PedidoId);
GO

/* Notas de implementación:
   - Los permisos por rol se validan en la API, además de ocultar rutas en Angular.
   - Recepcionar Compra debe ocurrir en una transacción: bloquear/actualizar Compra una sola vez,
     sumar Insumo.Cantidad y crear MovimientoStock; así se evita doble recepción concurrente.
   - El descuento automático de inventario por receta no se incluye: no hay recetas/rendimientos.
   - El frontend no procesa pagos reales; Pagado sirve como confirmación operativa del efectivo.
*/
