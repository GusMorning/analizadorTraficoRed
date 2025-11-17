# Network Lab Dashboard

Suite full-stack pensada para el curso **Laboratorio de Redes de Computadores I**. Permite ejecutar pruebas LAN y remotas, enviar paquetes UDP/TCP, recibir los resultados en tiempo real, almacenar el historial en SQLite y visualizar todo en un dashboard moderno con métricas, mapa y herramientas de análisis (Speedtest, escaneo de red y de puertos).

## Estructura del repositorio

`
proyecto_final_labo_redes/
├─ backend/    # Express + Socket.IO + SQLite + servicios de métricas
├─ frontend/   # React + Vite + Tailwind + Recharts + Leaflet
├─ agent/      # Script Node para actuar como eco UDP/TCP remoto
├─ package.json
└─ README.md
`

## Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- (Opcional) Speedtest CLI, Fing/Nmap y Wireshark

## Instalación rápida

`ash
npm install --prefix backend
npm install --prefix frontend
npm install --prefix agent
`

> Si ya existía ackend/network-lab.db, bórralo para que se creen las columnas nuevas (coordenadas, Speedtest, etc.).

## Scripts útiles

| Script | Descripción |
| --- | --- |
| 
pm run dev:server --prefix backend | Levanta el backend con hot-reload (tsx). |
| 
pm run dev --prefix frontend | Levanta el frontend en http://localhost:5173. |
| 
pm run dev:agent --prefix agent | Inicia el agente remoto (eco UDP/TCP). |
| 
pm run build --prefix frontend | Compila el frontend para producción. |
| 
pm run build (raíz) | Ejecuta los builds de backend/ frontend/ agente. |

## Backend (Express + Socket.IO + SQLite)

- API REST /api/tests para crear pruebas, listar historial y obtener detalle.
- WebSocket /ws para progreso en vivo (	est-progress, 	est-complete, 	est-error, 	est-log).
- Base SQLite con metadatos completos: modo, protocolo, proveedor, intensidad, banda, distancia, plan, notas, Speedtest y coordenadas.
- Servicios adicionales:
  - /scan → usa Fing CLI (si FING_BIN está definido) o Nmap -sn como fallback para descubrir hosts.
  - /port-scan → escaneo estilo PortDroid (Nmap -sT -p rango).
  - /speedtest → ejecuta Speedtest CLI (define SPEEDTEST_BIN si no está en el PATH).
- Puertos para pruebas y Wireshark: UDP 40000, TCP 5050. Filtra con udp.port == 40000 o 	cp.port == 5050.

## Frontend (React + Tailwind + Recharts + Leaflet)

- **Dashboard**: tarjetas KPI, gráficas de líneas/barras, comparativos LAN vs Remoto, alertas, actividad en vivo y mapa interactivo (Leaflet) con las pruebas geolocalizadas. Incluye botón para abrir una URL de CellMapper configurada en Ajustes.
- **Nueva Prueba**: wizard de 4 pasos donde:
  - Seleccionas modo LAN/Remoto con tarjetas interactivas.
  - Ajustas transporte (UDP/TCP, tamaño, intervalo, cantidad).
  - Capturas metadatos para el informe (ISP, red, intensidad, distancia, plan, notas y ahora latitud/longitud).
  - Ejecutas herramientas: escáner de red (Fing/Nmap), escáner de puertos (Nmap tipo PortDroid) y Speedtest CLI. Se muestra un resumen listo para Wireshark.
- **Historial**: tabla filtrable con botón “Ver detalle” para exportar CSV/JSON y revisar KPIs específicos.
- **Configuración**: guarda API base, WS URL/path y la URL de CellMapper (persistida en localStorage para trabajar con túneles).
- **Ayuda**: texto con instrucciones, recordatorios y filtros sugeridos.

## Agente remoto

- Script TypeScript (gent/src/agent.ts) que abre sockets UDP/TCP en 40000/5050 para hacer eco de los paquetes enviados.
- Ideal para pruebas remotas, Tailscale o máquinas fuera de la LAN.
- Configurable vía variables de entorno si necesitas fijar interfaz/host.

## Flujo recomendado

1. Levanta backend y frontend (
pm run dev:server --prefix backend, 
pm run dev --prefix frontend).
2. (Opcional) Ejecuta el agente en la otra máquina (
pm run dev:agent --prefix agent).
3. Configura los endpoints correctos en **Configuración** (útil si usas túneles o dominios públicos).
4. En **Nueva Prueba** completa los datos, ejecuta escaneos/Speedtest y crea la prueba.
5. Sigue el progreso en tiempo real y consulta el dashboard/historial para analizar resultados.
6. Exporta CSV/JSON y toma capturas del dashboard/mapa/Wireshark para tu informe.

## Integraciones

### Speedtest CLI
1. Instala la CLI oficial (<https://www.speedtest.net/apps/cli>).
2. Corre speedtest --accept-license --accept-gdpr en el backend.
3. Asegura que el comando speedtest esté disponible o define SPEEDTEST_BIN.
4. En Nueva Prueba pulsa “Ejecutar Speedtest”: los datos se guardan junto a la prueba y se muestran en el dashboard.

### Fing / Nmap
- Define FING_BIN con la ruta a Fing CLI para usar el escáner automático; si no está presente, se usa Nmap automáticamente.
- En **Herramientas** → “Escáner LAN/Remoto” puedes digitar un rango CIDR (LAN o túnel) y autocompletar el host destino.

### PortDroid (escaneo de puertos)
- Desde la misma sección introduce el rango deseado (1-1024, 22,80,443, etc.) y pulsa “Escanear puertos”. Los hallazgos se muestran con colores e información de servicio.

### Mapa tipo CellMapper
- El dashboard dibuja las pruebas en un mapa Leaflet usando las coordenadas guardadas.
- En **Configuración** puedes definir la URL oficial de CellMapper para abrirla en otra pestaña desde el dashboard.

## Buenas prácticas para el informe

- Usa Wireshark con los filtros mencionados para capturar evidencia (LAN, Tailscale, Internet).
- Completa todos los metadatos (ISP, ubicación exacta, plan, hardware, notas) para tener trazabilidad en el historial.
- Adjunta capturas del dashboard, del mapa y de Speedtest, y exporta CSV/JSON para tablas.

## Publicar en GitHub

1. Inicializa el repositorio (si aún no existe):
   `ash
   git init
   git add .
   git commit -m "feat: primera versión del Network Lab Dashboard"
   `
2. Crea el repo remoto (ej. https://github.com/usuario/network-lab-dashboard) y enlázalo:
   `ash
   git branch -M main
   git remote add origin https://github.com/usuario/network-lab-dashboard.git
   git push -u origin main
   `
3. Para futuros cambios:
   `ash
   git add .
   git commit -m "breve descripción"
   git push
   `

¡Listo! Con esta suite tienes pruebas LAN vs Internet (inclusive usando Tailscale), Speedtest integrado, escaneo de hosts/puertos y un mapa georreferenciado para documentar el laboratorio completo.
