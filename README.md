
# Live Code Editor Secure

Este proyecto es un **editor de código colaborativo en tiempo real** con autenticación de usuarios y control de roles (admin, dev, observer). Permite la creación de salas (rooms) independientes para grupos de usuarios, donde cada grupo puede editar y ejecutar código de manera aislada.

## Características principales

- **Autenticación JWT**: Login seguro con roles diferenciados.
- **Roles**:
  - **Admin**: Puede crear salas, bloquear/desbloquear edición, ejecutar código y registrar nuevos usuarios.
  - **Dev**: Puede editar y ejecutar código en la sala asignada.
  - **Observer**: Solo puede visualizar el código y la salida.
- **Salas independientes**: Cada grupo (admin+dev+observer) tiene su propia sala aislada, identificada por un `roomId`.
- **WebSocket**: Sincronización en tiempo real del código y los eventos de edición.
- **Persistencia de usuarios**: Usuarios y roles almacenados en un archivo JSON usando lowdb.
- **CORS seguro**: Permite peticiones cross-domain solo desde orígenes permitidos.
- **Ping/Pong automático**: Mantiene viva la conexión WebSocket en producción.

## Requisitos

- Node.js 18+
- npm

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/andrescastell19/code-board.git
   cd code-board
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto y define tu clave secreta:
   ```
   SECRET=clave_super_secreta
   PORT=3002
   ```

4. Inicia el servidor:
   ```bash
   npm run dev
   ```
   o en producción:
   ```bash
   npm start
   ```

## Uso

- El backend corre por defecto en `http://localhost:3002`.
- El frontend **NO está incluido en este repositorio**.  
  El frontend React está disponible en:  
  👉 [https://github.com/andrescastell19/coder-live](https://github.com/andrescastell19/coder-live)

- Para desarrollo local, asegúrate de que ambos (backend y frontend) estén corriendo y que el frontend use el endpoint correcto del backend.

## Endpoints principales

- `POST /login` — Login de usuario, retorna cookie JWT y el rol.
- `POST /register` — Registrar nuevo usuario (solo admin).
- `POST /create-room` — Crear una nueva sala (solo admin).
- `GET /room-exists?roomId=...` — Verifica si una sala existe.
- WebSocket:  
  Conéctate a `ws://localhost:3002/ws?token=...&roomId=...`  
  (o `wss://...` en producción).

## Notas importantes

- **Solo el admin puede crear una sala**. Dev y observer solo pueden unirse a una sala existente.
- Si la conexión WebSocket se cierra por inactividad, el frontend envía automáticamente mensajes de "ping" para mantenerla viva.
- El backend solo mantiene las salas en memoria. Si reinicias el servidor, las salas activas se pierden y deben ser recreadas por el admin.
- El backend permite CORS solo desde orígenes configurados en `allowCors.js`.

## Seguridad

- El token JWT expira en 1 hora.
- Las cookies de autenticación se envían con los flags `SameSite=None` y `Secure` para permitir autenticación cross-domain en HTTPS.
- No expongas tu archivo `.env` ni la clave secreta en producción.

## Créditos

- Editor basado en [Monaco Editor](https://microsoft.github.io/monaco-editor/).
- Sincronización en tiempo real con [ws](https://github.com/websockets/ws).
- Persistencia ligera con [lowdb](https://github.com/typicode/lowdb).

---

**Frontend oficial:**  
[https://github.com/andrescastell19/coder-live](https://github.com/andrescastell19/coder-live)

---