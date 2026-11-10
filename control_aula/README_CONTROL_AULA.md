# 🎛️ Control de Aula Maker — Red Local (Python Puro)
**Colegio Paulo Freire · Laboratorio de Informática & Robótica**

Este sistema permite al docente controlar todas las computadoras del laboratorio escolar **en tiempo real a través de la red local (Wi-Fi o cable), sin depender de internet ni de servicios externos como ntfy.sh**.

---

## 🚀 Inicio Rápido

### 1. En la Computadora del Profesor
1. Hacé doble clic en **`iniciar_docente.bat`**.
2. Se abrirá automáticamente la **Interfaz Gráfica Web** en tu navegador (`http://localhost:5000`).
3. *(Opcional)* También podés abrir esa dirección desde tu **celular o tablet** conectado al mismo Wi-Fi del colegio para controlar el aula mientras caminás entre las mesas.

### 2. En las Computadoras de los Alumnos
1. Copiá la carpeta del cliente o hacé doble clic en **`iniciar_alumno.bat`**.
2. **Auto-descubrimiento:** El alumno detecta automáticamente la IP de la máquina del docente mediante un faro local en la red. No requiere configurar IPs estáticas.
3. *(Opcional)* Podés crear un acceso directo a `iniciar_alumno.bat` en la carpeta `Inicio` de Windows (`shell:startup`) para que arranque solo al encender la máquina.

---

## 🛠️ Funciones del Panel de Control

| Función | Descripción |
| :--- | :--- |
| 🔒 **Modo Atención (Bloqueo)** | Muestra una pantalla completa en el monitor del alumno con el robot FreireBot y el texto *"¡Atención al Pizarrón!"*, bloqueando la vista de juegos o distracciones para que escuchen la explicación. |
| 🔓 **Desbloquear** | Cierra la pantalla de bloqueo y devuelve el control al estudiante al instante. |
| 🚀 **Lanzador Rápido de Proyectos** | Abre en simultáneo en todas las máquinas: **El Diario del Taller**, **Scratch**, **MakeCode Micro:bit**, **PaperMe (3D)**, **Animated Drawings**, **Canva**, o cualquier enlace web que pegues en el recuadro. |
| 📢 **Mensaje en Pantalla** | Muestra una ventana emergente en primer plano con sonido de campana *(ej: «¡Faltan 5 minutos para guardar el proyecto!»)* con botón de *«¡Entendido!»*. |
| 🔇 **Silenciar Audio** | Silencia los parlantes/auriculares de todas las máquinas en caso de ruidos o videos superpuestos. |
| ⚡ **Apagar Equipos** | Comando de fin de clase para apagar ordenadamente todas las máquinas del aula con un solo clic. |
| 🖥️ **Control Individual** | En la grilla podés bloquear, desbloquear o mandar mensajes a una computadora específica *(ej: solo a PC-04)*. |

---

## 🔒 Ventajas frente a ntfy.sh

* **100% Privado:** Toda la comunicación ocurre adentro del taller. Nadie en internet puede ver qué páginas abrís ni mandar comandos a las computadoras del colegio.
* **Funciona sin Internet:** Si se corta la fibra óptica o la conexión de la escuela, el control sigue funcionando a la perfección a través del router local.
* **Sin librerías externas:** Funciona con Python estándar (Tkinter nativo, sockets y HTTP estándar). No requiere `pip install`.
