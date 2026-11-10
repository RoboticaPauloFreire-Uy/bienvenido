#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CLIENTE_ALUMNO.PY — AGENTE DE MÁQUINA DE ALUMNO (PYTHON PURO)
Colegio Paulo Freire · Taller de Robótica & Informática

Se ejecuta en cada computadora de los alumnos.
Descubre automáticamente la IP del docente por red local sin necesidad de configurar nada.
Ejecuta bloqueo de pantalla (Modo Atención), apertura de proyectos web, avisos y silencio.
"""

import os
import sys
import time
import json
import socket
import platform
import threading
import subprocess
import webbrowser
import urllib.request
import urllib.error

# GUI con Tkinter nativo (incluido en Python estándar)
import tkinter as tk

PUERTO_UDP = 5005
PUERTO_WEB_DEFECTO = 5000

# Identificación de la máquina
HOSTNAME = socket.gethostname()
SISTEMA_OPERATIVO = platform.system()
MACHINE_ID = f"{HOSTNAME}_{platform.node()}"

# Estado local
servidor_docente_url = None
bloqueado = False
ventana_bloqueo = None
tk_root = None

def descubrir_servidor():
    """Escucha el faro UDP del docente para autodescubrir su IP."""
    print("  [?] Buscando al docente en la red local...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            try: s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except Exception: pass
        s.bind(("", PUERTO_UDP))
        s.settimeout(4.0)

        data, addr = s.recvfrom(2048)
        info = json.loads(data.decode("utf-8"))
        if info.get("magic") == "FREIRE_AULA":
            ip = info.get("docente_ip", addr[0])
            puerto = info.get("puerto", PUERTO_WEB_DEFECTO)
            s.close()
            return f"http://{ip}:{puerto}"
    except Exception:
        pass

    # Fallback: archivo de texto servidor_ip.txt si existe
    archivo_cfg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "servidor_ip.txt")
    if os.path.exists(archivo_cfg):
        try:
            with open(archivo_cfg, "r", encoding="utf-8") as f:
                linea = f.read().strip()
                if linea:
                    if not linea.startswith("http"):
                        linea = f"http://{linea}:{PUERTO_WEB_DEFECTO}"
                    return linea
        except Exception:
            pass

    # Si todo falla, probar localhost (para pruebas en la misma máquina)
    return f"http://127.0.0.1:{PUERTO_WEB_DEFECTO}"

# ══════════════════════════════════════════════════════════════
# CONTROL DE PANTALLA Y VENTANAS (TKINTER PURO)
# ══════════════════════════════════════════════════════════════

def mostrar_pantalla_bloqueo():
    """Crea una pantalla completa en primer plano para el modo atención."""
    global ventana_bloqueo, bloqueado, tk_root
    if bloqueado:
        return
    bloqueado = True

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

        # Evitar que se cierre con Alt+F4 o teclas
        w.protocol("WM_DELETE_WINDOW", lambda: None)
        w.bind("<Escape>", lambda e: "break")
        w.bind("<Alt-F4>", lambda e: "break")
        w.bind("<Control-Alt-Delete>", lambda e: "break")

        # Contenedor central
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

        # Barra decorativa inferior
        lbl_pie = tk.Label(frame, text="★ MODO ATENCIÓN ACTIVO ★", font=("Courier", 12, "bold"), bg="#1E293B", fg="#10B981", padx=16, pady=6)
        lbl_pie.pack(pady=10)

        w.update()

    tk_root.after(0, _crear)

def ocultar_pantalla_bloqueo():
    """Cierra la pantalla de bloqueo y devuelve el control al alumno."""
    global ventana_bloqueo, bloqueado, tk_root
    if not bloqueado:
        return
    bloqueado = False

    def _cerrar():
        global ventana_bloqueo
        if ventana_bloqueo:
            try:
                ventana_bloqueo.destroy()
            except Exception:
                pass
            ventana_bloqueo = None

    tk_root.after(0, _cerrar)

def mostrar_mensaje_emergente(texto):
    """Muestra un aviso emergente en pantalla enviado por el docente."""
    def _popup():
        # Sonido de campana del sistema
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

        # Centrar en pantalla
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

    tk_root.after(0, _popup)

def silenciar_audio():
    """Silencia el volumen del equipo."""
    try:
        if SISTEMA_OPERATIVO == "Windows":
            # Envía la tecla VK_VOLUME_MUTE (173) de forma nativa por PowerShell
            subprocess.run(
                ["powershell", "-Command", "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"],
                capture_output=True,
                creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
            )
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["amixer", "set", "Master", "mute"], capture_output=True)
            subprocess.run(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1"], capture_output=True)
    except Exception as e:
        print(f"  [!] Error silenciando: {e}")

def apagar_equipo():
    """Apaga la máquina de forma segura al finalizar la clase."""
    try:
        if SISTEMA_OPERATIVO == "Windows":
            subprocess.run(["shutdown", "/s", "/t", "10", "/c", "Fin del taller de robótica"])
        elif SISTEMA_OPERATIVO == "Linux":
            subprocess.run(["shutdown", "-h", "now"])
    except Exception as e:
        print(f"  [!] Error apagando: {e}")

# ══════════════════════════════════════════════════════════════
# COMUNICACIÓN EN TIEMPO REAL CON EL DOCENTE
# ══════════════════════════════════════════════════════════════

def ejecutar_comando(cmd):
    action = cmd.get("action")
    params = cmd.get("params", {})
    print(f"  [>] Ejecutando comando del docente: {action}")

    if action == "lock":
        mostrar_pantalla_bloqueo()
    elif action == "unlock":
        ocultar_pantalla_bloqueo()
    elif action == "open_url":
        url = params.get("url")
        if url:
            # Si la pantalla estaba bloqueada, desbloquear para que el alumno pueda ver la web
            ocultar_pantalla_bloqueo()
            webbrowser.open(url)
    elif action == "message":
        texto = params.get("texto", "")
        if texto:
            mostrar_mensaje_emergente(texto)
    elif action == "mute":
        silenciar_audio()
    elif action == "shutdown":
        apagar_equipo()

def ciclo_comunicacion():
    """Hilo secundario que envía pings y consulta comandos periódicamente."""
    global servidor_docente_url, bloqueado

    while True:
        if not servidor_docente_url:
            servidor_docente_url = descubrir_servidor()
            print(f"  [+] Conectando a servidor docente: {servidor_docente_url}")

        try:
            # 1. Enviar Ping de presencia
            ping_data = json.dumps({
                "id": MACHINE_ID,
                "hostname": HOSTNAME,
                "os": SISTEMA_OPERATIVO,
                "locked": bloqueado
            }).encode("utf-8")

            req_ping = urllib.request.Request(
                f"{servidor_docente_url}/api/ping",
                data=ping_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req_ping, timeout=3.0) as resp:
                pass

            # 2. Consultar si hay comandos pendientes
            url_poll = f"{servidor_docente_url}/api/poll?id={urllib.parse.quote(MACHINE_ID)}"
            with urllib.request.urlopen(url_poll, timeout=3.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                comandos = data.get("comandos", [])
                for cmd in comandos:
                    ejecutar_comando(cmd)

        except urllib.error.URLError:
            # Si se desconectó el docente, volver a buscarlo
            servidor_docente_url = None
        except Exception as e:
            pass

        time.sleep(1.2)

def main():
    global tk_root
    print("=" * 60)
    print("  COLEGIO PAULO FREIRE — AGENTE DE ALUMNO")
    print("=" * 60)
    print(f"  Equipo:    {HOSTNAME} ({SISTEMA_OPERATIVO})")
    print(f"  ID:        {MACHINE_ID}")
    print("=" * 60)
    print("  Iniciando servicio de aula... Minimizá esta ventana.\n")

    # Inicializar Tkinter en el hilo principal
    tk_root = tk.Tk()
    tk_root.withdraw()  # Ocultar ventana base invisible

    # Lanzar hilo de comunicación con el docente
    t = threading.Thread(target=ciclo_comunicacion, daemon=True)
    t.start()

    # Bucle principal de eventos de interfaz
    try:
        tk_root.mainloop()
    except KeyboardInterrupt:
        print("\n  Agente detenido.")

if __name__ == "__main__":
    main()
