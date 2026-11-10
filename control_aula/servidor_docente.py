#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SERVIDORDOCENTE.PY — SERVIDOR DE CONTROL DE AULA LOCAL (OPTIMIZADO PARA CELULAR)
Colegio Paulo Freire · Taller de Robótica & Informática

Inicia el servidor web en el puerto 5000 y el faro de auto-descubrimiento UDP en el puerto 5005.
Genera código QR en terminal y en web para escanear y controlar directamente desde el celular.
"""

import http.server
import socket
import socketserver
import threading
import json
import time
import os
import sys
import io
import base64
import urllib.parse

# Soporte opcional de QR nativo si está instalado
QR_AVAILABLE = False
try:
    import qrcode
    QR_AVAILABLE = True
except ImportError:
    pass

PUERTO_WEB = 5000
PUERTO_UDP = 5005
TIMEOUT_DESCONEXION = 15  # Segundos sin ping para marcar máquina como desconectada

ARCHIVO_NUMEROS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maquinas_numeros.json")

def cargar_numeros_guardados():
    if os.path.exists(ARCHIVO_NUMEROS):
        try:
            with open(ARCHIVO_NUMEROS, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def guardar_numeros_disco(nums):
    try:
        with open(ARCHIVO_NUMEROS, "w", encoding="utf-8") as f:
            json.dump(nums, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  [!] Error guardando numeros en disco: {e}")

maquinas_numeros = cargar_numeros_guardados()

def obtener_siguiente_numero_disponible():
    usados = set()
    for num in maquinas_numeros.values():
        try:
            usados.add(int(num))
        except Exception:
            pass
    for m in maquinas.values():
        if m.get("number"):
            try:
                usados.add(int(m["number"]))
            except Exception:
                pass
    cand = 1
    while cand in usados:
        cand += 1
    return str(cand)

# Estado en memoria
maquinas = {}
colas_comandos = {}  # machine_id -> [comandos]
cola_global = []     # Comandos para todas las máquinas
lock_estado = threading.Lock()

def obtener_ip_local():
    """Detecta la IP local de la máquina del docente en la red escolar."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

IP_DOCENTE = obtener_ip_local()
URL_MOVIL = f"http://{IP_DOCENTE}:{PUERTO_WEB}"

# Guardar automáticamente la IP para autodescubrimiento inmediato de alumnos
try:
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "servidor_ip.txt"), "w", encoding="utf-8") as f:
        f.write(URL_MOVIL)
except Exception:
    pass

def generar_qr_base64(url):
    """Genera una imagen QR en Base64 para mostrar directamente en el panel sin dependencias de internet."""
    if not QR_AVAILABLE:
        return ""
    try:
        img = qrcode.make(url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return ""

QR_BASE64 = generar_qr_base64(URL_MOVIL)

def faro_udp():
    """Emite un paquete UDP cada 2 segundos para que los alumnos descubran al docente sin configurar IP."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    mensaje = json.dumps({
        "magic": "FREIRE_AULA",
        "docente_ip": IP_DOCENTE,
        "puerto": PUERTO_WEB,
        "servidor": "Colegio Paulo Freire - Taller Maker"
    }).encode("utf-8")

    while True:
        try:
            sock.sendto(mensaje, ("255.255.255.255", PUERTO_UDP))
        except Exception:
            pass
        time.sleep(2.0)

def limpiar_maquinas_inactivas():
    """Revisa periódicamente si alguna máquina dejó de enviar pings."""
    while True:
        ahora = time.time()
        with lock_estado:
            for mid, m in list(maquinas.items()):
                if ahora - m.get("last_seen", 0) > TIMEOUT_DESCONEXION:
                    m["online"] = False
        time.sleep(3.0)

# ══════════════════════════════════════════════════════════════
# INTERFAZ GRÁFICA WEB ADAPTADA 100% A CELULARES & ESCRITORIO
# ══════════════════════════════════════════════════════════════
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0F172A">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Control de Aula · Paulo Freire</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Special+Elite&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0F172A;
      --card-bg: #1E293B;
      --card-border: #334155;
      --primary: #3B82F6;
      --primary-hover: #2563EB;
      --success: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --thumb-bar-h: 74px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 12px 12px calc(var(--thumb-bar-h) + 24px) 12px;
      user-select: none;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header Compacto */
    header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      font-size: 1.4rem;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      color: #FFF;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(59,130,246,0.4);
    }

    .brand-titles h1 {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .brand-titles p {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-qr-modal {
      background: #0F172A;
      border: 1px solid var(--card-border);
      color: #38BDF8;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Estado rápido de máquinas */
    .status-summary {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }

    .summary-pill {
      flex: 1;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .summary-pill i { font-size: 1.2rem; }
    .sp-online i { color: #10B981; }
    .sp-locked i { color: #EF4444; }

    .summary-text span {
      display: block;
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 800;
    }

    .summary-text strong {
      font-size: 1.15rem;
      font-weight: 900;
      line-height: 1.1;
    }

    /* Acciones Rápidas del Docente */
    .section-title {
      font-size: 0.8rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin: 16px 0 8px 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Cuadrícula de Proyectos Web (Botones Grandes y Táctiles) */
    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .proj-btn {
      background: var(--card-bg);
      border: 1.5px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 10px;
      color: #FFF;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 70px;
      transition: all 0.16s ease;
      touch-action: manipulation;
    }

    .proj-btn:active {
      transform: scale(0.95);
      background: #334155;
    }

    .proj-btn i { font-size: 1.4rem; }
    .proj-btn span { font-size: 0.82rem; font-weight: 800; text-align: center; }

    /* Barra de Enlace Libre */
    .custom-url-box {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .custom-url-box input {
      flex: 1;
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 12px;
      color: #FFF;
      font-size: 0.88rem;
      font-family: inherit;
      outline: none;
    }

    .custom-url-box input:focus { border-color: var(--primary); }

    .custom-url-box button {
      background: var(--primary);
      color: #FFF;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .custom-url-box button:active { transform: scale(0.95); }

    /* Acciones Auxiliares */
    .aux-actions-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .aux-btn {
      flex: 1;
      background: #1E293B;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 10px;
      color: #FFF;
      font-size: 0.8rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .aux-btn:active { transform: scale(0.96); background: #334155; }
    .aux-btn i { font-size: 1rem; }

    /* Lista de Máquinas de Alumnos */
    .machines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }

    .machine-card {
      background: var(--card-bg);
      border: 1.5px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .machine-card.online { border-color: #10B981; }
    .machine-card.locked { background: #26161C; border-color: #EF4444; }
    .machine-card.offline { opacity: 0.45; border-color: #475569; }

    .machine-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .machine-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

        .machine-num-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      color: #FFF;
      font-size: 0.95rem;
      font-weight: 900;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(2,132,199,0.4);
      flex-shrink: 0;
    }

    .machine-card.locked .machine-num-badge {
      background: linear-gradient(135deg, #DC2626, #991B1B);
      box-shadow: 0 2px 6px rgba(220,38,38,0.4);
    }

    .btn-renumber {
      background: #0F172A;
      border: 1px solid var(--card-border);
      color: #94A3B8;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
    }

    .btn-renumber:hover { color: #38BDF8; border-color: #38BDF8; }

    .mb-more { background: #475569; }

    .machine-title i { font-size: 1.15rem; color: #38BDF8; }
    .machine-title h3 { font-size: 0.92rem; font-weight: 800; }
    .machine-title p { font-size: 0.72rem; color: var(--text-muted); }

    .status-pill {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 999px;
    }

    .pill-online { background: #064E3B; color: #6EE7B7; border: 1px solid #059669; }
    .pill-locked { background: #7F1D1D; color: #FCA5A5; border: 1px solid #DC2626; }
    .pill-offline { background: #334155; color: #94A3B8; }

    .machine-actions {
      display: flex;
      gap: 6px;
    }

    .mini-btn {
      flex: 1;
      padding: 8px 6px;
      font-size: 0.74rem;
      font-weight: 700;
      border-radius: 6px;
      border: none;
      color: #FFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .mb-lock { background: #EF4444; }
    .mb-unlock { background: #10B981; }
    .mb-msg { background: #F59E0B; }

    /* ══════════════════════════════════════════════════════════════
       BARRA TÁCTIL FIJA PARA EL PULGAR (THUMB BAR)
       Diseñada especialmente para controlar el aula con una mano desde el celular
       ══════════════════════════════════════════════════════════════ */
    .thumb-control-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--thumb-bar-h);
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1.5px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)) 14px;
      z-index: 500;
      box-shadow: 0 -8px 24px rgba(0,0,0,0.5);
    }

    .thumb-btn {
      flex: 1;
      height: 52px;
      border: none;
      border-radius: 12px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.92rem;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.14s ease;
      touch-action: manipulation;
    }

    .thumb-btn:active {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }

    .thumb-lock {
      background: linear-gradient(135deg, #EF4444, #B91C1C);
      border: 1px solid #F87171;
    }

    .thumb-msg {
      flex: 0.6;
      background: #334155;
      border: 1px solid #475569;
      color: #F8FAFC;
    }

    .thumb-unlock {
      background: linear-gradient(135deg, #10B981, #047857);
      border: 1px solid #34D399;
    }

    /* Modales */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .modal-overlay.open { display: flex; }

    .modal-box {
      background: #1E293B;
      border: 1.5px solid var(--primary);
      border-radius: 14px;
      padding: 20px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6);
    }

    .modal-box h3 { font-size: 1.15rem; margin-bottom: 6px; }
    .modal-box p { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px; }

    .modal-box textarea {
      width: 100%;
      height: 85px;
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.95rem;
      resize: none;
      margin-bottom: 14px;
      outline: none;
    }

    .modal-box textarea:focus { border-color: var(--primary); }

    .modal-btns {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .modal-btns button {
      padding: 10px 18px;
      font-weight: 800;
      border-radius: 8px;
      border: none;
      cursor: pointer;
    }

    .mbtn-cancel { background: #475569; color: #FFF; }
    .mbtn-send { background: var(--primary); color: #FFF; }

    /* Modal QR */
    .qr-container {
      text-align: center;
      padding: 10px 0;
    }

    .qr-container img {
      width: 220px;
      height: 220px;
      border-radius: 10px;
      background: #FFF;
      padding: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }

    .qr-link {
      margin-top: 12px;
      font-family: 'Special Elite', monospace;
      font-size: 1rem;
      color: #38BDF8;
      word-break: break-all;
    }

    /* Toast */
    #toast {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: #10B981;
      color: #FFF;
      padding: 8px 18px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.85rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
      display: none;
      z-index: 2000;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado -->
    <header>
      <div class="brand">
        <div class="brand-icon"><i class="fas fa-robot"></i></div>
        <div class="brand-titles">
          <h1>Control de Aula Maker</h1>
          <p>Colegio Paulo Freire</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-qr-modal" onclick="abrirModalQR()" title="Ver código QR para celular">
          <i class="fas fa-qrcode"></i> <span>QR Celular</span>
        </button>
      </div>
    </header>

    <!-- Resumen de Estado -->
    <div class="status-summary">
      <div class="summary-pill sp-online">
        <i class="fas fa-desktop"></i>
        <div class="summary-text">
          <span>En Línea</span>
          <strong id="stat-online">0</strong>
        </div>
      </div>
      <div class="summary-pill sp-locked">
        <i class="fas fa-lock"></i>
        <div class="summary-text">
          <span>Bloqueadas</span>
          <strong id="stat-locked">0</strong>
        </div>
      </div>
    </div>

    <!-- Lanzador de Proyectos en 1 Clic -->
    <div class="section-title"><i class="fas fa-rocket"></i> Abrir en Todo el Taller</div>
    <div class="project-grid">
      <button class="proj-btn" onclick="lanzarUrl('https://roboticapaulofreire-uy.github.io/bienvenido/')">
        <i class="fas fa-newspaper" style="color:#F59E0B;"></i>
        <span>El Diario</span>
      </button>
      <button class="proj-btn" onclick="lanzarUrl('https://scratch.mit.edu/projects/editor/')">
        <i class="fas fa-cat" style="color:#F97316;"></i>
        <span>Scratch</span>
      </button>
      <button class="proj-btn" onclick="lanzarUrl('https://makecode.microbit.org/')">
        <i class="fas fa-microchip" style="color:#10B981;"></i>
        <span>MakeCode</span>
      </button>
      <button class="proj-btn" onclick="lanzarUrl('https://www.paperme.de/paperme/default/')">
        <i class="fas fa-cube" style="color:#EA580C;"></i>
        <span>PaperMe</span>
      </button>
      <button class="proj-btn" onclick="lanzarUrl('https://sketch.metademolab.com/canvas')">
        <i class="fas fa-running" style="color:#3B82F6;"></i>
        <span>Animated</span>
      </button>
      <button class="proj-btn" onclick="lanzarUrl('https://www.canva.com')">
        <i class="fas fa-palette" style="color:#8B5CF6;"></i>
        <span>Canva</span>
      </button>
    </div>

    <!-- Pegar cualquier URL -->
    <div class="custom-url-box">
      <input type="url" id="inp-custom-url" placeholder="Pegá cualquier enlace web acá...">
      <button onclick="lanzarUrlPersonalizada()"><i class="fas fa-paper-plane"></i> Abrir</button>
    </div>

    <!-- Juegos Offline Integrados (100% Sin Internet) -->
    <div class="section-title"><i class="fas fa-gamepad"></i> Recreo / Juegos Offline (Sin Internet)</div>
    <div class="project-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 14px;">
      <button class="proj-btn" style="background: linear-gradient(135deg, #0284C7, #0369A1); border-color: #38BDF8;" onclick="lanzarJuego('surf')">
        <i class="fas fa-water" style="color:#FFF;"></i>
        <span>🏄‍♂️ Surf (Edge)</span>
      </button>
      <button class="proj-btn" style="background: linear-gradient(135deg, #475569, #334155); border-color: #94A3B8;" onclick="lanzarJuego('dino')">
        <i class="fas fa-dragon" style="color:#FBBF24;"></i>
        <span>🦖 Dinosaurio (Chrome)</span>
      </button>
    </div>

    <!-- Acciones Rápidas Auxiliares -->
    <div class="aux-actions-row">
      <button class="aux-btn" onclick="enviarComando('all', 'mute')">
        <i class="fas fa-volume-mute" style="color:#A78BFA;"></i> Silenciar Aula
      </button>
      <button class="aux-btn" onclick="confirmarApagado()">
        <i class="fas fa-power-off" style="color:#EF4444;"></i> Apagar Todas
      </button>
    </div>

    <!-- Computadoras de Alumnos Conectadas -->
    <div class="section-title"><i class="fas fa-laptop-code"></i> Alumnos Conectados (<span id="stat-total">0</span>)</div>
    <div class="machines-grid" id="machines-container">
      <p style="color:var(--text-muted);font-size:0.85rem;padding:10px 4px;">Esperando que las computadoras del taller se enciendan...</p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       BARRA FIJA INFERIOR PARA CONTROLAR CON EL PULGAR DESDE EL CELULAR
       ══════════════════════════════════════════════════════════════ -->
  <div class="thumb-control-bar">
    <button class="thumb-btn thumb-lock" onclick="enviarComandoConVibracion('all', 'lock')">
      <i class="fas fa-lock"></i> BLOQUEAR
    </button>
    <button class="thumb-btn thumb-msg" onclick="abrirModalMensaje('all')">
      <i class="fas fa-comment-dots"></i> AVISO
    </button>
    <button class="thumb-btn thumb-unlock" onclick="enviarComandoConVibracion('all', 'unlock')">
      <i class="fas fa-lock-open"></i> DESBLOQUEAR
    </button>
  </div>

  <!-- Modal Asignar / Cambiar Número de Máquina -->
  <div class="modal-overlay" id="modal-renumber">
    <div class="modal-box">
      <h3>🔢 Asignar Número a esta Computadora</h3>
      <p id="modal-renumber-info">Máquina seleccionada</p>
      <input type="number" id="inp-new-number" min="1" max="99" style="width:100%;background:#0F172A;border:1.5px solid var(--primary);border-radius:8px;padding:12px;font-size:1.3rem;font-weight:900;color:#FFF;text-align:center;margin-bottom:14px;outline:none;" placeholder="Ej: 1, 2, 3...">
      <div class="modal-btns">
        <button class="mbtn-cancel" onclick="cerrarModalRenombrar()">Cancelar</button>
        <button class="mbtn-send" onclick="guardarNuevoNumero()">Guardar Número</button>
      </div>
    </div>
  </div>

  <!-- Modal Acciones Individuales para una PC -->
  <div class="modal-overlay" id="modal-individual">
    <div class="modal-box">
      <h3 id="modal-indiv-title">⚙️ Control Individual: PC XX</h3>
      <p>Acciones exclusivas para esta computadora:</p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
        <button class="aux-btn" style="background:#0284C7;border-color:#38BDF8;padding:12px;" onclick="enviarAccionIndividual('launch_game', {game:'surf'})">
          <i class="fas fa-water"></i> Abrir Surf (Edge) solo a esta PC
        </button>
        <button class="aux-btn" style="background:#475569;border-color:#94A3B8;padding:12px;" onclick="enviarAccionIndividual('launch_game', {game:'dino'})">
          <i class="fas fa-dragon" style="color:#FBBF24;"></i> Abrir Dino (Chrome) solo a esta PC
        </button>
        <button class="aux-btn" style="background:#334155;padding:12px;" onclick="enviarAccionIndividual('mute', {})">
          <i class="fas fa-volume-mute" style="color:#A78BFA;"></i> Silenciar solo esta PC
        </button>
        <button class="aux-btn" style="background:#7F1D1D;border-color:#EF4444;padding:12px;" onclick="enviarAccionIndividual('shutdown', {})">
          <i class="fas fa-power-off" style="color:#FCA5A5;"></i> Apagar solo esta PC
        </button>
      </div>
      <div class="modal-btns">
        <button class="mbtn-cancel" onclick="cerrarModalIndividual()">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- Modal Enviar Mensaje -->
  <div class="modal-overlay" id="modal-msg">
    <div class="modal-box">
      <h3>📢 Enviar Aviso a Pantalla</h3>
      <p id="modal-msg-target">Destinatario: Todas las computadoras</p>
      <textarea id="modal-msg-text" placeholder="Ej: ¡Faltan 5 minutos para guardar el proyecto y ordenar el kit!..."></textarea>
      <div class="modal-btns">
        <button class="mbtn-cancel" onclick="cerrarModalMensaje()">Cancelar</button>
        <button class="mbtn-send" onclick="enviarMensajeModal()">Enviar Aviso</button>
      </div>
    </div>
  </div>

  <!-- Modal Código QR para Conectar Celular -->
  <div class="modal-overlay" id="modal-qr">
    <div class="modal-box" style="text-align:center;">
      <h3>📱 Escaneá con tu Celular</h3>
      <p>Conectá tu celular al Wi-Fi del colegio y apuntá con la cámara:</p>
      <div class="qr-container">
        __QR_IMG_TAG__
        <div class="qr-link">__DOCENTE_URL__</div>
      </div>
      <div class="modal-btns" style="justify-content:center;margin-top:14px;">
        <button class="mbtn-send" onclick="cerrarModalQR()">Listo / Cerrar</button>
      </div>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    var currentTarget = 'all';
    var renumberTargetId = null;
    var indivTargetId = null;
    var indivTargetNum = null;

    function abrirModalRenombrar(id, currentNum) {
      renumberTargetId = id;
      document.getElementById('modal-renumber-info').textContent = 'Identificador: ' + id;
      document.getElementById('inp-new-number').value = parseInt(currentNum) || '';
      document.getElementById('modal-renumber').classList.add('open');
      setTimeout(function() { document.getElementById('inp-new-number').focus(); }, 120);
    }

    function cerrarModalRenombrar() {
      document.getElementById('modal-renumber').classList.remove('open');
    }

    function guardarNuevoNumero() {
      var val = document.getElementById('inp-new-number').value.trim();
      if (!val) return;
      fetch('/api/set_number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: renumberTargetId, number: val })
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        toast('Número guardado como PC ' + val);
        cerrarModalRenombrar();
        cargarEstado();
      })
      .catch(function(err) {
        toast('Error guardando número', '#EF4444');
      });
    }

    function abrirModalIndividual(id, padNum) {
      indivTargetId = id;
      indivTargetNum = padNum;
      document.getElementById('modal-indiv-title').textContent = '⚙️ Opciones para PC ' + padNum;
      document.getElementById('modal-individual').classList.add('open');
    }

    function cerrarModalIndividual() {
      document.getElementById('modal-individual').classList.remove('open');
    }

    function enviarAccionIndividual(action, params) {
      if (action === 'shutdown' && !confirm('¿Estás seguro de apagar la PC ' + indivTargetNum + '?')) return;
      enviarComando(indivTargetId, action, params);
      cerrarModalIndividual();
    }


    function vibrar() {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(60);
      }
    }

    function toast(txt, color) {
      var t = document.getElementById('toast');
      t.textContent = txt;
      t.style.background = color || '#10B981';
      t.style.display = 'block';
      setTimeout(function() { t.style.display = 'none'; }, 2000);
    }

    function enviarComando(target, action, params) {
      vibrar();
      fetch('/api/comando', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target, action: action, params: params || {} })
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        toast('Enviado: ' + action.toUpperCase());
        cargarEstado();
      })
      .catch(function(err) {
        toast('Error de conexión', '#EF4444');
      });
    }

    function enviarComandoConVibracion(target, action, params) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([40, 60, 40]);
      }
      enviarComando(target, action, params);
    }

    function lanzarJuego(game) {
      vibrar();
      var label = game === 'surf' ? 'Juego Surf (Edge)' : 'Juego Dinosaurio (Chrome)';
      toast('Lanzando ' + label);
      enviarComando('all', 'launch_game', { game: game });
    }

    function lanzarUrl(url) {
      enviarComando('all', 'open_url', { url: url });
    }

    function lanzarUrlPersonalizada() {
      var inp = document.getElementById('inp-custom-url');
      var val = (inp.value || '').trim();
      if (!val) {
        alert('Ingresá una dirección web (ej: wikipedia.org)');
        return;
      }
      if (!/^https?:\\/\\//i.test(val)) val = 'https://' + val;
      lanzarUrl(val);
      inp.value = '';
    }

    function abrirModalMensaje(target) {
      currentTarget = target;
      document.getElementById('modal-msg-target').textContent = 'Destinatario: ' + (target === 'all' ? 'Todo el taller' : target);
      document.getElementById('modal-msg-text').value = '';
      document.getElementById('modal-msg').classList.add('open');
      setTimeout(function() { document.getElementById('modal-msg-text').focus(); }, 120);
    }

    function cerrarModalMensaje() {
      document.getElementById('modal-msg').classList.remove('open');
    }

    function enviarMensajeModal() {
      var txt = document.getElementById('modal-msg-text').value.trim();
      if (!txt) return;
      enviarComando(currentTarget, 'message', { texto: txt });
      cerrarModalMensaje();
    }

    function abrirModalQR() {
      document.getElementById('modal-qr').classList.add('open');
    }

    function cerrarModalQR() {
      document.getElementById('modal-qr').classList.remove('open');
    }

    function confirmarApagado() {
      if (confirm('¿Confirmás apagar todas las computadoras del taller?')) {
        enviarComando('all', 'shutdown', {});
      }
    }

    function cargarEstado() {
      fetch('/api/status')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var maquinas = data.maquinas || [];
          var onlineCount = 0;
          var lockedCount = 0;

          maquinas.forEach(function(m) {
            if (m.online) onlineCount++;
            if (m.locked) lockedCount++;
          });

          document.getElementById('stat-online').textContent = onlineCount;
          document.getElementById('stat-locked').textContent = lockedCount;
          document.getElementById('stat-total').textContent = maquinas.length;

          var cont = document.getElementById('machines-container');
          if (!maquinas.length) {
            cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:10px 4px;">Esperando que las computadoras del taller se enciendan...</p>';
            return;
          }

                    // Ordenar numéricamente las máquinas (PC 01, PC 02, PC 03...)
          maquinas.sort(function(a, b) {
            var na = parseInt(a.number) || 999;
            var nb = parseInt(b.number) || 999;
            return na - nb;
          });

          cont.innerHTML = maquinas.map(function(m) {
            var stateClass = !m.online ? 'offline' : (m.locked ? 'locked' : 'online');
            var pillHtml = !m.online
              ? '<span class="status-pill pill-offline">Off</span>'
              : (m.locked ? '<span class="status-pill pill-locked">🔒 Bloqueada</span>' : '<span class="status-pill pill-online">🟢 Activa</span>');

            var nStr = m.number ? String(m.number) : '?';
            var padNum = nStr.length === 1 ? '0' + nStr : nStr;

            return '<div class="machine-card ' + stateClass + '">' +
              '<div class="machine-head">' +
                '<div class="machine-title">' +
                  '<div class="machine-num-badge">#' + padNum + '</div>' +
                  '<div>' +
                    '<h3>PC ' + padNum + '</h3>' +
                    '<p>' + m.ip + ' · <span style="opacity:0.6;">' + m.hostname + '</span></p>' +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                  pillHtml +
                  '<button class="btn-renumber" onclick="abrirModalRenombrar(\'' + m.id + '\', \'' + padNum + '\')" title="Cambiar número de esta PC"><i class="fas fa-pen"></i></button>' +
                '</div>' +
              '</div>' +
              '<div class="machine-actions">' +
                (m.locked
                  ? '<button class="mini-btn mb-unlock" onclick="enviarComando(\'' + m.id + '\', \'unlock\')"><i class="fas fa-unlock"></i> Desbloquear</button>'
                  : '<button class="mini-btn mb-lock" onclick="enviarComando(\'' + m.id + '\', \'lock\')"><i class="fas fa-lock"></i> Bloquear</button>') +
                '<button class="mini-btn mb-msg" onclick="abrirModalMensaje(\'' + m.id + '\')"><i class="fas fa-comment"></i> Mensaje</button>' +
                '<button class="mini-btn mb-more" onclick="abrirModalIndividual(\'' + m.id + '\', \'' + padNum + '\')" title="Más acciones"><i class="fas fa-ellipsis-v"></i></button>' +
              '</div>' +
            '</div>';
          }).join('');
        })
        .catch(function(err) {});
    }

    setInterval(cargarEstado, 1400);
    cargarEstado();
  </script>
</body>
</html>
"""

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        # Ignorar desconexiones de socket normales de clientes web
        err = sys.exc_info()[1]
        if isinstance(err, (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
            return
        super().handle_error(request, client_address)

class ControlAulaHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        return

    def responder_json(self, data, code=200):
        try:
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception:
            pass

    def responder_html(self, html_text, code=200):
        try:
            body = html_text.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass
        except Exception:
            pass

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)

        if url.path == "/" or url.path == "/index.html":
            qr_tag = f'<img src="{QR_BASE64}" alt="Código QR">' if QR_BASE64 else f'<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={urllib.parse.quote(URL_MOVIL)}" alt="QR">'
            html = DASHBOARD_HTML.replace("__DOCENTE_URL__", URL_MOVIL).replace("__QR_IMG_TAG__", qr_tag)
            self.responder_html(html)
            return

        if url.path == "/api/status":
            with lock_estado:
                lista = list(maquinas.values())
            self.responder_json({"ip": IP_DOCENTE, "maquinas": lista})
            return

        if url.path == "/api/poll":
            params = urllib.parse.parse_qs(url.query)
            mid = params.get("id", [""])[0]
            comandos_a_ejecutar = []

            with lock_estado:
                if mid in colas_comandos and colas_comandos[mid]:
                    comandos_a_ejecutar.extend(colas_comandos[mid])
                    colas_comandos[mid] = []

                if mid in maquinas:
                    last_global = maquinas[mid].get("last_global_seq", 0)
                    nuevos_globales = [c for c in cola_global if c["seq"] > last_global]
                    if nuevos_globales:
                        comandos_a_ejecutar.extend(nuevos_globales)
                        maquinas[mid]["last_global_seq"] = cola_global[-1]["seq"]

            self.responder_json({"comandos": comandos_a_ejecutar})
            return

        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"

        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}

        if url.path == "/api/set_number":
            mid = data.get("id")
            num = str(data.get("number", "")).strip()
            if mid and num:
                with lock_estado:
                    maquinas_numeros[mid] = num
                    guardar_numeros_disco(maquinas_numeros)
                    if mid in maquinas:
                        maquinas[mid]["number"] = num
                    if mid not in colas_comandos:
                        colas_comandos[mid] = []
                    colas_comandos[mid].append({
                        "action": "set_number",
                        "params": {"number": num},
                        "time": time.time()
                    })
                self.responder_json({"status": "ok", "number": num})
                return

        if url.path == "/api/ping":
            mid = data.get("id")
            num_reportado = str(data.get("number", "")).strip()
            if mid:
                with lock_estado:
                    num_asignado = maquinas_numeros.get(mid)
                    if not num_asignado and num_reportado:
                        num_asignado = num_reportado
                        maquinas_numeros[mid] = num_asignado
                        guardar_numeros_disco(maquinas_numeros)
                    elif not num_asignado:
                        num_asignado = obtener_siguiente_numero_disponible()
                        maquinas_numeros[mid] = num_asignado
                        guardar_numeros_disco(maquinas_numeros)

                    if mid not in maquinas:
                        maquinas[mid] = {
                            "id": mid,
                            "number": num_asignado,
                            "hostname": data.get("hostname", mid),
                            "ip": self.client_address[0],
                            "os": data.get("os", "Desconocido"),
                            "locked": data.get("locked", False),
                            "online": True,
                            "last_seen": time.time(),
                            "last_global_seq": len(cola_global)
                        }
                    else:
                        m = maquinas[mid]
                        m["last_seen"] = time.time()
                        m["online"] = True
                        m["ip"] = self.client_address[0]
                        m["number"] = num_asignado
                        if "locked" in data:
                            m["locked"] = data["locked"]

            self.responder_json({"status": "ok"})
            return

        if url.path == "/api/comando":
            target = data.get("target", "all")
            action = data.get("action")
            params = data.get("params", {})

            cmd = {
                "action": action,
                "params": params,
                "time": time.time()
            }

            with lock_estado:
                if target == "all":
                    cmd["seq"] = len(cola_global) + 1
                    cola_global.append(cmd)
                    if action == "lock":
                        for m in maquinas.values(): m["locked"] = True
                    elif action == "unlock":
                        for m in maquinas.values(): m["locked"] = False
                else:
                    if target not in colas_comandos:
                        colas_comandos[target] = []
                    colas_comandos[target].append(cmd)
                    if target in maquinas:
                        if action == "lock": maquinas[target]["locked"] = True
                        elif action == "unlock": maquinas[target]["locked"] = False

            self.responder_json({"status": "queued"})
            return

        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

def main():
    print("=" * 65)
    print("  COLEGIO PAULO FREIRE — CONTROL DE AULA DESDE EL CELULAR")
    print("=" * 65)
    print(f"  [+] Conectá tu celular al Wi-Fi del colegio y entrá a:")
    print(f"      >> {URL_MOVIL} <<")
    print("=" * 65)

    if QR_AVAILABLE:
        print("  [📱] O ESCANEÁ ESTE CÓDIGO QR DIRECTO DESDE TU CELULAR:\n")
        try:
            qr = qrcode.QRCode()
            qr.add_data(URL_MOVIL)
            qr.print_ascii(invert=True)
        except Exception:
            pass
        print()

    print(f"  [+] Faro de auto-descubrimiento activo en UDP:{PUERTO_UDP}")
    print("=" * 65)
    print("  Listo para usar. Presioná Ctrl + C para detener el servidor.\n")

    # Iniciar hilo de faro UDP
    t_udp = threading.Thread(target=faro_udp, daemon=True)
    t_udp.start()

    # Iniciar hilo limpiador de inactivas
    t_clean = threading.Thread(target=limpiar_maquinas_inactivas, daemon=True)
    t_clean.start()

    # Iniciar servidor HTTP
    with ThreadedHTTPServer(("0.0.0.0", PUERTO_WEB), ControlAulaHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Servidor detenido.")

if __name__ == "__main__":
    main()
