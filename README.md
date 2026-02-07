# Control Stock - Frontend (Mock)



```bash
cd web
npm install
npm run dev
```

- La app carga productos desde `src/mocks/api.js` y simula una venta con validación de pagos.
- Para conectar al backend real, reemplazar las funciones en `src/mocks/api.js` por llamadas `fetch('/api/...')` o generar un cliente OpenAPI a partir de `src/swagger.js` del backend.

Proxy de desarrollo (con el backend en `http://localhost:3000`):

1. Habilita el proxy en desarrollo creando `.env.development` en `web/` con:

```text
VITE_API_PROXY=true
```

2. Inicia el servidor de la API (`node server.js` o `npm start` en la raíz) y luego el frontend:

```bash
cd web
npm run dev
```

Las llamadas desde el frontend a rutas que empiecen con `/api` serán reenviadas a `http://localhost:3000/api` por Vite.

Login mock (actualizar esta seccion a lo real hoy):
- En modo mock puedes usar cualquier `usuario`/contraseña; el sistema devolverá un token `mock-token`.
- El campo de login ahora es `usuario` (nombre de usuario) — si usas proxy asegúrate de enviar el mismo `nombre` que figura en la tabla `usuarios.nombre` del backend.
- El frontend guarda el token en `localStorage.token` y lo añade en `Authorization: Bearer <token>` cuando `VITE_API_PROXY=true`.

Valida como se estan ejecutando estos pasos, en caso de ya no usar mock, elimiar esta seccion y actualizar con lo real: 
- Añadir autenticación (login) y consumir el token JWT.
- Reemplazar mock con cliente OpenAPI o proxy al backend para entornos de desarrollo.
- Implementar impresión (ESC-POS) en `desktop/` si hace falta.
