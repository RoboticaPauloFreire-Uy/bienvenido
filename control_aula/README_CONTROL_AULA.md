# 📱 Control de Aula Maker — Modo Móvil & Red Local
**Colegio Paulo Freire · Laboratorio de Informática & Robótica**

Controlá todas las computadoras del taller de robótica **directamente desde tu teléfono celular mientras caminás entre los bancos**, 100% por red local sin internet ni intermediarios.

---

## 📲 Cómo Conectar tu Celular en 5 Segundos

1. **En la computadora principal del profesor:**
   * Hacé doble clic en **`iniciar_docente.bat`**.
   * Vas a ver en la pantalla de la PC un **Código QR grande** (tanto en la consola negra como en el navegador que se abre).
2. **En tu celular:**
   * Asegurate de que tu teléfono esté conectado al **Wi-Fi del colegio**.
   * Abrí la cámara de fotos de tu celular y **apuntá a la pantalla de la computadora**.
   * Tocá el enlace que aparece (ej: `http://192.168.1.X:5000`) ¡y listo! Ya tenés el control remoto en tu mano.
   * *(Opcional)* En el navegador de tu celular (Chrome o Safari) podés seleccionar **«Agregar a la pantalla principal»** para que te quede como una app con icono de robot.

---

## 🎛️ Experiencia en el Celular (Diseñada para una sola mano)

* 🔴 **Barra Táctil Inferior (justo bajo tu pulgar):**
  * **BLOQUEAR (Rojo):** Pausa todas las pantallas al instante con el robot FreireBot y el cartel *"¡Atención al Pizarrón!"*.
  * **AVISO (Amarillo):** Te abre un teclado para mandar un mensaje con sonido de timbre a todos *(ej: «¡Faltan 5 minutos para guardar!»)*.
  * **DESBLOQUEAR (Verde):** Devuelve las computadoras a su estado normal para seguir trabajando.
* 📳 **Respuesta Háptica (Vibración):** El celular vibra brevemente al tocar cada botón para confirmarte que el comando se envió sin que tengas que mirar la pantalla fija.
* 🎮 **Juegos Offline (Recreo / Premio 100% Sin Internet):**
  * 🏄‍♂️ **Surf (Edge):** Abre instantáneamente el juego del surf en Microsoft Edge en todas las máquinas.
  * 🦖 **Dinosaurio (Chrome):** Abre instantáneamente el juego del T-Rex en Google Chrome en todas las máquinas.
  * *¡Funcionan con o sin internet!* Los navegadores los tienen grabados en su propio código interno.
* 🚀 **Lanzador de Proyectos en 1 Toque:** Botones grandes y coloridos para abrir:
  * El Diario del Taller
  * Scratch
  * MakeCode Micro:bit
  * PaperMe (Papercraft 3D)
  * Animated Drawings (Meta AI)
  * Canva
* 💻 **Lista de Máquinas en Vivo:** Ves en tiempo real qué computadoras están encendidas, quién está bloqueado y podés actuar sobre una máquina específica si un alumno se distrae.

---

## 🖥️ En las Computadoras de los Alumnos

1. En cada máquina de los chicos, ejecutás **`iniciar_alumno.bat`** (o colocás un acceso directo en `shell:startup` para que arranque solo con Windows).
2. La máquina detecta sola al profesor por la red local sin configurar IPs.
3. No requiere ninguna instalación externa (`Tkinter` viene incluido en Python).
