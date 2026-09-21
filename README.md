# Estación Café ☕

Este proyecto es un sistema web desarrollado en **Angular** (versión standalone) para la gestión de una cafetería, abarcando tanto la experiencia de pedidos de los clientes como el módulo de control y operaciones para el personal autorizado.

---

## 🚀 Módulos del Sistema

El proyecto se divide principalmente en dos vistas clave estructuradas mediante componentes standalone:

1. **Módulo de Pedidos (`/pedidos`)**:
   - Interfaz orientada al cliente para la personalización de bebidas (tipo de leche, nivel de endulzante, adicionales de barista e indicaciones especiales).
   - Selección de modalidad de atención (salón, para llevar o delivery) y pasarela de pago digital previa (Yape, Plin, tarjeta o efectivo en barra).

2. **Módulo de Inicio de Sesión (`/login`)**:
   - Portal de acceso exclusivo para el personal (Barista/Cocina y Administrador).
   - Diseñado para proteger el módulo operativo y de control de stock frente a modificaciones de usuarios externos.

---

## 🛠️ Requisitos del Sistema

- **Node.js**: Versión v22.14.0 o superior recomendada.
- **Angular CLI**: Versión 22.1.8.

---

## ⚙️ Configuración y Ejecución Local

Para poner en marcha el servidor de desarrollo en tu equipo local, sigue estos pasos:

1. **Instalar las dependencias** del proyecto:
   ```bash
   npm install