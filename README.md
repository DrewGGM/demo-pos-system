# Restaurant POS - Demo

> **Esta es una versión demo.** Las versiones completas de las aplicaciones móviles (Android/iOS) y la aplicación de escritorio con Wails están disponibles en los [Releases](../../releases).

Demo standalone del sistema POS que corre completamente en el navegador usando localStorage. No requiere backend, base de datos ni servidor.

## Funcionalidades

Todo el flujo principal del POS funciona localmente:
- **Login** — admin/admin o PIN 12345
- **POS** — Punto de venta completo con selección de productos, modificadores, carrito, pagos
- **Pedidos** — Crear, ver y gestionar pedidos
- **Productos** — CRUD de productos, categorías, modificadores
- **Mesas** — Gestión y asignación de mesas
- **Dashboard** — Estadísticas calculadas desde las ventas locales
- **Ventas** — Historial de ventas con detalle de pagos
- **Caja** — Apertura/cierre de caja, movimientos
- **Combos** — Gestión de combos

## Limitaciones de la Demo

Las siguientes funcionalidades requieren la versión completa:
- **Facturación Electrónica DIAN** — Requiere la app de escritorio con backend
- **Impresión Térmica** — Requiere la app de escritorio con acceso a hardware
- **Integraciones Externas** — Bold (datáfonos), Rappi, Google Sheets, MCP (IA)
- **Red y Túneles** — Configuración de puertos, WebSocket, Cloudflare Tunnel
- **Base de Datos DIAN** — Conexión MySQL para datos paramétricos

## Facturación Electrónica

Para acceder al módulo completo de facturación electrónica DIAN y todas las integraciones, contacta a:

📧 **contact@lyroo.com.co**

## Datos Demo

Pre-cargados con datos de restaurante colombiano:
- 16 productos (Bandeja Paisa, Lomo, Hamburguesa, etc.)
- 5 categorías (Entradas, Platos Principales, Bebidas, Postres, Adicionales)
- 3 grupos de modificadores (Término de Carne, Adiciones, Tamaño Bebida)
- 6 mesas, 5 métodos de pago, 2 empleados

Todos los datos se guardan en localStorage. Para resetear: limpia el storage del navegador o elimina las keys que empiecen con `pos_demo_`.

## Ejecutar

```bash
cd demo-frontend
npm install
npm run dev    # http://localhost:3100
```

## Build

```bash
npm run build  # Output en dist/ — despliega como archivos estáticos donde quieras
```

## Cómo Funciona

Todos los servicios IPC de Wails están reemplazados con mocks respaldados por localStorage en `src/services/`. Los componentes UI, páginas, estilos y lógica de negocio son idénticos a la app principal.

## Versión Completa

Las versiones completas están disponibles en los **[Releases](../../releases)**:
- **App de Escritorio** (Windows) — Aplicación Wails con backend completo
- **App Móvil Cocina** (Android) — Display de cocina en tiempo real
- **App Móvil Meseros** (Android) — Toma de pedidos desde la mesa
