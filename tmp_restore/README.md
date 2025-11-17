# Network Lab Dashboard

Aplicación full-stack pensada para el curso **Laboratorio de Redes de Computadores I**. Permite crear pruebas de tráfico (LAN vs remotas), obtener métricas (RTT, throughput, pérdida), mostrar un dashboard moderno y guardar el historial en SQLite. Incluye un agente remoto para ejecutar ecos UDP/TCP y facilitar comparaciones entre redes.

## Estructura del proyecto

```
proyecto_final_labo_redes/
├── backend/        # Express + Socket.IO + SQLite + lógica de pruebas
├── frontend/       # React + Vite + Tailwind + Recharts (SPA tipo admin)
├── agent/          # Script Node que actúa como eco UDP/TCP remoto
├── package.json    # Scripts orquestadores para todo el monorepo
└── README.md
```

## Requisitos previos

- Node.js 18+
- npm 9+
- (Opcional) Wireshark para la captura de tráfico

## Instalación de dependencias

```bash
npm install --prefix backend
npm install --prefix frontend
npm install --prefix agent
```

## Scripts principales

- `npm run dev:server` – levanta el backend (Express + Socket.IO) con TypeScript.
- `npm run dev` – levanta el frontend (Vite) en `http://localhost:5173`.
- `npm run dev:agent` – inicia el agente remoto (eco UDP/TCP).
- `npm run build` – compila backend, frontend y agente.

> También puedes ejecutar esos scripts desde cada carpeta si lo prefieres.

## Backend (carpeta `backend/`)

- Express expone `/api/tests` para crear y consultar pruebas.
- Socket.IO (`/ws`) publica eventos `test-progress`, `test-complete`, `test-error` y `test-log`.
- SQLite (`network-lab.db`) guarda pruebas y resultados por paquete.
- Lógica de métricas:
  - Calcula RTT por paquete, jitter, throughput (Mbps) y pérdida total.
  - Cada prueba genera paquetes con timestamps y los envía a través de UDP 40000 o TCP 5050 (ideal para filtrar en Wireshark).
  - Resultados parciales se transmiten en vivo via WebSocket.

### Ejecutar backend

```bash
cd backend
npm install
npm run dev:server
```

## Frontend (carpeta `frontend/`)

- React + Vite + TailwindCSS.
- SPA con secciones: Dashboard, Nueva Prueba, Historial, Configuración, Ayuda.
- Recharts muestra comparativas LAN vs remotas y RTT por paquete.
- Usa Socket.IO cliente para ver progreso de pruebas en tiempo real.

### Ejecutar frontend

```bash
cd frontend
npm install
npm run dev
```

Configura la URL del backend desde la sección **Configuración** del panel si no usas los valores por defecto (`http://localhost:4000`).

## Agente remoto (carpeta `agent/`)

- Escucha y responde paquetes UDP (`40000`) y TCP (`5050`).
- Opcionalmente se conecta al servidor maestro (`SERVER_URL`) para reportar disponibilidad.
- Ideal para que un compañero ejecute el eco desde otra red doméstica.

### Ejecutar agente

```bash
cd agent
npm install
npm run dev:agent
```

Variables útiles:

```
UDP_PORT=40000
TCP_PORT=5050
SERVER_URL=http://IP_DEL_BACKEND:4000
WS_PATH=/ws
```

## Ejemplo rápido de prueba

1. Levanta backend y frontend localmente.
2. En la página **Nueva Prueba**, completa:
   - Modo: `LAN`
   - Host: `127.0.0.1`
   - Puerto: `40000`
   - Paquetes: `20`
   - Intervalo: `250 ms`
3. Presiona **Iniciar prueba**. Observa el progreso en vivo y luego revisa el Dashboard.
4. Cambia el host por la IP pública de tu compañero (con el agente activo) para la prueba remota.

## Filtros sugeridos para Wireshark

- UDP: `udp.port == 40000`
- TCP: `tcp.port == 5050`
- LAN específica: `ip.src == 192.168.1.20 && udp.port == 40000`
- Remota específica: `ip.addr == <IP_DEL_AGENT> && tcp.port == 5050`

Incluye capturas de estos filtros en tu informe: muestran claramente los paquetes de laboratorio y permiten comparar RTT.

## Notas para el informe académico

- Documenta el entorno (ISP, ubicación, hardware) usando los metadatos que guarda la app.
- Exporta los resultados de cada prueba desde el módulo de Historial (CSV/JSON).
- Usa el Dashboard para obtener KPIs (latencia promedio, throughput, jitter, pérdida) de cada escenario.

¡Listo! Con este proyecto los tres integrantes pueden realizar pruebas coordinadas desde casa y preparar evidencia sólida para el curso.
