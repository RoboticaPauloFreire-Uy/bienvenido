# -*- coding: utf-8 -*-
"""
CLIENTE_ALUMNO.PY — AGENTE DE MÁQUINA DE ALUMNO (PYTHON PURO)
Colegio Paulo Freire · Taller de Robótica & Informática

Se ejecuta en cada computadora de los alumnos.
Descubre automáticamente la IP del docente por:
  1. Archivo local de configuración servidor_ip.txt
  2. Faro UDP broadcast (puerto 5005)
  3. Escaneo ultra-rápido multi-hilo de la subred local (puerto 5000)
  4. Entrada manual como respaldo
Ejecuta bloqueo de pantalla (Modo Atención), control de volumen (50%),
detección de búsquedas no permitidas en Google, reporte de ventana activa en vivo,
apertura de proyectos web, avisos y juegos offline.
"""

import os
import sys
import time
import json
import re
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

# GUI con Tkinter nativo (modo seguro ante instalaciones mínimas de Python)
TKINTER_OK = False
tk_root = None
try:
    import tkinter as tk
    TKINTER_OK = True
except Exception as e:
    tk = None
    TKINTER_OK = False

PUERTO_UDP = 5005
PUERTO_WEB_DEFECTO = 5000

# Identificación de la máquina
HOSTNAME = socket.gethostname()
SISTEMA_OPERATIVO = platform.system()
MACHINE_ID = f"{HOSTNAME}_{platform.node()}"

def cargar_numero_local():
    """Lee el número asignado a esta máquina desde numero_maquina.txt o del hostname."""
    archivo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "numero_maquina.txt")
    if os.path.exists(archivo):
        try:
            with open(archivo, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val:
                    return val
        except Exception:
            pass
    # Buscar si el nombre del equipo ya tiene número (ej: PC04 -> 4, ALUMNO-2 -> 2)
    match = re.search(r'\d+', HOSTNAME)
    if match:
        return str(int(match.group()))
    return ""

def guardar_numero_local(num):
    """Guarda el número de máquina asignado permanentemente en el disco."""
    global NUMERO_MAQUINA
    try:
        NUMERO_MAQUINA = str(num).strip()
        archivo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "numero_maquina.txt")
        with open(archivo, "w", encoding="utf-8") as f:
            f.write(NUMERO_MAQUINA)
        print(f"  [+] Esta máquina ahora está identificada como: PC {NUMERO_MAQUINA}", flush=True)
    except Exception as e:
        print(f"  [!] Error guardando número de máquina: {e}", flush=True)

NUMERO_MAQUINA = cargar_numero_local()

# Estado local
servidor_docente_url = None
bloqueado = False
ventana_bloqueo = None
vigilancia_google_activa = True
ultima_busqueda_alertada = ""
ultimo_tiempo_alerta = 0.0

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
    """Descubre automáticamente la IP del docente con 4 capas de respaldo."""
    archivo_cfg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "servidor_ip.txt")

    # 1. Probar archivo de configuración si existe
    if os.path.exists(archivo_cfg):
        try:
            with open(archivo_cfg, "r", encoding="utf-8") as f:
                linea = f.read().strip()
                if linea:
                    if not linea.startswith("http"):
                        linea = f"http://{linea}:{PUERTO_WEB_DEFECTO}"
                    if verificar_servidor_docente(linea):
                        print(f"  [+] Docente encontrado en configuración: {linea}", flush=True)
                        return linea
        except Exception:
            pass

    # 2. Escuchar faro UDP broadcast (2.0 segundos)
    print("  [?] Buscando al docente por anuncio de red...", flush=True)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            try: s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except Exception: pass
        s.bind(("", PUERTO_UDP))
        s.settimeout(2.0)
        data, addr = s.recvfrom(2048)
        info = json.loads(data.decode("utf-8"))
        if info.get("magic") == "FREIRE_AULA":
            ip = info.get("docente_ip", addr[0])
            puerto = info.get("puerto", PUERTO_WEB_DEFECTO)
            s.close()
            url = f"http://{ip}:{puerto}"
            print(f"  [+] ¡Docente detectado por faro en {url}!", flush=True)
            try:
                with open(archivo_cfg, "w", encoding="utf-8") as f: f.write(url)
            except Exception: pass
            return url
    except Exception:
        pass

    # 3. Escaneo multi-hilo ultra rápido de la subred local (192.168.x.1..254 en ~1.5 seg)
    prefijo_subred, mi_ip = obtener_mi_subred()
    print(f"  [?] Escaneando red local ({prefijo_subred}*)...", flush=True)

    encontrado = []
    def _test_ip(ip):
        if encontrado:
            return
        url = f"http://{ip}:{PUERTO_WEB_DEFECTO}"
        if verificar_servidor_docente(url):
            encontrado.append(url)

    ips_a_probar = [f"{prefijo_subred}{i}" for i in range(1, 255)]
    ips_a_probar.insert(0, "127.0.0.1")
    if mi_ip not in ips_a_probar:
        ips_a_probar.insert(0, mi_ip)

    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        list(executor.map(_test_ip, ips_a_probar))

    if encontrado:
        url = encontrado[0]
        print(f"  [+] ¡Docente detectado en la red: {url}!", flush=True)
        try:
            with open(archivo_cfg, "w", encoding="utf-8") as f: f.write(url)
        except Exception: pass
        return url

    # 4. Fallback si no fue encontrado
    print("  [!] No se pudo autodetectar la IP del docente. Reintentando en breve...", flush=True)
    return f"http://127.0.0.1:{PUERTO_WEB_DEFECTO}"

# ══════════════════════════════════════════════════════════════
# CONTROL DE PANTALLA Y VENTANAS (TKINTER NATIVO)
# ══════════════════════════════════════════════════════════════

def mostrar_pantalla_bloqueo():
    """Crea una pantalla completa en primer plano para el modo atención."""
    global ventana_bloqueo, bloqueado, tk_root
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
    if not bloqueado:
        return
    bloqueado = False

    if not tk_root:
        print("  [+] PANTALLA DESBLOQUEADA", flush=True)
        return

    def _cerrar():
        global ventana_bloqueo
        if ventana_bloqueo:
            try:
                ventana_bloqueo.destroy()
            except Exception:
                pass
            ventana_bloqueo = None

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

def mostrar_advertencia_busqueda(busqueda):
    """Muestra una advertencia inmediata en pantalla cuando el alumno intenta buscar en Google."""
    if not tk_root:
        print(f"\n  🚫 BÚSQUEDA NO PERMITIDA: {busqueda}\n", flush=True)
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
        pop.title("⚠️ Búsqueda No Permitida · Regla del Aula")
        pop.configure(bg="#450A0A")
        pop.attributes("-topmost", True)
        pop.geometry("520x310")
        pop.resizable(False, False)

        pop.update_idletasks()
        ancho = pop.winfo_width()
        alto = pop.winfo_height()
        x = (pop.winfo_screenwidth() // 2) - (ancho // 2)
        y = (pop.winfo_screenheight() // 2) - (alto // 2)
        pop.geometry(f"{ancho}x{alto}+{x}+{y}")

        frame = tk.Frame(pop, bg="#450A0A", padx=22, pady=20)
        frame.pack(fill="both", expand=True)

        lbl_head = tk.Label(
            frame,
            text="🚫 BÚSQUEDA EN GOOGLE NO PERMITIDA",
            font=("Arial", 15, "bold"),
            bg="#450A0A",
            fg="#FCA5A5"
        )
        lbl_head.pack(anchor="w", pady=(0, 10))

        lbl_txt = tk.Label(
            frame,
            text="En esta clase no está permitido realizar búsquedas en Google.\nSe cerró la pestaña y se notificó al profesor tu búsqueda:",
            font=("Arial", 12),
            bg="#450A0A",
            fg="#FEF2F2",
            wraplength=470,
            justify="left"
        )
        lbl_txt.pack(anchor="w", pady=(0, 12))

        caja_query = tk.Label(
            frame,
            text=f'"{busqueda}"',
            font=("Arial", 13, "bold"),
            bg="#7F1D1D",
            fg="#FDE047",
            padx=12,
            pady=8,
            wraplength=450,
            justify="center"
        )
        caja_query.pack(fill="x", pady=(0, 16))

        btn = tk.Button(
            frame,
            text="Entendido, volver a la actividad",
            font=("Arial", 11, "bold"),
            bg="#EF4444",
            fg="#FFF",
            activebackground="#DC2626",
            relief="flat",
            padx=18,
            pady=8,
            cursor="hand2",
            command=pop.destroy
        )
        btn.pack(anchor="e")

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
            VK_VOLUME_MUTE = 0xAD
            VK_VOLUME_DOWN = 0xAE
            VK_VOLUME_UP = 0xAF
            KEYEVENTF_KEYUP = 0x0002

            # Si el nivel es 0, bajamos todo el volumen a 0
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
    # También detectar si entraron a la portada de Google directamente para buscar
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

            # 1. Leer la ventana en primer plano (lo que el alumno está viendo ahora mismo)
            hwnd_fg = user32.GetForegroundWindow()
            if hwnd_fg:
                length = user32.GetWindowTextLengthW(hwnd_fg)
                if length > 0:
                    buf = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd_fg, buf, length + 1)
                    titulo_fg = buf.value
                    ventana_activa = limpiar_titulo_ventana(titulo_fg)
                    q = extraer_busqueda_prohibida(titulo_fg)
                    if q:
                        busqueda_detectada = q
                        busqueda_en_primer_plano = True

            # 2. Si no está en primer plano, revisar otras ventanas abiertas por si tiene Google abierto atrás
            if not busqueda_detectada and vigilancia_google_activa:
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
    if vigilancia_google_activa and busqueda_detectada:
        ahora = time.time()
        # Si la pestaña con la búsqueda está activa en primer plano, cerrarla con Ctrl+W
        if busqueda_en_primer_plano:
            cerrar_pestana_activa_windows()

        # Evitar enviar la misma alerta repetida en menos de 12 segundos
        if busqueda_detectada != ultima_busqueda_alertada or (ahora - ultimo_tiempo_alerta) > 12.0:
            ultima_busqueda_alertada = busqueda_detectada
            ultimo_tiempo_alerta = ahora
            alerta_para_enviar = busqueda_detectada
            print(f"  [ALERTA] Búsqueda en Google detectada y bloqueada: '{busqueda_detectada}'", flush=True)
            mostrar_advertencia_busqueda(busqueda_detectada)

    return ventana_activa, alerta_para_enviar

def lanzar_juego_offline(juego):
    """Lanza los juegos offline integrados en los navegadores (100% sin necesidad de internet)."""
    ocultar_pantalla_bloqueo()
    try:
        if juego == "surf":
            if SISTEMA_OPERATIVO == "Windows":
                subprocess.Popen(["cmd", "/c", "start", "msedge", "edge://surf"], shell=False)
            else:
                subprocess.Popen(["microsoft-edge", "edge://surf"])
        elif juego == "dino":
            if SISTEMA_OPERATIVO == "Windows":
                subprocess.Popen(["cmd", "/c", "start", "chrome", "chrome://dino"], shell=False)
            else:
                subprocess.Popen(["google-chrome", "chrome://dino"])
    except Exception as e:
        print(f"  [!] Error lanzando juego offline: {e}", flush=True)

def apagar_equipo():
    """Apaga la máquina de forma segura al finalizar la clase."""
    try:
        if SISTEMA_OPERATIVO == "Windows":
            subprocess.run(["shutdown", "/s", "/t", "10", "/c", "Fin del taller de robótica"])
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["shutdown", "-h", "now"])
    except Exception as e:
        print(f"  [!] Error apagando: {e}", flush=True)

# ══════════════════════════════════════════════════════════════
# COMUNICACIÓN EN TIEMPO REAL CON EL DOCENTE
# ══════════════════════════════════════════════════════════════

def ejecutar_comando(cmd):
    global vigilancia_google_activa
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
            ocultar_pantalla_bloqueo()
            webbrowser.open(url)
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
    elif action == "set_number":
        nuevo_num = params.get("number")
        if nuevo_num is not None:
            guardar_numero_local(nuevo_num)
    elif action == "launch_game":
        juego = params.get("game", "surf")
        lanzar_juego_offline(juego)
    elif action == "shutdown":
        apagar_equipo()

def ciclo_comunicacion():
    """Hilo de red que envía pings y consulta comandos periódicamente."""
    global servidor_docente_url, bloqueado, vigilancia_google_activa
    conectado_previamente = False

    while True:
        try:
            if SISTEMA_OPERATIVO == 'Windows':
                import ctypes
                ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
        except Exception:
            pass
        if not servidor_docente_url:
            conectado_previamente = False
            servidor_docente_url = descubrir_servidor()

        try:
            # Inspeccionar ventana activa y verificar si hay búsqueda no permitida en Google
            ventana_activa, alerta_google = obtener_ventana_activa_y_busqueda()

            # 1. Enviar Ping de presencia + ventana activa + alerta de búsqueda si hubo
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

            ping_data = json.dumps(ping_payload).encode("utf-8")

            req_ping = urllib.request.Request(
                f"{servidor_docente_url}/api/ping",
                data=ping_data,
                headers={"Content-Type": "application/json", "Connection": "close"}
            )
            with urllib.request.urlopen(req_ping, timeout=4.0) as resp:
                raw_ping = resp.read().decode("utf-8")
                if raw_ping:
                    try:
                        resp_ping = json.loads(raw_ping)
                        if "vigilancia_google" in resp_ping:
                            vigilancia_google_activa = bool(resp_ping["vigilancia_google"])
                    except Exception:
                        pass

            if not conectado_previamente:
                print(f"  [OK] ¡Conectado exitosamente con el docente! ({servidor_docente_url})", flush=True)
                print(f"  [OK] Esta PC es: PC {NUMERO_MAQUINA if NUMERO_MAQUINA else '(sin número asignado)'}", flush=True)
                print("  [i] Podés minimizar esta ventana. El control está activo.\n", flush=True)
                conectado_previamente = True

            # 2. Consultar si hay comandos pendientes
            url_poll = f"{servidor_docente_url}/api/poll?id={urllib.parse.quote(MACHINE_ID)}"
            req_poll = urllib.request.Request(
                url_poll,
                headers={"Connection": "close"}
            )
            with urllib.request.urlopen(req_poll, timeout=4.0) as resp:
                raw_poll = resp.read().decode("utf-8")
                data = json.loads(raw_poll) if raw_poll else {}
                comandos = data.get("comandos", [])
                for cmd in comandos:
                    ejecutar_comando(cmd)

        except urllib.error.URLError as e:
            if conectado_previamente:
                print(f"  [!] Conexión perdida con el docente. Reintentando reconectar...", flush=True)
            servidor_docente_url = None
        except Exception as e:
            print(f"  [!] Aviso de comunicación: {e}", flush=True)

        time.sleep(1.2)

def mantener_equipo_despierto():
    """Evita que Windows active el protector de pantalla, apague el Wi-Fi o suspenda el equipo (incluso al cerrar la tapa)."""
    if platform.system() != "Windows":
        return
    try:
        import ctypes
        # ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x00000001) | ES_DISPLAY_REQUIRED (0x00000002)
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
    except Exception:
        pass
    try:
        flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        # Configurar "No hacer nada" al cerrar la tapa del laptop (corriente y batería) y desactivar suspensión por inactividad
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
    global tk_root
    mantener_equipo_despierto()
    print("=" * 60, flush=True)
    print("  COLEGIO PAULO FREIRE — AGENTE DE ALUMNO", flush=True)
    print("=" * 60, flush=True)
    print(f"  Equipo:    {HOSTNAME} ({SISTEMA_OPERATIVO})", flush=True)
    print(f"  ID:        {MACHINE_ID}", flush=True)
    print(f"  Número:    PC {NUMERO_MAQUINA if NUMERO_MAQUINA else '(Sin asignar - podés asignarlo desde el celular o asignar_numero.bat)'}", flush=True)
    print("=" * 60, flush=True)
    print("  Iniciando servicio de aula...\n", flush=True)

    # Inicializar Tkinter de manera segura
    tk_disponible = False
    try:
        if TKINTER_OK and tk is not None:
            tk_root = tk.Tk()
            tk_root.withdraw()
            tk_disponible = True
    except Exception as e:
        print(f"  [!] Tkinter no disponible ({e}). Operando en modo consola.", flush=True)
        tk_root = None

    # Iniciar hilo de comunicación en segundo plano
    t = threading.Thread(target=ciclo_comunicacion, daemon=True)
    t.start()

    # Mantener vivo el programa sin cerrarse nunca
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
