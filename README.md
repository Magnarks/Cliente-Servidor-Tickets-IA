# Cliente-Servidor-Tickets-IA
Una aplicación cliente servidor con agente de IA (Prueba Técnica Orbidi)
# Pasos para ejecutar

## Requisitos Previos

- MySQL instalado y en ejecución
- Python 3.x
- Node.js y npm

## Configuración de la Base de Datos

Es necesario tener corriendo la base de datos de MySQL antes de ejecutar el backend. Configura las credenciales en el archivo `.env` del backend.
Se comparte archivo schema.sql dentro de la carpeta Backend/bd para crear las tablas en la base de datos


## Backend

El backend está desarrollado con FastAPI. Para ejecutarlo:

```bash
cd backend
python app_ordibi.py
```

Asegúrate de tener las dependencias de Python instaladas.

## Frontend

El frontend está desarrollado con React y Vite.

### Instalación de Dependencias

Antes de ejecutar cualquier comando, instala las dependencias del frontend:

```bash
cd frontend/oribidi-tickets
npm install
```

### Desarrollo

Para ejecutar en modo desarrollo:

```bash
npm run dev
```

### Producción

Para construir el frontend para producción:

```bash
npm run build
```

# 🧠 Sistema de Gestión de Tickets con Asistente de IA

## 📌 Descripción general

Se desarrolló una aplicación web para la gestión de tickets que permite crear, visualizar, editar y organizar tickets mediante vistas de tabla y Kanban.
Adicionalmente, se integró un asistente de IA conversacional capaz de consultar información de tickets y ejecutar acciones básicas sobre los mismos.

---

## ⚙️ Decisiones técnicas

### 🖥️ Frontend

Se utilizó **React + Vite** debido a:

* Experiencia previa en el ecosistema
* Renderizado eficiente y desarrollo ágil
* Hot Reloading rápido que mejora la productividad

Para la UI se implementaron:

* Tablas dinámicas con DataTables
* Vista Kanban con drag & drop
* Componentes reutilizables (modales, offcanvas, notificaciones)

---

### 🔧 Backend

Se utilizó **Python + FastAPI** junto con **WebSockets**:

* FastAPI permite desarrollo rápido, tipado y alto rendimiento
* WebSockets se implementaron para notificaciones en tiempo real
* Arquitectura basada en endpoints REST + canal bidireccional

---

### 🗄️ Base de datos

Se utilizó **MySQL** como base de datos relacional:

* Persistencia de tickets, usuarios y adjuntos
* Almacenamiento de adjuntos como JSON estructurado
* Relaciones claras entre entidades del sistema

---

### 📡 Comunicación en tiempo real

Se implementó un sistema de notificaciones mediante WebSockets que permite:

* Alertar a usuarios cuando se les asigna o modifica un ticket
* Actualizar contadores de notificaciones en el frontend
* Integración con UI mediante badges y offcanvas

---

### 📁 Manejo de archivos

Se desarrolló un sistema de carga de archivos que incluye:

* Subida múltiple de adjuntos
* Almacenamiento local organizado por ticket
* Registro en base de datos en formato JSON
* Visualización y descarga desde el frontend

---

### 🤖 Asistente de IA

Se integró un asistente conversacional que permite:

* Consultar información de tickets
* Aplicar filtros
* Obtener detalles específicos (estado, prioridad, etc.)

El frontend renderiza las respuestas en formato Markdown para mejorar la legibilidad.

---

## ✅ Funcionalidades implementadas

* ✔ Autenticación de usuario
* ✔ CRUD completo de tickets
* ✔ Vista en tabla (filtrado, ordenamiento)
* ✔ Vista Kanban con drag & drop
* ✔ Notificaciones en tiempo real (WebSockets)
* ✔ Sistema de alertas con badge
* ✔ Subida y gestión de archivos adjuntos
* ✔ Visualización y descarga de archivos
* ✔ Asistente de IA conversacional (Bonus)

---

## 🧠 Herramientas de IA utilizadas

Se utilizaron herramientas de IA como apoyo al desarrollo:

* **Claude Haiku**: sistencia en autocompletado y apoyo general
* **Qwen 3.6 (local)**: asistencia en autocompletado y generación del archivo requirements.txt y este Readme
* **ChatGPT**: resolución de dudas específicas, debugging y mejora de implementación

El uso de estas herramientas fue orientado a mejorar la productividad, manteniendo control total sobre la lógica y decisiones del sistema.

---

## 🚀 Posibles mejoras

* Sistema de permisos por roles
* Almacenamiento de archivos en la nube (S3, GCP)
* Mejora en la seguridad de acceso a archivos
* Versionado de tickets y auditoría de cambios

---

## 📌 Conclusión

El sistema cumple con los requerimientos planteados, incorporando funcionalidades adicionales que aportan valor como la comunicación en tiempo real y la integración de un asistente de IA.
La arquitectura implementada permite escalabilidad y futuras mejoras sin cambios estructurales significativos.

