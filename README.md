# 🌐 Network Lab - Laboratorio de Redes de Computadoras
<div align="center">

![Network Lab](https://img.shields.io/badge/Network-Lab-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

**Una suite completa para analizar y medir el rendimiento de redes**  
_Proyecto final de Lab. de Redes_

[🚀 Inicio Rápido](#-instalación-rápida) • [📖 Documentación](#-cómo-funciona) • [🎯 Características](#-características-principales)

</div>

---

## 📋 Tabla de Contenidos

- [¿Qué es esto?](#-qué-es-esto)
- [¿Para qué sirve?](#-para-qué-sirve)
- [Características Principales](#-características-principales)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación Rápida](#-instalación-rápida)
- [Cómo Usar la Aplicación](#-cómo-usar-la-aplicación)
- [Cómo Funciona](#-cómo-funciona)
- [Guía Paso a Paso](#-guía-paso-a-paso)
- [Capturar Tráfico con Wireshark](#-capturar-tráfico-con-wireshark)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Troubleshooting](#-problemas-comunes)


---

## 🤔 ¿Qué es esto?

**Network Lab** es una aplicación web completa que te permite hacer pruebas de red y medir qué tan rápida y confiable es tu conexión. Es como un "speedtest" pero mucho más completo - puedes medir latencia, jitter, pérdida de paquetes, y ver todo en gráficas bonitas.

Lo mejor es que puedes comparar diferentes tipos de conexión:
- 📡 **WiFi vs Ethernet**
- 🏠 **Red local (LAN) vs Internet**
- 📱 **4G vs 5G**
- 🌍 **Conexiones remotas con VPN (Tailscale)**

---

## 🎯 ¿Para qué sirve?

Esta herramienta es perfecta para comparar redes, entender cómo funcionan y documentar los resultados con ayuda de Wireshark
---

## ⭐ Características Principales

### 🎨 Dashboard Moderno
- Gráficas interactivas que muestran latencia, jitter y pérdida de paquetes
- Comparativas LAN vs Internet en tiempo real
- Mapa interactivo con geolocalización de tus pruebas
- Tarjetas con estadísticas clave (KPIs)

### 🧪 Pruebas Personalizables
- **Protocolo**: Elige entre UDP (rápido) o TCP (confiable)
- **Configuración flexible**: Tamaño de paquetes, cantidad, intervalo
- **Contexto completo**: Guarda tipo de red, proveedor, ubicación, etc.
- **Progreso en vivo**: Ve los resultados mientras la prueba corre

### 🛠️ Herramientas Integradas
- **Speedtest**: Mide tu velocidad de internet (download/upload/ping)
- **Fing**: Descubre dispositivos conectados a tu red
- **Port-Droid**: Ve qué puertos tiene abiertos un dispositivo
- **Cellmapper**: Marca dónde hiciste cada prueba en un mapa y comparara con las estaciones móviles cercanass

### 💾 Historial Completo
- Todas las pruebas se guardan en una base de datos SQLite
- Filtra y busca pruebas anteriores
- Exporta resultados a CSV o JSON
- Compara diferentes pruebas entre sí

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    🖥️ FRONTEND (React)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ Dashboard  │  │ New Test   │  │  History   │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│         │                │                │                 │ 
│         └────────────────┴────────────────┘                 │ 
│                        │                                    │
│                   HTTP REST API                             │
│                   WebSocket (live)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                  🔧 BACKEND (Node.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   API    │  │ WebSocket│  │ Database │  │ Services │      │
│  │ Express  │  │Socket.IO │  │  SQLite  │  │ Testing  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                        │                                     │
│              Manda paquetes UDP/TCP                          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  🎯 AGENTE REMOTO             │
        │                               │
        │  • Escucha en puertos UDP/TCP │
        │  • Hace "eco" de paquetes     │
        │  • Mide RTT (ida y vuelta)    │
        └───────────────────────────────┘
```

### 📦 Componentes

1. **Frontend (React + Vite)**
   - Interfaz visual donde interactúas con la aplicación
   - Gráficas, mapas, formularios, tablas
   - Se conecta al backend via HTTP y WebSocket

2. **Backend (Express + Socket.IO)**
   - Guarda todo en una base de datos SQLite
   - Manda paquetes y calcula estadísticas

3. **Agente Remoto**
   - Un mini-servidor que instalas en otra computadora
   - Recibe paquetes y los devuelve (hace "eco")
   - Necesario solo para pruebas remotas

---

## 📦 Requisitos Previos

### Obligatorios
- **Node.js** v18 o superior → [Descargar aquí](https://nodejs.org/)
- **npm** v9 o superior (viene con Node.js)

### Adicionalesz
- **Speedtest CLI** → Para medir velocidad de internet  
  [Descargar aquí](https://www.speedtest.net/apps/cli)
  
- **Wireshark** → Para capturar y analizar paquetes  
  [Descargar aquí](https://www.wireshark.org/download.html)
  
- **Nmap** → Para escanear red y puertos  
  Windows: [Descargar aquí](https://nmap.org/download.html)  
  Linux: `sudo apt install nmap`
  
- **Fing** (opcional, alternativa a Nmap)  
  [Más info aquí](https://www.fing.com/products/development-toolkit)

---

## 🚀 Instalación Rápida

### 1. Clona o descarga el proyecto

```bash
git clone https://github.com/GusMorning/analizadorTraficoRed.git
cd analizadorTraficoRed
```

### 2. Instala las dependencias

Tienes dos opciones:

**Opción A** 
```bash
npm install
```

**Opcion B**
```bash
npm install --prefix backend
npm install --prefix frontend
npm install --prefix agent
```

### 3. Ejecutar

```bash
# Terminal 1: Backend
npm run dev:server --prefix backend

# Terminal 2: Frontend  
npm run dev --prefix frontend

# Terminal 3 (Importante): Agente remoto
npm run dev:agent --prefix agent
```

### 4. Abre tu navegador

Ve a **http://localhost:5173** y ya estaría 

---

## 📱 Cómo Usar la Aplicación

### 1️⃣ Página Principal (Dashboard)

<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/b5fe9251-0643-4724-95ce-f0184333e3a5" />


- 📊 **Gráficas**: Latencia en el tiempo, comparativas, etc.
- 📈 **KPIs**: Números clave como pérdida de paquetes promedio
- 🗺️ **Mapa**: Dónde hiciste cada prueba
- 🔴 **Live**: Pruebas que están corriendo en este momento

### 2️⃣ Nueva Prueba

<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/f38119e1-648e-477f-bcd6-79ddd3863431" />


**Paso 1: Modo de Prueba**
- 🏠 **LAN**: Prueba en tu red local (ej: tu router)
- 🌍 **REMOTE**: Prueba por internet (ej: un servidor en la nube)

**Paso 2: Configuración Técnica**
<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/a992faac-6847-486a-a3ab-53bdb0d15c3a" />

- Protocolo (UDP o TCP)
- Host destino (IP o dominio)
- Puerto
- Tamaño de paquetes (bytes)
- Cantidad de paquetes
- Intervalo entre paquetes (ms)

**Paso 3: Herramientas**

<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/e7b9a3c6-6d9e-445a-95e8-0c3b2eed5857" />


- 🔍 **Escáner de Red**: Encuentra dispositivos
<img width="1685" height="275" alt="image" src="https://github.com/user-attachments/assets/4ecb015b-432b-4bf5-b901-aaa2f7671428" />

- 🔓 **Escáner de Puertos**: Ve puertos abiertos
<img width="1684" height="214" alt="image" src="https://github.com/user-attachments/assets/f0814000-e2d1-444e-97f5-14d3877acf21" />

- ⚡ **Speedtest**: Mide tu velocidad actual
<img width="1685" height="207" alt="image" src="https://github.com/user-attachments/assets/0ff8ac7f-b889-4f85-8df5-529f0aafaadb" />

**Paso 4: Contexto y Ejecutar**
- Llena datos como: tipo de red, proveedor, ubicación, dispositivo
- Dale a "Ejecutar Prueba" y ve el progreso en vivo
<img width="1719" height="173" alt="image" src="https://github.com/user-attachments/assets/87bcfb7c-8529-4541-98e9-9dae22a2aa0f" />

### 3️⃣ Historial
<img width="1366" height="650" alt="image" src="https://github.com/user-attachments/assets/96fe7101-6a3d-41aa-9db0-f6a0730c34fa" />

Lista de todas las pruebas que has hecho:
<img width="1724" height="406" alt="image" src="https://github.com/user-attachments/assets/81f94156-5516-4f0f-a52f-083f409bfa0b" />

- 📋 Tabla con filtros y búsqueda
- 👁️ Click en cualquier prueba para ver detalles
- 💾 Exporta a CSV o JSON
- 🗑️ (Puedes implementar borrar si quieres)

### 4️⃣ Configuración
<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/02565713-e29d-4e19-be7d-f754c362d783" />

Ajustes de la aplicación:
- 🌐 URL del backend (útil si usas túneles o dominios)
- 🔌 URL del WebSocket
- 📍 URL de CellMapper para mapas de antenas celulares

### 5️⃣ Ayuda
<img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/e9ba4d13-1118-415f-a6b5-209473aa234b" />

---

## 🔬 Cómo Funciona

### El Proceso Completo

```
1. CREAR PRUEBA
   ↓
   Usuario llena el formulario con configuración
   Frontend manda petición HTTP POST a /api/tests
   
2. BACKEND PREPARA
   ↓
   Crea registro en base de datos con status="running"
   Abre socket UDP o TCP según configuración
   
3. ENVIAR PAQUETES
   ↓
   Por cada paquete:
     - Se crea un buffer con un JSON header
     - Se manda al host destino
     - Se inicia un timer
     
4. RECIBIR RESPUESTAS
   ↓
   Por cada respuesta:
     - Se calcula RTT (tiempo de ida y vuelta)
     - Se marca como "received" o "lost" si timeout
     - Se emite evento WebSocket con progreso
     
5. CALCULAR RESULTADOS
   ↓
   Cuando terminan todos los paquetes:
     - Latencia promedio = suma(RTTs) / cantidad recibidos
     - Jitter = variación entre RTTs consecutivos
     - Pérdida = (perdidos / total) * 100
     - Throughput = (bytes_recibidos * 8) / tiempo_total
     
6. GUARDAR Y MOSTRAR
   ↓
   Se actualiza la BD con status="completed"
   Frontend recibe evento "test-complete"
   Se actualiza el dashboard automáticamente
```

### Formato de Paquetes

Cada paquete que mandamos tiene esta estructura:

```
┌─────────────────────────────┐
│ HEADER (JSON)               │  <- Metadata
│ {                           │
│   "seq": 1,                 │  <- Número de secuencia
│   "testId": "uuid...",      │  <- ID de la prueba
│   "sentAt": "2024-..."      │  <- Timestamp de envío
│ }                           │
├─────────────────────────────┤
│ \n                          │  <- Separador
├─────────────────────────────┤
│ PADDING                     │  <- Relleno para alcanzar
│ (bytes hasta tamaño         │     el tamaño configurado
│  configurado)               │
└─────────────────────────────┘
```

Cuando el agente recibe el paquete, lo devuelve exactamente igual. El backend calcula cuánto tardó en ir y volver (RTT).

---

## 📖 Guía Paso a Paso

### Escenario 1: Probar tu WiFi Local

**Objetivo**: Medir qué tan buena es tu conexión WiFi.

1. **Inicia el backend y frontend** (si no lo has hecho)
   ```bash
   npm run dev:server --prefix backend
   npm run dev --prefix frontend
   ```
<img width="998" height="162" alt="image" src="https://github.com/user-attachments/assets/c717872b-53b2-4885-addb-6fd5508eada0" />
<img width="646" height="171" alt="image" src="https://github.com/user-attachments/assets/0dadf485-f792-4e53-bb6e-79f40707bbd8" />


2. **Ve a "Nueva Prueba"**

3. **Configura así:**
   - Modo: **LAN** 🏠
   - Host: Tu router (ej: `192.168.1.1`)
   - Puerto: `40000`
   <img width="1734" height="541" alt="image" src="https://github.com/user-attachments/assets/9075d53c-8401-4146-8b70-1a12361a3af8" />

   - Protocolo: **UDP**
   - Paquetes: `100`
   - Tamaño: `64` bytes
   - Intervalo: `100` ms
   <img width="1735" height="372" alt="image" src="https://github.com/user-attachments/assets/446460ad-5f69-4231-b6e7-131f5b047c7b" />

4. **En Herramientas:**
   <img width="1716" height="448" alt="image" src="https://github.com/user-attachments/assets/1184eda8-bb34-40c1-a918-f6eae079bf61" />
   - Ejecuta el **Escáner de Red** para ver tu router
   - Ejecuta **Speedtest** para referencia
   
6. **Llena el contexto:**
   <img width="1728" height="512" alt="image" src="https://github.com/user-attachments/assets/f4c33a16-a0e7-4956-bc97-e5463fd9b5eb" />
   - Tipo de Red: WiFi
   - Proveedor: Tu ISP
   - Frecuencia: 2.4GHz o 5GHz
   - Ubicación: Tu casa
   - Dispositivo: Tu laptop/PC

7. **Dale a "Ejecutar Prueba"** 

8. **Analiza los resultados:**
   <img width="1920" height="962" alt="image" src="https://github.com/user-attachments/assets/25a3e14c-a4e3-4783-a22c-f794eae6a237" />

   - Latencia baja (<10ms) = ¡Excelente!
   - Pérdida de paquetes 0% = Perfecto
   - Si ves jitter alto, puede haber interferencia
---

## 🛠️ Herramientas IntegradasTUI

### ⚡ Speedtest

**¿Qué hace?** Mide tu velocidad de internet real (download, upload)
---

## 📡 Capturar Tráfico con Wireshark

Wireshark ayudó a captar paquetes en el agente cusndo se enviaba mediante la app

### Filtros Útiles

**Para ver paquetes UDP:**
```
udp.port == 40000
```

**Para ver paquetes TCP:**
```
tcp.port == 5050
```
---

## 📁 Estructura del Proyecto

```
network-lab/
├── backend/      # Servidor Node.js
├── frontend/     # App React
├── agent/        # Agente remoto
└── README.md     # Esta doc
```

---

## ⚙️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Backend + Frontend
npm run dev:server       # Solo Backend
npm run dev:frontend     # Solo Frontend

# Producción
npm run build            # Build todo
```

---

## 🐛 Problemas Comunes

### ❌ "Port already in use"

```bash
# Cambia el puerto
export API_PORT=4001
```

---


<div align="center">

### ⭐ Hecho como Proyecto Final de Lab. Redes del Prof. Herbert ⭐

</div>
