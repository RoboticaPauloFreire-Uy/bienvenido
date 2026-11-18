# -*- coding: utf-8 -*-
"""
CLIENTE_ALUMNO.PY — AGENTE DE MÁQUINA DE ALUMNO (PYTHON PURO)
Colegio Paulo Freire · Taller de Robótica & Informática

Se ejecuta en cada computadora de los alumnos.
Se oculta automáticamente en segundo plano (modo invisible sin ventana ni ícono en barra de tareas).
Descubre automáticamente la IP del docente por:
  1. Archivo local de configuración servidor_ip.txt
  2. Faro UDP broadcast (puerto 5005)
  3. Escaneo ultra-rápido multi-hilo de la subred local (puerto 5000)
  4. Entrada manual como respaldo
Ejecuta bloqueo de pantalla (Modo Atención), control de volumen (50%),
detección de búsquedas no permitidas en Google, reporte de ventana activa en vivo,
apertura de proyectos web, avisos y juegos offline (edge://surf y chrome://dino).
"""

import os
import sys
import time
import json
import re
import shutil
import socket
import platform
import threading
import subprocess
import webbrowser
import urllib.request
import urllib.error
import urllib.parse
import concurrent.futures
import traceback
import unicodedata

DIR_BASE = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_PID = os.path.join(DIR_BASE, "agente_alumno.pid")
ARCHIVO_LOG = os.path.join(DIR_BASE, "agente_alumno.log")

# Si corre en modo oculto (sin consola), redirigir stdout/stderr a archivo de log para evitar errores en print()
MODO_OCULTO = ("--oculto" in sys.argv)
MODO_VISIBLE_FORZADO = ("--visible" in sys.argv)

if MODO_OCULTO or sys.stdout is None or sys.stderr is None:
    try:
        _log_fh = open(ARCHIVO_LOG, "a", encoding="utf-8", buffering=1)
        sys.stdout = _log_fh
        sys.stderr = _log_fh
    except Exception:
        pass

# GUI con Tkinter nativo (modo seguro ante instalaciones mínimas de Python)
TKINTER_OK = False
tk_root = None
try:
    import tkinter as tk
    TKINTER_OK = True
except Exception:
    tk = None
    TKINTER_OK = False

PUERTO_UDP = 5005
PUERTO_WEB_DEFECTO = 5000

# Identificación de la máquina
HOSTNAME = socket.gethostname()
SISTEMA_OPERATIVO = platform.system()
MACHINE_ID = f"{HOSTNAME}_{platform.node()}"

def ocultar_consola_windows():
    """Oculta la ventana de consola en Windows si existe."""
    if SISTEMA_OPERATIVO != "Windows":
        return
    try:
        import ctypes
        hwnd = ctypes.windll.kernel32.GetConsoleWindow()
        if hwnd:
            ctypes.windll.user32.ShowWindow(hwnd, 0)  # SW_HIDE = 0
    except Exception:
        pass

def detener_instancia_previa():
    """Si ya había un agente corriendo en segundo plano, lo detiene antes de iniciar el nuevo."""
    if not os.path.exists(ARCHIVO_PID):
        return
    try:
        with open(ARCHIVO_PID, "r", encoding="utf-8") as f:
            old_pid = int(f.read().strip())
        if old_pid and old_pid != os.getpid():
            if SISTEMA_OPERATIVO == "Windows":
                flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
                subprocess.run(["taskkill", "/F", "/PID", str(old_pid)], capture_output=True, creationflags=flags)
            else:
                import signal
                os.kill(old_pid, signal.SIGTERM)
    except Exception:
        pass

def guardar_pid_actual():
    """Registra el PID del proceso invisible actual."""
    try:
        with open(ARCHIVO_PID, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
    except Exception:
        pass

def lanzar_en_segundo_plano_windows():
    """Lanza este mismo script en modo 100% invisible (pythonw sin consola) y cierra la ventana actual."""
    detener_instancia_previa()
    ruta_script = os.path.abspath(__file__)
    dir_python = os.path.dirname(sys.executable)
    pythonw_exe = os.path.join(dir_python, "pythonw.exe")

    CREATE_NEW_PROCESS_GROUP = 0x00000200
    CREATE_NO_WINDOW = 0x08000000

    if os.path.exists(pythonw_exe):
        # pythonw.exe es subsistema GUI nativo: no abre ventana de consola pero permite abrir navegadores normalmente
        proc = subprocess.Popen(
            [pythonw_exe, ruta_script, "--oculto"],
            cwd=DIR_BASE,
            creationflags=CREATE_NEW_PROCESS_GROUP,
            close_fds=True
        )
    else:
        proc = subprocess.Popen(
            [sys.executable, ruta_script, "--oculto"],
            cwd=DIR_BASE,
            creationflags=CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP,
            close_fds=True
        )
    try:
        with open(ARCHIVO_PID, "w", encoding="utf-8") as f:
            f.write(str(proc.pid))
    except Exception:
        pass
    return proc.pid

def cargar_numero_local():
    """Lee el número asignado a esta máquina desde numero_maquina.txt o del hostname."""
    archivo = os.path.join(DIR_BASE, "numero_maquina.txt")
    if os.path.exists(archivo):
        try:
            with open(archivo, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val:
                    return val
        except Exception:
            pass
    match = re.search(r'\d+', HOSTNAME)
    if match:
        return str(int(match.group()))
    return ""

def guardar_numero_local(num):
    """Guarda el número de máquina asignado permanentemente en el disco."""
    global NUMERO_MAQUINA
    try:
        NUMERO_MAQUINA = str(num).strip()
        archivo = os.path.join(DIR_BASE, "numero_maquina.txt")
        with open(archivo, "w", encoding="utf-8") as f:
            f.write(NUMERO_MAQUINA)
        print(f"  [+] Esta máquina ahora está identificada como: PC {NUMERO_MAQUINA}", flush=True)
    except Exception as e:
        print(f"  [!] Error guardando número de máquina: {e}", flush=True)

NUMERO_MAQUINA = cargar_numero_local()

# Estado local
servidor_docente_url = None
ultima_ip_docente_valida = None
ultimo_contacto_exitoso = time.time()
bloqueado = False
ventana_bloqueo = None
ventanas_emergentes = []
vigilancia_google_activa = True
ultima_busqueda_alertada = ""
ultimo_tiempo_alerta = 0.0
ultima_foto_base64 = ""
DIR_EVIDENCIAS = os.path.join(DIR_BASE, "evidencias_busquedas")
ARCHIVO_PALABRAS_PROHIBIDAS = os.path.join(DIR_BASE, "palabras_prohibidas.txt")
_palabras_prohibidas_cache = []
_palabras_prohibidas_mtime = 0

# Estado de Modo Foco (Lista Blanca de Navegación)
modo_foco_activo = False
modo_foco_nombre = "Scratch y Robótica"
modo_foco_permitidos = ["scratch", "tinkercad", "paulofreire", "roboticapaulofreire-uy.github.io"]
ultimo_aviso_foco = 0.0
alerta_foco_pendiente = ""

PROGRAMAS_SISTEMA_SEGUROS = [
    "escritorio", "desktop", "explorador de archivos", "file explorer", 
    "program manager", "barra de tareas", "taskbar", "calculadora", "calculator",
    "bloc de notas", "notepad", "paint", "cmd", "powershell", "python",
    "agente_alumno", "agente alumno", "iniciar_alumno", "configuración", "settings",
    "aviso del docente", "aviso del profesor", "modo foco activo", "control de aula"
]

def normalizar_texto(texto):
    if not texto:
        return ""
    n = "".join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')
    return n.lower().strip()

def cargar_palabras_prohibidas():
    global _palabras_prohibidas_cache, _palabras_prohibidas_mtime
    try:
        if os.path.exists(ARCHIVO_PALABRAS_PROHIBIDAS):
            mt = os.path.getmtime(ARCHIVO_PALABRAS_PROHIBIDAS)
            if mt != _palabras_prohibidas_mtime:
                lista = []
                with open(ARCHIVO_PALABRAS_PROHIBIDAS, "r", encoding="utf-8") as f:
                    for linea in f:
                        l = linea.strip()
                        if l and not l.startswith("#"):
                            lista.append(l)
                _palabras_prohibidas_cache = lista
                _palabras_prohibidas_mtime = mt
    except Exception:
        pass
    return _palabras_prohibidas_cache

def es_busqueda_desubicada(query):
    """
    Verifica con límites de palabra (\\b) si la búsqueda coincide con términos prohibidos/desubicados.
    Evita falsos positivos educativos como 'armadura' ante 'arma'.
    Devuelve (es_desubicada: bool, palabra_coincidente: str o None).
    """
    if not query:
        return False, None
    qn = normalizar_texto(query)
    palabras = cargar_palabras_prohibidas()
    for p in palabras:
        pn = normalizar_texto(p)
        if not pn:
            continue
        if " " in pn:
            if pn in qn:
                return True, p
        else:
            patron = r'\b' + re.escape(pn) + r'(?:s|es)?\b'
            if re.search(patron, qn):
                return True, p
    return False, None

def _sincronizar_palabras_desde_docente(nuevas_palabras):
    global _palabras_prohibidas_cache
    if nuevas_palabras and set(nuevas_palabras) != set(_palabras_prohibidas_cache):
        _palabras_prohibidas_cache = list(nuevas_palabras)
        try:
            with open(ARCHIVO_PALABRAS_PROHIBIDAS, "w", encoding="utf-8") as f:
                f.write("# Sincronizado automáticamente desde el Servidor Docente\n")
                for p in nuevas_palabras:
                    f.write(f"{p}\n")
        except Exception:
            pass

def obtener_mi_subred():
    """Detecta la IP local de esta máquina para escanear la subred."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        partes = ip.split('.')
        if len(partes) == 4:
            return '.'.join(partes[:3]) + '.', ip
    except Exception:
        pass
    return '192.168.1.', '127.0.0.1'

def verificar_servidor_docente(url):
    """Verifica si una URL responde efectivamente al servidor docente Freire."""
    try:
        req = urllib.request.Request(
            f"{url}/api/status",
            headers={"User-Agent": "AgenteAlumnoFreire", "Connection": "close"}
        )
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            if resp.status == 200:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw) if raw else {}
                if "maquinas" in data:
                    return True
    except Exception:
        pass
    return False

def descubrir_servidor():
    """Descubre automáticamente la IP del docente con 4 capas de respaldo resilientes."""
    global ultima_ip_docente_valida
    archivo_cfg = os.path.join(DIR_BASE, "servidor_ip.txt")

    # 1. Probar última IP válida recordada
    if ultima_ip_docente_valida and verificar_servidor_docente(ultima_ip_docente_valida):
        return ultima_ip_docente_valida

    # 2. Archivo local de configuración servidor_ip.txt
    if os.path.exists(archivo_cfg):
        try:
            with open(archivo_cfg, "r", encoding="utf-8") as f:
                linea = f.read().strip()
                if linea:
                    if not linea.startswith("http"):
                        linea = f"http://{linea}:{PUERTO_WEB_DEFECTO}"
                    if verificar_servidor_docente(linea):
                        print(f"  [+] Docente encontrado en configuración: {linea}", flush=True)
                        ultima_ip_docente_valida = linea
                        return linea
        except Exception:
            pass

    # 3. Faro UDP broadcast
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            try: s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except Exception: pass
        s.bind(("", PUERTO_UDP))
        s.settimeout(1.5)
        data, addr = s.recvfrom(2048)
        info = json.loads(data.decode("utf-8"))
        if info.get("magic") == "FREIRE_AULA":
            ip = info.get("docente_ip", addr[0])
            puerto = info.get("puerto", PUERTO_WEB_DEFECTO)
            s.close()
            url = f"http://{ip}:{puerto}"
            print(f"  [+] ¡Docente detectado por faro en {url}!", flush=True)
            ultima_ip_docente_valida = url
            try:
                with open(archivo_cfg, "w", encoding="utf-8") as f: f.write(url)
            except Exception: pass
            return url
    except Exception:
        pass

    # 4. Escaneo de subred local (solo si tenemos IP válida de red, evitando escanear a ciegas si el Wi-Fi está apagado)
    prefijo_subred, mi_ip = obtener_mi_subred()
    if mi_ip != "127.0.0.1":
        encontrado = []
        def _test_ip(ip):
            if encontrado:
                return
            url = f"http://{ip}:{PUERTO_WEB_DEFECTO}"
            if verificar_servidor_docente(url):
                encontrado.append(url)

        ips_a_probar = [f"{prefijo_subred}{i}" for i in range(1, 255)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            list(executor.map(_test_ip, ips_a_probar))

        if encontrado:
            url = encontrado[0]
            print(f"  [+] ¡Docente detectado en la red: {url}!", flush=True)
            ultima_ip_docente_valida = url
            try:
                with open(archivo_cfg, "w", encoding="utf-8") as f: f.write(url)
            except Exception: pass
            return url

    # 5. Localhost solo si el docente realmente corre en este equipo (modo prueba local)
    if verificar_servidor_docente(f"http://127.0.0.1:{PUERTO_WEB_DEFECTO}"):
        return f"http://127.0.0.1:{PUERTO_WEB_DEFECTO}"

    return None

# ══════════════════════════════════════════════════════════════
# CONTROL DE PANTALLA Y VENTANAS (TKINTER NATIVO)
# ══════════════════════════════════════════════════════════════

def registrar_ventana_emergente(w):
    global ventanas_emergentes
    if w and w not in ventanas_emergentes:
        ventanas_emergentes.append(w)

def limpiar_todos_los_bloqueos_y_carteles():
    """
    FAIL-SAFE: Cierra de forma inmediata cualquier pantalla de bloqueo, cartel o popup,
    y devuelve el control absoluto e incondicional de la máquina al alumno.
    """
    global ventana_bloqueo, bloqueado, ventanas_emergentes, tk_root
    bloqueado = False

    def _limpiar():
        global ventana_bloqueo, ventanas_emergentes
        if ventana_bloqueo:
            try:
                ventana_bloqueo.destroy()
            except Exception:
                pass
            ventana_bloqueo = None

        for pop in list(ventanas_emergentes):
            try:
                pop.destroy()
            except Exception:
                pass
        ventanas_emergentes.clear()

        if SISTEMA_OPERATIVO == "Windows":
            try:
                import ctypes
                ctypes.windll.user32.RedrawWindow(0, 0, 0, 0x0085)
            except Exception:
                pass

    if tk_root:
        try:
            tk_root.after(0, _limpiar)
        except Exception:
            pass
    print("  [🛡️ FAIL-SAFE] Todos los bloqueos y carteles eliminados. Máquina liberada.", flush=True)

def mostrar_pantalla_bloqueo():
    """Crea una pantalla completa en primer plano para el modo atención."""
    global ventana_bloqueo, bloqueado, tk_root, ultimo_contacto_exitoso

    # FAIL-SAFE: Si pasaron más de 5 segundos sin contacto con el docente, rechazar el bloqueo
    ahora = time.time()
    if (ahora - ultimo_contacto_exitoso) > 5.0:
        print("  [!] Bloqueo rechazado: Sin conexión reciente con el docente (Fail-Safe activo).", flush=True)
        return

    if bloqueado:
        return
    bloqueado = True

    if not tk_root:
        print("  [!] PANTALLA BLOQUEADA (Modo Atención activado por el docente)", flush=True)
        return

    def _crear():
        global ventana_bloqueo
        if ventana_bloqueo:
            return

        w = tk.Toplevel(tk_root)
        ventana_bloqueo = w
        w.configure(bg="#0F172A")
        w.attributes("-fullscreen", True)
        w.attributes("-topmost", True)
        w.overrideredirect(True)

        w.protocol("WM_DELETE_WINDOW", lambda: None)
        w.bind("<Escape>", lambda e: "break")
        w.bind("<Alt-F4>", lambda e: "break")
        w.bind("<Control-Alt-Delete>", lambda e: "break")

        frame = tk.Frame(w, bg="#0F172A")
        frame.place(relx=0.5, rely=0.5, anchor="center")

        lbl_icono = tk.Label(frame, text="🤖", font=("Segoe UI Emoji", 70), bg="#0F172A", fg="#F59E0B")
        lbl_icono.pack(pady=10)

        lbl_titulo = tk.Label(frame, text="¡ATENCIÓN AL PIZARRÓN!", font=("Arial", 36, "bold"), bg="#0F172A", fg="#F8FAFC")
        lbl_titulo.pack(pady=8)

        lbl_colegio = tk.Label(frame, text="COLEGIO PAULO FREIRE · TALLER DE ROBÓTICA", font=("Arial", 14, "bold"), bg="#0F172A", fg="#38BDF8")
        lbl_colegio.pack(pady=4)

        lbl_sub = tk.Label(
            frame,
            text="El profesor ha pausado las pantallas para la explicación de la clase.\nPor favor, soltá el mouse y mirá al frente.",
            font=("Arial", 16),
            bg="#0F172A",
            fg="#94A3B8",
            justify="center"
        )
        lbl_sub.pack(pady=20)

        lbl_pie = tk.Label(frame, text="★ MODO ATENCIÓN ACTIVO ★", font=("Courier", 12, "bold"), bg="#1E293B", fg="#10B981", padx=16, pady=6)
        lbl_pie.pack(pady=10)

        w.update()

    try:
        tk_root.after(0, _crear)
    except Exception as e:
        print(f"  [!] Error abriendo pantalla de bloqueo: {e}", flush=True)

def ocultar_pantalla_bloqueo():
    """Cierra la pantalla de bloqueo y devuelve el control al alumno."""
    global ventana_bloqueo, bloqueado, tk_root
    bloqueado = False

    def _cerrar():
        global ventana_bloqueo
        if ventana_bloqueo:
            try:
                ventana_bloqueo.destroy()
            except Exception:
                pass
            ventana_bloqueo = None
        if SISTEMA_OPERATIVO == "Windows":
            try:
                import ctypes
                ctypes.windll.user32.RedrawWindow(0, 0, 0, 0x0085)
            except Exception:
                pass

    if tk_root:
        try:
            tk_root.after(0, _cerrar)
        except Exception as e:
            print(f"  [!] Error cerrando pantalla de bloqueo: {e}", flush=True)

def mostrar_mensaje_emergente(texto):
    """Muestra un aviso emergente en pantalla enviado por el docente."""
    if not tk_root:
        print(f"\n  📢 AVISO DEL PROFESOR: {texto}\n", flush=True)
        return

    def _popup():
        try:
            if SISTEMA_OPERATIVO == "Windows":
                import winsound
                winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
            else:
                print("\a")
        except Exception:
            pass

        pop = tk.Toplevel(tk_root)
        registrar_ventana_emergente(pop)
        pop.title("Aviso del Docente · Colegio Paulo Freire")
        pop.configure(bg="#1E293B")
        pop.attributes("-topmost", True)
        pop.geometry("480x280")
        pop.resizable(False, False)

        pop.update_idletasks()
        ancho = pop.winfo_width()
        alto = pop.winfo_height()
        x = (pop.winfo_screenwidth() // 2) - (ancho // 2)
        y = (pop.winfo_screenheight() // 2) - (alto // 2)
        pop.geometry(f"{ancho}x{alto}+{x}+{y}")

        frame = tk.Frame(pop, bg="#1E293B", padx=20, pady=20)
        frame.pack(fill="both", expand=True)

        lbl_head = tk.Label(frame, text="📢 AVISO DEL PROFESOR", font=("Arial", 16, "bold"), bg="#1E293B", fg="#F59E0B")
        lbl_head.pack(anchor="w", pady=(0, 10))

        lbl_txt = tk.Label(frame, text=texto, font=("Arial", 13), bg="#1E293B", fg="#F8FAFC", wraplength=430, justify="left")
        lbl_txt.pack(anchor="w", pady=(0, 20), expand=True)

        btn = tk.Button(
            frame,
            text="¡Entendido!",
            font=("Arial", 11, "bold"),
            bg="#3B82F6",
            fg="#FFF",
            activebackground="#2563EB",
            relief="flat",
            padx=20,
            pady=8,
            cursor="hand2",
            command=pop.destroy
        )
        btn.pack(anchor="e")

    try:
        tk_root.after(0, _popup)
    except Exception as e:
        print(f"  📢 AVISO DEL DOCENTE: {texto}", flush=True)

def mostrar_aviso_cierre_clase(mensaje="👋 ¡Clase Finalizada!\nApagando equipo... ¡Buen trabajo hoy!", duracion_segundos=10):
    """Muestra un mensaje visual de cierre de clase o reinicio con aviso al alumno."""
    if not tk_root:
        print(f"\n{mensaje}\n", flush=True)
        return

    def _anim():
        try:
            pop = tk.Toplevel(tk_root)
            registrar_ventana_emergente(pop)
            pop.title("Cierre de Clase · Colegio Paulo Freire")
            pop.configure(bg="#0F172A")
            pop.attributes("-topmost", True)
            pop.overrideredirect(True)

            w, h = 540, 260
            x = (pop.winfo_screenwidth() // 2) - (w // 2)
            y = (pop.winfo_screenheight() // 2) - (h // 2)
            pop.geometry(f"{w}x{h}+{x}+{y}")

            frame = tk.Frame(pop, bg="#0F172A", highlightbackground="#38BDF8", highlightthickness=2, padx=24, pady=24)
            frame.pack(fill="both", expand=True)

            lbl_tit = tk.Label(frame, text="COLEGIO PAULO FREIRE", font=("Arial", 16, "bold"), fg="#38BDF8", bg="#0F172A")
            lbl_tit.pack(pady=(0, 10))

            lbl_msg = tk.Label(frame, text=mensaje, font=("Arial", 13), fg="#F8FAFC", bg="#0F172A", justify="center")
            lbl_msg.pack(pady=(0, 14), expand=True)

            lbl_cuenta = tk.Label(frame, text=f"Ejecutando en {duracion_segundos} segundos...", font=("Arial", 11, "bold"), fg="#F59E0B", bg="#0F172A")
            lbl_cuenta.pack(side="bottom")

            pop.update()
        except Exception:
            pass

    try:
        tk_root.after(0, _anim)
    except Exception:
        pass

def mostrar_aviso_modo_foco(titulo_ventana, nombre_foco):
    """Muestra una notificación flotante no intrusiva avisando que la ventana fue minimizada por Modo Foco."""
    if not tk_root:
        return

    def _popup():
        try:
            pop = tk.Toplevel(tk_root)
            registrar_ventana_emergente(pop)
            pop.title("Modo Foco Activo")
            pop.configure(bg="#0F172A")
            pop.attributes("-topmost", True)
            pop.overrideredirect(True)

            w, h = 480, 120
            x = (pop.winfo_screenwidth() // 2) - (w // 2)
            y = 25
            pop.geometry(f"{w}x{h}+{x}+{y}")

            frame = tk.Frame(pop, bg="#0F172A", highlightbackground="#0284C7", highlightthickness=2, padx=16, pady=12)
            frame.pack(fill="both", expand=True)

            lbl_tit = tk.Label(
                frame,
                text="🎯 MODO FOCO ACTIVO · COLEGIO PAULO FREIRE",
                font=("Arial", 11, "bold"),
                fg="#38BDF8",
                bg="#0F172A"
            )
            lbl_tit.pack(anchor="w")

            msg = f"En esta clase solo se permite usar: {nombre_foco}.\nLa ventana no permitida fue minimizada para que continúes tu tarea."
            lbl_desc = tk.Label(
                frame,
                text=msg,
                font=("Arial", 10),
                fg="#E2E8F0",
                bg="#0F172A",
                justify="left"
            )
            lbl_desc.pack(anchor="w", pady=(4, 0))

            pop.after(3500, pop.destroy)
        except Exception:
            pass

    try:
        tk_root.after(0, _popup)
    except Exception:
        pass

def verificar_modo_foco(titulo_ventana, hwnd):
    """
    Si el modo foco está activo, comprueba si la ventana actual está permitida.
    Si no está permitida, la minimiza y muestra una notificación no invasiva del robot.
    """
    global ultimo_aviso_foco, alerta_foco_pendiente
    if not modo_foco_activo or not titulo_ventana or not hwnd:
        return None

    t_low = titulo_ventana.strip().lower()
    if not t_low or t_low == "escritorio / sin ventana activa":
        return None

    # 1. Comprobar si es un programa del sistema seguro
    for seguro in PROGRAMAS_SISTEMA_SEGUROS:
        if seguro in t_low:
            return None

    # 2. Comprobar si coincide con alguno de los sitios o programas permitidos
    for permitido in modo_foco_permitidos:
        if permitido and permitido in t_low:
            return None

    # 3. Ventana no permitida
    try:
        if SISTEMA_OPERATIVO == "Windows":
            import ctypes
            user32 = ctypes.windll.user32
            # SW_MINIMIZE = 6
            user32.ShowWindow(hwnd, 6)
    except Exception:
        pass

    ahora = time.time()
    if ahora - ultimo_aviso_foco > 4.0:
        ultimo_aviso_foco = ahora
        alerta_foco_pendiente = f"Ventana minimizada: {titulo_ventana}"
        print(f"  [🎯 MODO FOCO] Ventana no autorizada minimizada: \"{titulo_ventana}\"", flush=True)
        mostrar_aviso_modo_foco(titulo_ventana, modo_foco_nombre)

    return f"Minimizada por Modo Foco: {titulo_ventana}"

def capturar_foto_evidencia(busqueda, es_desubicada=False):
    """
    Toma una fotografía silenciosa con la cámara web del alumno (si cuenta con cámara)
    y estampa la fecha, hora, máquina y la búsqueda detectada.
    Guarda la imagen en DIR_EVIDENCIAS y almacena una versión en base64 para el docente.
    """
    global ultima_foto_base64
    try:
        import cv2
        import base64

        os.makedirs(DIR_EVIDENCIAS, exist_ok=True)

        cap = cv2.VideoCapture(0)
        if not cap or not cap.isOpened():
            return None

        ret = False
        frame = None
        for _ in range(2):
            ret, frame = cap.read()
        cap.release()

        if not ret or frame is None:
            return None

        h, w = frame.shape[:2]

        # Franja oscura inferior para texto informativo
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, max(0, h - 60)), (w, h), (15, 23, 42), -1)
        cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)

        ts_str = time.strftime("%d/%m/%Y %H:%M:%S")
        num_str = f"PC {NUMERO_MAQUINA}" if NUMERO_MAQUINA else HOSTNAME
        etiqueta = " [FALTA DESUBICADA]" if es_desubicada else ""
        txt1 = f"{num_str} | {ts_str}{etiqueta}"
        txt2 = f"Busqueda: {busqueda[:40]}"

        color_txt1 = (0, 0, 255) if es_desubicada else (255, 255, 255)
        cv2.putText(frame, txt1, (12, max(20, h - 36)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color_txt1, 1, cv2.LINE_AA)
        cv2.putText(frame, txt2, (12, max(36, h - 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 215, 255), 1, cv2.LINE_AA)

        # Guardar archivo local
        prefijo = "desubicada" if es_desubicada else "busqueda"
        nombre_limpio = "".join(c for c in busqueda[:25] if c.isalnum() or c in (" ", "_", "-")).strip().replace(" ", "_")
        filename = f"{prefijo}_{time.strftime('%Y%m%d_%H%M%S')}_{num_str.replace(' ', '_')}_{nombre_limpio}.jpg"
        filepath = os.path.join(DIR_EVIDENCIAS, filename)
        cv2.imwrite(filepath, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        print(f"  📸 Evidencia fotográfica guardada en: {filepath}", flush=True)

        # Generar thumbnail en base64 para transmitir al panel del docente
        ratio = 240.0 / w
        thumb = cv2.resize(frame, (240, int(h * ratio)), interpolation=cv2.INTER_AREA)
        _, buffer = cv2.imencode('.jpg', thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
        ultima_foto_base64 = base64.b64encode(buffer).decode('utf-8')
        return ultima_foto_base64
    except Exception as e:
        print(f"  [!] No se pudo capturar foto de evidencia: {e}", flush=True)
        return None

def mostrar_advertencia_busqueda(busqueda, es_desubicada=False):
    """Muestra la advertencia visual oficial con la imagen del robot Paulo Freire cuando el alumno intenta buscar en Google."""
    # Disparar captura fotográfica de evidencia en segundo plano
    threading.Thread(target=capturar_foto_evidencia, args=(busqueda, es_desubicada), daemon=True).start()

    if not tk_root:
        tipo = "🚫 BÚSQUEDA DESUBICADA" if es_desubicada else "🚫 BÚSQUEDA NO PERMITIDA"
        print(f"\n  {tipo}: {busqueda}\n", flush=True)
        return

    def _popup_alerta():
        try:
            if SISTEMA_OPERATIVO == "Windows":
                import winsound
                winsound.MessageBeep(winsound.MB_ICONHAND)
            else:
                print("\a")
        except Exception:
            pass

        pop = tk.Toplevel(tk_root)
        registrar_ventana_emergente(pop)
        titulo_win = "🚨 Búsqueda Inapropiada · Colegio Paulo Freire" if es_desubicada else "🚫 Búsqueda No Permitida · Colegio Paulo Freire"
        pop.title(titulo_win)
        pop.configure(bg="#0B132B")
        pop.attributes("-topmost", True)
        pop.resizable(False, False)

        # Ruta de la imagen oficial del robot con el cartel de prohibido búsqueda
        ruta_img = os.path.join(DIR_BASE, "prohibido_busqueda.jpg")
        img_cargada = False

        if os.path.exists(ruta_img):
            try:
                from PIL import Image, ImageTk
                im = Image.open(ruta_img)
                # Escalar proporcionalmente a 480x400
                im_resized = im.resize((480, 400), Image.Resampling.LANCZOS)
                foto = ImageTk.PhotoImage(im_resized)

                frame_img = tk.Frame(pop, bg="#0B132B")
                frame_img.pack(padx=10, pady=(10, 4))

                lbl_img = tk.Label(frame_img, image=foto, bg="#0B132B", cursor="hand2")
                lbl_img.image = foto  # Mantener referencia viva
                lbl_img.pack()
                lbl_img.bind("<Button-1>", lambda e: pop.destroy())
                img_cargada = True
            except Exception as ex_img:
                print(f"  [!] No se pudo cargar imagen prohibido_busqueda.jpg: {ex_img}", flush=True)

        if not img_cargada:
            # Fallback en caso de no poder cargar la imagen
            bg_col = "#5C0000" if es_desubicada else "#450A0A"
            frame_fallback = tk.Frame(pop, bg=bg_col, padx=22, pady=20)
            frame_fallback.pack(fill="both", expand=True)
            txt_head = "🚨 BÚSQUEDA INAPROPIADA DETECTADA" if es_desubicada else "🚫 BÚSQUEDA EN INTERNET NO PERMITIDA"
            lbl_head = tk.Label(frame_fallback, text=txt_head, font=("Arial", 15, "bold"), bg=bg_col, fg="#FCA5A5")
            lbl_head.pack(anchor="w", pady=(0, 10))
            txt_exp = "El término buscado no está permitido en el colegio.\nSe notificó al profesor de tu búsqueda." if es_desubicada else "En esta clase no está permitido realizar búsquedas en Google.\nSe cerró la pestaña y se notificó al profesor."
            lbl_txt = tk.Label(frame_fallback, text=txt_exp, font=("Arial", 12), bg=bg_col, fg="#FEF2F2", wraplength=470, justify="left")
            lbl_txt.pack(anchor="w", pady=(0, 12))

        # Franja inferior con la búsqueda detectada y botón entendido (Opción A: Informativo, sin bloqueo total)
        frame_bottom = tk.Frame(pop, bg="#0B132B", padx=14, pady=8)
        frame_bottom.pack(fill="x", expand=True)

        texto_query = f'🚨 Búsqueda inapropiada: "{busqueda}"' if es_desubicada else f'Búsqueda detectada: "{busqueda}"'
        bg_badge = "#7F1D1D" if es_desubicada else "#1E293B"

        lbl_query = tk.Label(
            frame_bottom,
            text=texto_query,
            font=("Arial", 11, "bold"),
            bg=bg_badge,
            fg="#FDE047",
            padx=10,
            pady=6,
            wraplength=340,
            justify="left"
        )
        lbl_query.pack(side="left", fill="x", expand=True, padx=(0, 8))

        btn = tk.Button(
            frame_bottom,
            text="Entendido ✓",
            font=("Arial", 11, "bold"),
            bg="#10B981",
            fg="#FFFFFF",
            activebackground="#059669",
            relief="flat",
            padx=14,
            pady=6,
            cursor="hand2",
            command=pop.destroy
        )
        btn.pack(side="right")

        pop.bind("<Escape>", lambda e: pop.destroy())
        pop.bind("<Return>", lambda e: pop.destroy())

        pop.update_idletasks()
        ancho = pop.winfo_width()
        alto = pop.winfo_height()
        x = max(0, (pop.winfo_screenwidth() // 2) - (ancho // 2))
        y = max(0, (pop.winfo_screenheight() // 2) - (alto // 2))
        pop.geometry(f"{ancho}x{alto}+{x}+{y}")

    try:
        tk_root.after(0, _popup_alerta)
    except Exception as e:
        print(f"  🚫 BÚSQUEDA NO PERMITIDA: {busqueda} ({e})", flush=True)

# ══════════════════════════════════════════════════════════════
# CONTROL DE VOLUMEN (50% REGLA DE LA SALA, 25%, 0%)
# ══════════════════════════════════════════════════════════════

def fijar_volumen(nivel=50):
    """Ajusta el volumen maestro del sistema al porcentaje exacto indicado (ej: 50%)."""
    try:
        nivel_int = max(0, min(100, int(nivel)))
        print(f"  [🔊] Ajustando volumen del equipo al {nivel_int}%...", flush=True)
        if SISTEMA_OPERATIVO == "Windows":
            import ctypes
            user32 = ctypes.windll.user32
            VK_VOLUME_DOWN = 0xAE
            VK_VOLUME_UP = 0xAF
            KEYEVENTF_KEYUP = 0x0002

            for _ in range(50):
                user32.keybd_event(VK_VOLUME_DOWN, 0, 0, 0)
                user32.keybd_event(VK_VOLUME_DOWN, 0, KEYEVENTF_KEYUP, 0)

            pasos_subir = int(round(nivel_int / 2.0))
            for _ in range(pasos_subir):
                user32.keybd_event(VK_VOLUME_UP, 0, 0, 0)
                user32.keybd_event(VK_VOLUME_UP, 0, KEYEVENTF_KEYUP, 0)
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "0"], capture_output=True)
            subprocess.run(["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{nivel_int}%"], capture_output=True)
            subprocess.run(["amixer", "set", "Master", "unmute"], capture_output=True)
            subprocess.run(["amixer", "set", "Master", f"{nivel_int}%"], capture_output=True)
    except Exception as e:
        print(f"  [!] Error ajustando volumen a {nivel}%: {e}", flush=True)

def silenciar_audio():
    """Silencia el volumen del equipo (0%)."""
    fijar_volumen(0)

# ══════════════════════════════════════════════════════════════
# MONITOREO DE VENTANA ACTIVA Y DETECTOR DE BÚSQUEDAS EN GOOGLE
# ══════════════════════════════════════════════════════════════

PATRON_BUSQUEDA = re.compile(
    r'^(.+?)\s*[-–—|]\s*(?:Buscar con Google|Búsqueda de Google|Google Search|Bing|Microsoft Bing|Yahoo Search|DuckDuckGo)',
    re.IGNORECASE
)

def extraer_busqueda_prohibida(titulo):
    """Si el título de una ventana corresponde a una búsqueda en Google/Bing/etc., devuelve lo que buscó."""
    if not titulo:
        return None
    t = titulo.strip()
    m = PATRON_BUSQUEDA.search(t)
    if m:
        query = m.group(1).strip()
        if query:
            return query
    t_low = t.lower()
    for sufijo in ("google - google chrome", "google - microsoft edge", "google — mozilla firefox", "google - brave", "google - opera"):
        if t_low == sufijo or t_low.startswith("google - microsoft​ edge"):
            return "(Abrió la página principal de Google)"
    return None

def limpiar_titulo_ventana(titulo):
    """Limpia caracteres invisibles y acorta títulos largos para mostrar en la tarjeta del docente."""
    if not titulo:
        return "Escritorio / Sin ventana activa"
    limpio = re.sub(r'[\u200b-\u200f\u202a-\u202e]', '', titulo).strip()
    if not limpio:
        return "Escritorio / Sin ventana activa"
    if len(limpio) > 68:
        limpio = limpio[:65] + "..."
    return limpio

def cerrar_pestana_activa_windows():
    """Envía Ctrl+W a la ventana activa del navegador para cerrar la búsqueda no permitida."""
    if SISTEMA_OPERATIVO != "Windows":
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32
        VK_CONTROL = 0x11
        VK_W = 0x57
        KEYEVENTF_KEYUP = 0x0002
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(VK_W, 0, 0, 0)
        time.sleep(0.04)
        user32.keybd_event(VK_W, 0, KEYEVENTF_KEYUP, 0)
        user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
    except Exception:
        pass

def obtener_ventana_activa_y_busqueda():
    """
    Obtiene el título de la ventana que el alumno está mirando en vivo y
    detecta si realizó alguna búsqueda en Google.
    """
    global ultima_busqueda_alertada, ultimo_tiempo_alerta
    ventana_activa = "Escritorio / Sin ventana activa"
    busqueda_detectada = None
    busqueda_en_primer_plano = False

    if SISTEMA_OPERATIVO == "Windows":
        try:
            import ctypes
            from ctypes import wintypes
            user32 = ctypes.windll.user32

            hwnd_fg = user32.GetForegroundWindow()
            if hwnd_fg:
                length = user32.GetWindowTextLengthW(hwnd_fg)
                if length > 0:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd_fg, buf, length + 1)
                    titulo_fg = buf.value
                    ventana_activa = limpiar_titulo_ventana(titulo_fg)
                    # Comprobar si Modo Foco (Lista Blanca) está activo
                    verificar_modo_foco(titulo_fg, hwnd_fg)
                    q = extraer_busqueda_prohibida(titulo_fg)
                    if q:
                        busqueda_detectada = q
                        busqueda_en_primer_plano = True

            if not busqueda_detectada:
                encontradas = []
                WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
                def _enum_cb(hwnd, lParam):
                    if user32.IsWindowVisible(hwnd):
                        l = user32.GetWindowTextLengthW(hwnd)
                        if l > 0:
                            b = ctypes.create_unicode_buffer(l + 1)
                            user32.GetWindowTextW(hwnd, b, l + 1)
                            q_win = extraer_busqueda_prohibida(b.value)
                            if q_win:
                                encontradas.append(q_win)
                                return False
                    return True
                cb_func = WNDENUMPROC(_enum_cb)
                user32.EnumWindows(cb_func, 0)
                if encontradas:
                    busqueda_detectada = encontradas[0]
        except Exception:
            pass

    alerta_para_enviar = None
    alerta_es_grave = False
    alerta_palabra_detectada = ""

    if busqueda_detectada:
        es_grave, palabra_clave = es_busqueda_desubicada(busqueda_detectada)
        # Se bloquea si es desubicada (SIEMPRE, incluso si Google está habilitado en clase)
        # o si la vigilancia general de Google está activa
        debe_bloquear = es_grave or vigilancia_google_activa
        if debe_bloquear:
            ahora = time.time()
            if busqueda_en_primer_plano:
                cerrar_pestana_activa_windows()

            if busqueda_detectada != ultima_busqueda_alertada or (ahora - ultimo_tiempo_alerta) > 10.0:
                ultima_busqueda_alertada = busqueda_detectada
                ultimo_tiempo_alerta = ahora
                alerta_para_enviar = busqueda_detectada
                alerta_es_grave = es_grave
                alerta_palabra_detectada = palabra_clave or ""
                tipo_str = "DESUBICADA (FALTA GRAVE)" if es_grave else "BÚSQUEDA NO PERMITIDA"
                print(f"  [ALERTA - {tipo_str}] '{busqueda_detectada}' (Término: {palabra_clave})", flush=True)
                mostrar_advertencia_busqueda(busqueda_detectada, es_desubicada=es_grave)

    return ventana_activa, alerta_para_enviar, alerta_es_grave, alerta_palabra_detectada

# ══════════════════════════════════════════════════════════════
# LANZADOR DE JUEGOS OFFLINE (SURF EN EDGE Y DINO EN CHROME)
# ══════════════════════════════════════════════════════════════

def buscar_ejecutable_navegador(nombre_exe):
    """Busca la ruta real de msedge.exe o chrome.exe en Windows (App Paths y Program Files)."""
    p = shutil.which(nombre_exe)
    if p and os.path.exists(p):
        return p
    if SISTEMA_OPERATIVO == "Windows":
        try:
            import winreg
            for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
                try:
                    with winreg.OpenKey(root, rf"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\{nombre_exe}") as k:
                        val, _ = winreg.QueryValueEx(k, "")
                        if val and os.path.exists(val):
                            return val
                except Exception:
                    pass
        except Exception:
            pass

        rutas_comunes = []
        if nombre_exe.lower() == "msedge.exe":
            rutas_comunes = [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
            ]
        elif nombre_exe.lower() == "chrome.exe":
            rutas_comunes = [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            ]
        for r in rutas_comunes:
            if os.path.exists(r):
                return r
    return None

def _navegar_url_interna_windows(exe_path, url_interna, palabra_ventana):
    """
    Abre el navegador en una ventana nueva visible y navega a una URL interna (edge://surf o chrome://dino)
    pegándola en la barra de direcciones (ya que Chromium bloquea URLs edge:// y chrome:// por línea de comandos).
    """
    try:
        import ctypes
        user32 = ctypes.windll.user32

        # 1. Copiar la dirección (edge://surf o chrome://dino) al portapapeles de Windows
        flags_clip = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        p_clip = subprocess.Popen(["clip"], stdin=subprocess.PIPE, creationflags=flags_clip)
        p_clip.communicate(input=url_interna.encode("ascii"))

        # 2. Abrir ventana nueva del navegador forzando SW_SHOWNORMAL (1) para que sea visible
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 1  # SW_SHOWNORMAL
        subprocess.Popen([exe_path, "--new-window", "about:blank"], startupinfo=si)

        # 3. Esperar a que la ventana del navegador esté activa en primer plano
        for _ in range(25):
            time.sleep(0.15)
            hwnd = user32.GetForegroundWindow()
            if hwnd:
                l = user32.GetWindowTextLengthW(hwnd)
                if l > 0:
                    buf = ctypes.create_unicode_buffer(l + 1)
                    user32.GetWindowTextW(hwnd, buf, l + 1)
                    t_low = buf.value.lower()
                    if palabra_ventana in t_low or "blank" in t_low or "pestaña" in t_low or "tab" in t_low:
                        break

        time.sleep(0.35)

        # 4. Enviar Ctrl+L (foco en barra de direcciones), Ctrl+V (pegar edge://surf o chrome://dino) y Enter
        VK_CONTROL = 0x11
        VK_L = 0x4C
        VK_V = 0x56
        VK_RETURN = 0x0D
        KEYEVENTF_KEYUP = 0x0002

        # Ctrl + L
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(VK_L, 0, 0, 0)
        time.sleep(0.05)
        user32.keybd_event(VK_L, 0, KEYEVENTF_KEYUP, 0)
        user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
        time.sleep(0.12)

        # Ctrl + V
        user32.keybd_event(VK_CONTROL, 0, 0, 0)
        user32.keybd_event(VK_V, 0, 0, 0)
        time.sleep(0.05)
        user32.keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0)
        user32.keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0)
        time.sleep(0.10)

        # Enter
        user32.keybd_event(VK_RETURN, 0, 0, 0)
        time.sleep(0.05)
        user32.keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0)
        print(f"  [🎮] Juego offline iniciado: {url_interna}", flush=True)
    except Exception as e:
        print(f"  [!] Error navegando a {url_interna}: {e}", flush=True)

def lanzar_juego_offline(juego):
    """Lanza los juegos offline integrados en los navegadores (100% sin necesidad de internet)."""
    ocultar_pantalla_bloqueo()
    try:
        if SISTEMA_OPERATIVO == "Windows":
            if juego == "surf":
                edge_exe = buscar_ejecutable_navegador("msedge.exe")
                if edge_exe:
                    threading.Thread(
                        target=_navegar_url_interna_windows,
                        args=(edge_exe, "edge://surf", "edge"),
                        daemon=True
                    ).start()
                else:
                    print("  [!] No se encontró Microsoft Edge instalado.", flush=True)
            elif juego == "dino":
                chrome_exe = buscar_ejecutable_navegador("chrome.exe")
                if chrome_exe:
                    threading.Thread(
                        target=_navegar_url_interna_windows,
                        args=(chrome_exe, "chrome://dino", "chrome"),
                        daemon=True
                    ).start()
                else:
                    # Si no tiene Chrome instalado, abrir Surf en Edge como respaldo
                    edge_exe = buscar_ejecutable_navegador("msedge.exe")
                    if edge_exe:
                        threading.Thread(
                            target=_navegar_url_interna_windows,
                            args=(edge_exe, "edge://surf", "edge"),
                            daemon=True
                        ).start()
        else:
            if juego == "surf":
                subprocess.Popen(["microsoft-edge", "edge://surf"])
            elif juego == "dino":
                subprocess.Popen(["google-chrome", "chrome://dino"])
    except Exception as e:
        print(f"  [!] Error lanzando juego offline: {e}", flush=True)

def abrir_enlace_web(url):
    """Abre un sitio web asegurando que la ventana del navegador sea visible en primer plano."""
    ocultar_pantalla_bloqueo()
    try:
        if SISTEMA_OPERATIVO == "Windows":
            os.startfile(url)
        else:
            webbrowser.open(url)
    except Exception:
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"  [!] Error abriendo URL {url}: {e}", flush=True)

def apagar_equipo():
    """Apaga la máquina de forma segura al finalizar la clase mostrando aviso."""
    print("  [⚡] Apagado solicitado por el docente al finalizar la clase...", flush=True)
    mostrar_aviso_cierre_clase(
        mensaje="👋 ¡Clase de Robótica Finalizada!\nApagando el equipo... ¡Excelente trabajo hoy!",
        duracion_segundos=10
    )
    try:
        if SISTEMA_OPERATIVO == "Windows":
            subprocess.run(["shutdown", "/s", "/t", "10", "/c", "Fin del taller de robótica - Colegio Paulo Freire"])
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["shutdown", "-h", "now"])
    except Exception as e:
        print(f"  [!] Error apagando: {e}", flush=True)

def reiniciar_equipo():
    """Reinicia la máquina de forma segura para cambio de grupo mostrando aviso."""
    print("  [🔄] Reinicio solicitado por el docente para cambio de turno...", flush=True)
    mostrar_aviso_cierre_clase(
        mensaje="🔄 Cambiando de grupo...\nReiniciando equipo para la próxima clase.",
        duracion_segundos=10
    )
    try:
        if SISTEMA_OPERATIVO == "Windows":
            subprocess.run(["shutdown", "/r", "/t", "10", "/c", "Cambio de grupo - Taller de Robótica Paulo Freire"])
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["reboot"])
    except Exception as e:
        print(f"  [!] Error reiniciando: {e}", flush=True)

# ══════════════════════════════════════════════════════════════
# COMUNICACIÓN EN TIEMPO REAL CON EL DOCENTE
# ══════════════════════════════════════════════════════════════

def ejecutar_comando(cmd):
    global vigilancia_google_activa, modo_foco_activo, modo_foco_nombre, modo_foco_permitidos
    action = cmd.get("action")
    params = cmd.get("params", {})
    print(f"  [>] Ejecutando comando del docente: {action}", flush=True)

    if action == "lock":
        mostrar_pantalla_bloqueo()
    elif action == "unlock":
        ocultar_pantalla_bloqueo()
    elif action == "open_url":
        url = params.get("url")
        if url:
            abrir_enlace_web(url)
    elif action == "message":
        texto = params.get("texto", "")
        if texto:
            mostrar_mensaje_emergente(texto)
    elif action == "mute":
        silenciar_audio()
    elif action == "set_volume":
        nivel = params.get("level", 50)
        fijar_volumen(nivel)
    elif action == "set_google_guard":
        vigilancia_google_activa = bool(params.get("enabled", True))
        estado_str = "ACTIVADO" if vigilancia_google_activa else "DESACTIVADO"
        print(f"  [🛡️] Detector de búsquedas en Google: {estado_str}", flush=True)
    elif action == "set_focus_mode":
        modo_foco_activo = bool(params.get("activo", False))
        modo_foco_nombre = params.get("nombre", "Sitios permitidos")
        modo_foco_permitidos = [str(x).strip().lower() for x in params.get("permitidos", []) if str(x).strip()]
        print(f"  [🎯 MODO FOCO RECIBIDO] {'ACTIVADO' if modo_foco_activo else 'DESACTIVADO'}: {modo_foco_nombre} -> {modo_foco_permitidos}", flush=True)
    elif action == "set_number":
        nuevo_num = params.get("number")
        if nuevo_num is not None:
            guardar_numero_local(nuevo_num)
    elif action == "launch_game":
        juego = params.get("game", "surf")
        lanzar_juego_offline(juego)
    elif action == "shutdown":
        apagar_equipo()
    elif action == "reboot":
        reiniciar_equipo()

def ciclo_comunicacion():
    """Hilo de red resiliente con guardián Fail-Safe (auto-desbloqueo a los 5s) y detector de reapertura de tapa."""
    global servidor_docente_url, bloqueado, vigilancia_google_activa
    global ultimo_contacto_exitoso, ultima_ip_docente_valida
    conectado_previamente = False
    ultimo_loop_time = time.time()
    ultimo_contacto_exitoso = time.time()

    while True:
        ahora = time.time()

        # ── 1. DETECTOR DE SUSPENSIÓN / REAPERTURA DE TAPA ──
        salto_tiempo = ahora - ultimo_loop_time
        if salto_tiempo > 3.0:
            # Si el bucle tardó más de 3 segundos (cuando el sleep es de 1s),
            # la laptop estuvo con la tapa cerrada / suspendida en modo sleep.
            print(f"  [⚡ WAKE-UP] Reapertura de tapa o suspensión detectada ({salto_tiempo:.1f}s).", flush=True)
            print("  [🛡️ FAIL-SAFE] Desbloqueando pantalla y liberando PC automáticamente...", flush=True)
            limpiar_todos_los_bloqueos_y_carteles()
            ultimo_contacto_exitoso = ahora  # Dar ventana de gracia para reconectar
            time.sleep(1.5)
            ahora = time.time()

        ultimo_loop_time = ahora

        # ── 2. FAIL-SAFE POR PÉRDIDA DE SEÑAL (> 5 SEGUNDOS) ──
        # Si pasaron más de 5 segundos sin poder comunicarse con el docente,
        # NUNCA dejar la máquina bloqueada ni con carteles. Liberar inmediatamente todo.
        tiempo_sin_docente = ahora - ultimo_contacto_exitoso
        if tiempo_sin_docente >= 5.0 and (bloqueado or ventana_bloqueo):
            print(f"  [🛡️ FAIL-SAFE] Sin señal del docente por {tiempo_sin_docente:.1f}s. Liberando pantalla automáticamente.", flush=True)
            limpiar_todos_los_bloqueos_y_carteles()

        try:
            if SISTEMA_OPERATIVO == 'Windows':
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
        except Exception:
            pass

        # ── 3. RESOLVER SERVIDOR DOCENTE RESILIENTE ──
        if not servidor_docente_url:
            conectado_previamente = False
            servidor_docente_url = descubrir_servidor()
            if not servidor_docente_url:
                time.sleep(1.0)
                continue

        # ── 4. PING & POLL AL DOCENTE ──
        try:
            ventana_activa, alerta_google, alerta_grave, alerta_palabra = obtener_ventana_activa_y_busqueda()

            ping_payload = {
                "id": MACHINE_ID,
                "hostname": HOSTNAME,
                "number": NUMERO_MAQUINA,
                "os": SISTEMA_OPERATIVO,
                "locked": bloqueado,
                "active_window": ventana_activa
            }
            if alerta_google:
                ping_payload["google_alert"] = alerta_google
                ping_payload["google_alert_grave"] = alerta_grave
                ping_payload["google_alert_palabra"] = alerta_palabra
                if ultima_foto_base64:
                    ping_payload["google_alert_foto"] = ultima_foto_base64
                    ultima_foto_base64 = ""
            if alerta_foco_pendiente:
                ping_payload["focus_alert"] = alerta_foco_pendiente
                alerta_foco_pendiente = ""

            ping_data = json.dumps(ping_payload).encode("utf-8")

            req_ping = urllib.request.Request(
                f"{servidor_docente_url}/api/ping",
                data=ping_data,
                headers={"Content-Type": "application/json", "Connection": "close"}
            )
            with urllib.request.urlopen(req_ping, timeout=3.0) as resp:
                raw_ping = resp.read().decode("utf-8")
                if raw_ping:
                    try:
                        resp_ping = json.loads(raw_ping)
                        if "vigilancia_google" in resp_ping:
                            vigilancia_google_activa = bool(resp_ping["vigilancia_google"])
                        if "modo_foco" in resp_ping and isinstance(resp_ping["modo_foco"], dict):
                            mf_data = resp_ping["modo_foco"]
                            modo_foco_activo = bool(mf_data.get("activo", False))
                            if "nombre" in mf_data:
                                modo_foco_nombre = mf_data["nombre"]
                            if "permitidos" in mf_data and isinstance(mf_data["permitidos"], list):
                                modo_foco_permitidos = [str(x).strip().lower() for x in mf_data["permitidos"] if str(x).strip()]
                        if "palabras_prohibidas" in resp_ping and isinstance(resp_ping["palabras_prohibidas"], list):
                            _sincronizar_palabras_desde_docente(resp_ping["palabras_prohibidas"])
                        if "force_lock" in resp_ping:
                            debe_bloquear = bool(resp_ping["force_lock"])
                            if debe_bloquear and not bloqueado:
                                print("  [🔒] Restaurando bloqueo ordenado por el docente tras reconectar Wi-Fi.", flush=True)
                                mostrar_pantalla_bloqueo()
                            elif not debe_bloquear and bloqueado:
                                print("  [🔓] Desbloqueando máquina según estado del docente.", flush=True)
                                ocultar_pantalla_bloqueo()
                    except Exception:
                        pass

            # Contacto exitoso con el docente
            ultimo_contacto_exitoso = time.time()
            ultima_ip_docente_valida = servidor_docente_url

            if not conectado_previamente:
                print(f"  [OK] ¡Conectado exitosamente con el docente! ({servidor_docente_url})", flush=True)
                print(f"  [OK] Esta PC es: PC {NUMERO_MAQUINA if NUMERO_MAQUINA else '(sin número asignado)'}", flush=True)
                conectado_previamente = True

            url_poll = f"{servidor_docente_url}/api/poll?id={urllib.parse.quote(MACHINE_ID)}"
            req_poll = urllib.request.Request(
                url_poll,
                headers={"Connection": "close"}
            )
            with urllib.request.urlopen(req_poll, timeout=3.0) as resp:
                raw_poll = resp.read().decode("utf-8")
                data = json.loads(raw_poll) if raw_poll else {}
                comandos = data.get("comandos", [])
                for cmd in comandos:
                    ejecutar_comando(cmd)

        except urllib.error.URLError:
            ahora_err = time.time()
            if conectado_previamente and (ahora_err - ultimo_contacto_exitoso) > 3.0:
                print("  [!] Señal con el docente en pausa. Reintentando...", flush=True)
            # Solo descartar URL si pasaron más de 8 segundos sin respuesta, para no reiniciar escaneo ante un hipo de red
            if (ahora_err - ultimo_contacto_exitoso) > 8.0:
                servidor_docente_url = None
        except Exception as e:
            print(f"  [!] Aviso de comunicación: {e}", flush=True)

        time.sleep(1.0)

def mantener_equipo_despierto():
    """Evita que Windows active el protector de pantalla, apague el Wi-Fi o suspenda el equipo (incluso al cerrar la tapa)."""
    if platform.system() != "Windows":
        return
    try:
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
    except Exception:
        pass
    try:
        flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        comandos = [
            ["powercfg", "/setacvalueindex", "SCHEME_CURRENT", "SUB_BUTTONS", "LIDACTION", "0"],
            ["powercfg", "/setdcvalueindex", "SCHEME_CURRENT", "SUB_BUTTONS", "LIDACTION", "0"],
            ["powercfg", "/change", "standby-timeout-ac", "0"],
            ["powercfg", "/change", "standby-timeout-dc", "0"],
            ["powercfg", "/setactive", "SCHEME_CURRENT"],
        ]
        for cmd in comandos:
            subprocess.run(cmd, capture_output=True, creationflags=flags)
    except Exception:
        pass

def main():
    global tk_root, servidor_docente_url
    mantener_equipo_despierto()

    if SISTEMA_OPERATIVO == "Windows" and not MODO_OCULTO and not MODO_VISIBLE_FORZADO:
        print("=" * 60, flush=True)
        print("  COLEGIO PAULO FREIRE — AGENTE DE ALUMNO", flush=True)
        print("=" * 60, flush=True)
        print(f"  Equipo:    {HOSTNAME} ({SISTEMA_OPERATIVO})", flush=True)
        print(f"  Número:    PC {NUMERO_MAQUINA if NUMERO_MAQUINA else '(Automático)'}", flush=True)
        print("=" * 60, flush=True)
        servidor_docente_url = descubrir_servidor()
        pid_bg = lanzar_en_segundo_plano_windows()
        print(f"\n  [OK] ¡Agente activado en MODO INVISIBLE (PID {pid_bg})!", flush=True)
        print("  [i] Esta ventana se cerrará sola en 2 segundos para que no se vea...", flush=True)
        time.sleep(1.8)
        ocultar_consola_windows()
        sys.exit(0)

    if MODO_OCULTO:
        guardar_pid_actual()
        ocultar_consola_windows()

    tk_disponible = False
    try:
        if TKINTER_OK and tk is not None:
            tk_root = tk.Tk()
            tk_root.withdraw()
            tk_disponible = True
    except Exception as e:
        print(f"  [!] Tkinter no disponible ({e}). Operando en modo consola.", flush=True)
        tk_root = None

    t = threading.Thread(target=ciclo_comunicacion, daemon=True)
    t.start()

    try:
        if tk_disponible and tk_root:
            tk_root.mainloop()
        else:
            while True:
                time.sleep(1.0)
    except KeyboardInterrupt:
        print("\n  Agente detenido por el usuario.", flush=True)
    except Exception as e:
        print(f"\n  [!] Excepción en bucle de interfaz: {e}", flush=True)
        while True:
            time.sleep(1.0)

if __name__ == "__main__":
    main()
