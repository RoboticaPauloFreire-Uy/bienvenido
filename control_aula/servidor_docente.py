#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SERVIDORDOCENTE.PY — SERVIDOR DE CONTROL DE AULA LOCAL (OPTIMIZADO PARA CELULAR)
Colegio Paulo Freire · Taller de Robótica & Informática

Inicia el servidor web en el puerto 5000 y el faro de auto-descubrimiento UDP en el puerto 5005.
Genera código QR en terminal y en web para escanear y controlar directamente desde el celular.
Incluye:
  - Vista en vivo de qué ventana tiene abierta cada PC (Opción 3)
  - Regla de la Sala: Volumen al 50% en 1 toque (global o por PC)
  - Detector de búsquedas en Google con advertencia automática al alumno y alerta al docente
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
import platform
import subprocess
import zipfile

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

DIR_BASE = os.path.dirname(os.path.abspath(__file__))
ARCHIVO_NUMEROS = os.path.join(DIR_BASE, "maquinas_numeros.json")
ARCHIVO_PALABRAS = os.path.join(DIR_BASE, "palabras_prohibidas.txt")
_palabras_cache_servidor = []
_palabras_mtime_servidor = 0

def cargar_palabras_prohibidas_servidor():
    global _palabras_cache_servidor, _palabras_mtime_servidor
    try:
        if os.path.exists(ARCHIVO_PALABRAS):
            mt = os.path.getmtime(ARCHIVO_PALABRAS)
            if mt != _palabras_mtime_servidor:
                lista = []
                with open(ARCHIVO_PALABRAS, "r", encoding="utf-8") as f:
                    for linea in f:
                        l = linea.strip()
                        if l and not l.startswith("#"):
                            lista.append(l)
                _palabras_cache_servidor = lista
                _palabras_mtime_servidor = mt
    except Exception:
        pass
    return _palabras_cache_servidor

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
colas_comandos = {}      # machine_id -> [comandos]
cola_global = []         # Comandos para todas las máquinas
alertas_busquedas = []   # Historial de búsquedas prohibidas detectadas
vigilancia_google = True # Regla activa por defecto: no buscar en Google
lock_estado = threading.Lock()

DIR_EVIDENCIAS_DOCENTE = os.path.join(DIR_BASE, "evidencias_docente")
os.makedirs(DIR_EVIDENCIAS_DOCENTE, exist_ok=True)

# Estado de Modo Foco (Lista Blanca de Navegación)
modo_foco = {
    "activo": False,
    "nombre": "Scratch y Robótica",
    "permitidos": ["scratch", "tinkercad", "paulofreire", "roboticapaulofreire-uy.github.io"]
}

def cargar_evidencias_guardadas():
    """Restaura las evidencias fotográficas guardadas en disco al reiniciar el servidor."""
    evidencias = []
    if os.path.exists(DIR_EVIDENCIAS_DOCENTE):
        archivos = [f for f in os.listdir(DIR_EVIDENCIAS_DOCENTE) if f.endswith(".json")]
        # Ordenar por fecha descendente
        archivos.sort(reverse=True)
        for f in archivos:
            try:
                with open(os.path.join(DIR_EVIDENCIAS_DOCENTE, f), "r", encoding="utf-8") as jf:
                    meta = json.load(jf)
                foto_f = meta.get("foto_file")
                if foto_f:
                    fpath = os.path.join(DIR_EVIDENCIAS_DOCENTE, foto_f)
                    if os.path.exists(fpath):
                        with open(fpath, "rb") as img_f:
                            meta["foto"] = base64.b64encode(img_f.read()).decode("ascii")
                evidencias.append(meta)
            except Exception:
                pass
    return evidencias[:60]

alertas_busquedas = cargar_evidencias_guardadas()

# ══════════════════════════════════════════════════════════════
# GESTIÓN DE ARCHIVOS Y TRABAJOS DE ALUMNOS (OPCIÓN 4)
# ══════════════════════════════════════════════════════════════
DIR_DISTRIBUCION = os.path.join(DIR_BASE, "archivos_distribuir")
DIR_RECOLECCION = os.path.join(DIR_BASE, "trabajos_recolectados")
os.makedirs(DIR_DISTRIBUCION, exist_ok=True)
os.makedirs(DIR_RECOLECCION, exist_ok=True)

def cargar_trabajos_disco():
    """Escanea y restaura los trabajos previamente recolectados desde el disco."""
    items = []
    if os.path.exists(DIR_RECOLECCION):
        for root, dirs, files in os.walk(DIR_RECOLECCION):
            for file in files:
                if file.endswith(".meta.json"):
                    continue
                filepath = os.path.join(root, file)
                rel = os.path.relpath(filepath, DIR_RECOLECCION)
                carpetas = rel.split(os.sep)
                pc_nom = carpetas[0] if len(carpetas) > 1 else "PC"
                try:
                    st = os.stat(filepath)
                    meta_path = filepath + ".meta.json"
                    hostname = ""
                    hora_str = time.strftime("%H:%M:%S", time.localtime(st.st_mtime))
                    fecha_str = time.strftime("%d/%m/%Y", time.localtime(st.st_mtime))
                    if os.path.exists(meta_path):
                        try:
                            with open(meta_path, "r", encoding="utf-8") as mf:
                                mdata = json.load(mf)
                                hostname = mdata.get("hostname", "")
                                hora_str = mdata.get("hora", hora_str)
                                fecha_str = mdata.get("fecha", fecha_str)
                        except Exception:
                            pass
                    items.append({
                        "pc": pc_nom,
                        "hostname": hostname,
                        "filename": file,
                        "tam_kb": max(1, st.st_size // 1024),
                        "hora": hora_str,
                        "fecha": fecha_str,
                        "rel_path": rel.replace(os.sep, "/"),
                        "mtime": st.st_mtime
                    })
                except Exception:
                    pass
        items.sort(key=lambda x: x.get("mtime", 0), reverse=True)
    return items[:120]

trabajos_recibidos = cargar_trabajos_disco()

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
DASHBOARD_HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0B1120">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Control de Aula · Paulo Freire</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Special+Elite&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B1120;
      --bg-elevated: #111827;
      --card-bg: #1E293B;
      --card-hover: #26354D;
      --card-border: #334155;
      --primary: #3B82F6;
      --primary-glow: rgba(59, 130, 246, 0.25);
      --accent: #38BDF8;
      --success: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
      --purple: #8B5CF6;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --thumb-bar-h: 76px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top, #172554 0%, var(--bg) 38%);
      color: var(--text);
      min-height: 100vh;
      padding: 12px 12px calc(var(--thumb-bar-h) + 28px) 12px;
      user-select: none;
    }

    .container {
      max-width: 1120px;
      margin: 0 auto;
    }

    /* ══════════════ HEADER SUPERIOR ══════════════ */
    header {
      background: rgba(30, 41, 59, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      font-size: 1.35rem;
      background: linear-gradient(135deg, #3B82F6, #1D4ED8);
      color: #FFF;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(59,130,246,0.45);
      flex-shrink: 0;
    }

    .brand-titles h1 {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .brand-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .conn-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .conn-badge.offline {
      background: rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .dot-live {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }

    .conn-badge.offline .dot-live {
      background: #EF4444;
      box-shadow: 0 0 8px #EF4444;
    }

    .btn-qr-modal {
      background: linear-gradient(135deg, #1E293B, #0F172A);
      border: 1px solid #38BDF8;
      color: #38BDF8;
      padding: 9px 13px;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .btn-qr-modal:active { transform: scale(0.95); }

    /* ══════════════ BANNER DE ALERTA DE BÚSQUEDA EN GOOGLE ══════════════ */
    .google-alert-banner {
      display: none;
      background: linear-gradient(135deg, #7F1D1D 0%, #450A0A 100%);
      border: 1.5px solid #EF4444;
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 12px;
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      animation: fadeIn 0.2s ease-out;
    }

    .google-alert-banner.visible {
      display: flex;
    }

    .gab-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex: 1;
    }

    .gab-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.25);
      color: #FCA5A5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .gab-text h4 {
      font-size: 0.85rem;
      font-weight: 900;
      color: #FCA5A5;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .gab-text p {
      font-size: 0.84rem;
      color: #FFF;
      font-weight: 700;
      margin-top: 2px;
      word-break: break-word;
    }

    .gab-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }

    .gab-btn {
      border: none;
      border-radius: 8px;
      padding: 8px 11px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      color: #FFF;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* ══════════════ TARJETAS DE RESUMEN (KPIs) ══════════════ */
    .status-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .summary-pill {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }

    .summary-pill:active { transform: scale(0.97); }
    .summary-pill i {
      font-size: 1.15rem;
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sp-online i { background: rgba(16, 185, 129, 0.15); color: #10B981; }
    .sp-locked i { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
    .sp-total i { background: rgba(56, 189, 248, 0.15); color: #38BDF8; }

    .summary-text span {
      display: block;
      font-size: 0.64rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .summary-text strong {
      font-size: 1.2rem;
      font-weight: 900;
      line-height: 1.15;
    }

    /* ══════════════ NAVEGACIÓN POR PESTAÑAS (TABS) ══════════════ */
    .tabs-nav {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      background: #0F172A;
      padding: 6px;
      border-radius: 14px;
      border: 1px solid var(--card-border);
      margin-bottom: 16px;
      position: sticky;
      top: 8px;
      z-index: 400;
      box-shadow: 0 6px 20px rgba(0,0,0,0.4);
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: inherit;
      font-size: 0.76rem;
      font-weight: 800;
      padding: 10px 6px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.18s ease;
      position: relative;
    }

    .tab-btn i { font-size: 1.1rem; }

    .tab-btn.active {
      background: linear-gradient(135deg, #2563EB, #1D4ED8);
      color: #FFF;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.45);
    }

    .tab-badge {
      position: absolute;
      top: 4px;
      right: 8px;
      background: #10B981;
      color: #052E16;
      font-size: 0.62rem;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 999px;
      min-width: 17px;
      text-align: center;
    }

    .tab-badge.badge-danger {
      background: #EF4444;
      color: #FFF;
    }

    .tab-btn.active .tab-badge {
      background: #FFF;
      color: #1D4ED8;
    }

    .tab-panel {
      display: none;
      animation: fadeIn 0.18s ease-out;
    }

    .tab-panel.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ══════════════ BARRA DE FILTROS EN PESTAÑA EQUIPOS ══════════════ */
    .toolbar-equipos {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .filter-pills {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-btn.active {
      background: rgba(56, 189, 248, 0.18);
      color: #38BDF8;
      border-color: #38BDF8;
    }

    .toolbar-right-btns {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .btn-vol50-quick {
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border: 1px solid #38BDF8;
      color: #FFF;
      border-radius: 8px;
      padding: 6px 11px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 3px 10px rgba(2, 132, 199, 0.3);
    }

    .btn-vol50-quick:active { transform: scale(0.95); }

    .btn-power-quick {
      background: linear-gradient(135deg, #DC2626, #991B1B);
      border: 1px solid #EF4444;
      color: #FFF;
      border-radius: 8px;
      padding: 6px 11px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 3px 10px rgba(220, 38, 38, 0.35);
    }
    .btn-power-quick:active { transform: scale(0.95); }

    /* ══════════════ MODO FOCO (LISTA BLANCA) ══════════════ */
    .focus-presets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 8px;
      margin-top: 6px;
    }
    .focus-preset-btn {
      background: #0F172A;
      border: 1.5px solid var(--card-border);
      color: var(--text-muted);
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
    }
    .focus-preset-btn:hover {
      border-color: #38BDF8;
      color: #FFF;
    }
    .focus-preset-btn.active {
      background: rgba(56, 189, 248, 0.18);
      border-color: #38BDF8;
      color: #38BDF8;
    }

    /* ══════════════ GALERÍA VISUAL DE EVIDENCIAS ══════════════ */
    .evidence-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .evidence-stats {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .ev-pill {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #94A3B8;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: bold;
    }
    .ev-pill.ev-grave {
      background: rgba(239, 68, 68, 0.15);
      border-color: #EF4444;
      color: #FCA5A5;
    }
    .evidence-actions {
      display: flex;
      gap: 8px;
    }
    .btn-report-print {
      background: linear-gradient(135deg, #059669, #047857);
      border: 1px solid #10B981;
      color: #FFF;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 3px 10px rgba(5, 150, 105, 0.35);
    }
    .btn-clear-ev {
      background: #1E293B;
      border: 1px solid var(--card-border);
      color: #94A3B8;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.74rem;
      font-weight: 800;
      cursor: pointer;
    }
    .evidence-filter-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 14px;
      font-size: 0.76rem;
      color: var(--text-muted);
      flex-wrap: wrap;
    }
    .evidence-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }
    .ev-card {
      background: var(--card-bg);
      border: 1.5px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: transform 0.15s, border-color 0.15s;
    }
    .ev-card:hover {
      transform: translateY(-2px);
      border-color: #38BDF8;
    }
    .ev-card.grave {
      border-color: #EF4444;
      background: linear-gradient(180deg, rgba(239,68,68,0.1) 0%, var(--card-bg) 40%);
    }
    .ev-card-img-wrap {
      position: relative;
      width: 100%;
      height: 165px;
      background: #020617;
      cursor: pointer;
      overflow: hidden;
    }
    .ev-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.25s;
    }
    .ev-card-img-wrap:hover .ev-card-img {
      transform: scale(1.05);
    }
    .ev-card-zoom-overlay {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0,0,0,0.7);
      color: #FFF;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      pointer-events: none;
    }
    .ev-card-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .ev-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ev-badge-pc {
      background: #1E293B;
      color: #38BDF8;
      border: 1px solid #38BDF8;
      border-radius: 6px;
      padding: 2px 7px;
      font-size: 0.72rem;
      font-weight: 800;
    }
    .ev-card-time {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .ev-card-query {
      font-size: 0.86rem;
      color: #F8FAFC;
      font-weight: 700;
      word-break: break-word;
      margin: 4px 0;
    }
    .ev-card-keyword {
      font-size: 0.72rem;
      color: #FCA5A5;
      background: rgba(239, 68, 68, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }
    .ev-card-footer {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .btn-refresh {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #38BDF8;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 0.75rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-refresh:active { transform: scale(0.95); }

    /* ══════════════ TARJETAS DE COMPUTADORAS ══════════════ */
    .machines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .machine-card {
      background: linear-gradient(180deg, #1E293B 0%, #172033 100%);
      border: 1.5px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      transition: transform 0.15s, border-color 0.2s;
    }

    .machine-card.online { border-color: rgba(16, 185, 129, 0.65); }
    .machine-card.locked {
      background: linear-gradient(180deg, #2A1219 0%, #1F0D13 100%);
      border-color: rgba(239, 68, 68, 0.8);
    }
    .machine-card.offline { opacity: 0.48; border-color: #334155; }

    .machine-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .machine-title {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .machine-num-badge {
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, #0284C7, #0369A1);
      color: #FFF;
      font-size: 1rem;
      font-weight: 900;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(2,132,199,0.4);
      flex-shrink: 0;
    }

    .machine-card.locked .machine-num-badge {
      background: linear-gradient(135deg, #DC2626, #991B1B);
      box-shadow: 0 3px 10px rgba(220,38,38,0.4);
    }

    .machine-title h3 { font-size: 0.98rem; font-weight: 800; color: #FFF; }
    .machine-title p {
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* OPCIÓN 3: VISOR EN VIVO DE QUÉ TIENE ABIERTO CADA PC */
    .machine-activity {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 9px;
      padding: 7px 10px;
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 0.75rem;
      color: #E2E8F0;
      min-width: 0;
    }

    .machine-activity i {
      color: #38BDF8;
      font-size: 0.78rem;
      flex-shrink: 0;
    }

    .machine-activity span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      flex: 1;
    }

    .machine-alert-chip {
      background: rgba(127, 29, 29, 0.85);
      border: 1px solid #EF4444;
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 0.72rem;
      font-weight: 800;
      color: #FCA5A5;
      display: flex;
      align-items: center;
      gap: 6px;
      word-break: break-word;
    }

    .btn-renumber {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid var(--card-border);
      color: #94A3B8;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      transition: all 0.15s;
    }

    .btn-renumber:hover, .btn-renumber:active { color: #38BDF8; border-color: #38BDF8; }

    .status-pill {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 4px 9px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .pill-online { background: rgba(6, 78, 59, 0.85); color: #6EE7B7; border: 1px solid #059669; }
    .pill-locked { background: rgba(127, 29, 29, 0.85); color: #FCA5A5; border: 1px solid #DC2626; }
    .pill-offline { background: #334155; color: #94A3B8; }

    .machine-actions {
      display: grid;
      grid-template-columns: 1.2fr 1fr auto;
      gap: 6px;
    }

    .mini-btn {
      padding: 9px 8px;
      font-size: 0.76rem;
      font-weight: 800;
      border-radius: 8px;
      border: none;
      color: #FFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: transform 0.12s;
    }

    .mini-btn:active { transform: scale(0.95); }
    .mb-lock { background: linear-gradient(135deg, #EF4444, #DC2626); }
    .mb-unlock { background: linear-gradient(135deg, #10B981, #059669); }
    .mb-msg { background: linear-gradient(135deg, #F59E0B, #D97706); }
    .mb-more { background: #334155; padding: 9px 12px; }

    .empty-state {
      background: rgba(30, 41, 59, 0.55);
      border: 1.5px dashed var(--card-border);
      border-radius: 16px;
      padding: 34px 20px;
      text-align: center;
      grid-column: 1 / -1;
    }

    .empty-state i {
      font-size: 2.3rem;
      color: #38BDF8;
      margin-bottom: 10px;
      opacity: 0.8;
    }

    .empty-state h4 {
      font-size: 1rem;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .empty-state p {
      font-size: 0.82rem;
      color: var(--text-muted);
      max-width: 420px;
      margin: 0 auto;
      line-height: 1.45;
    }

    /* ══════════════ PESTAÑA HERRAMIENTAS & PROYECTOS ══════════════ */
    .section-card {
      background: rgba(30, 41, 59, 0.75);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 14px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      gap: 8px;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: 0.84rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #E2E8F0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title i { color: #38BDF8; }

    .target-selector {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.76rem;
      color: var(--text-muted);
      font-weight: 700;
    }

    .target-selector select {
      background: #0F172A;
      color: #38BDF8;
      border: 1px solid #38BDF8;
      border-radius: 8px;
      padding: 5px 10px;
      font-family: inherit;
      font-size: 0.76rem;
      font-weight: 800;
      outline: none;
    }

    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    }

    .proj-btn {
      background: linear-gradient(180deg, #1E293B, #151E2E);
      border: 1.5px solid var(--card-border);
      border-radius: 14px;
      padding: 16px 12px;
      color: #FFF;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 92px;
      transition: all 0.16s ease;
      touch-action: manipulation;
      text-align: center;
    }

    .proj-btn:hover { border-color: #475569; background: var(--card-hover); }
    .proj-btn:active { transform: scale(0.95); }
    .proj-btn i { font-size: 1.65rem; }
    .proj-btn span { font-size: 0.86rem; font-weight: 800; }
    .proj-btn small { font-size: 0.68rem; color: var(--text-muted); font-weight: 600; }

    /* Barra de Enlace Libre */
    .custom-url-box {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }

    .custom-url-box input {
      flex: 1;
      background: #0F172A;
      border: 1.5px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 14px;
      color: #FFF;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
    }

    .custom-url-box input:focus { border-color: var(--primary); }

    .custom-url-box button {
      background: linear-gradient(135deg, #3B82F6, #2563EB);
      color: #FFF;
      border: none;
      border-radius: 10px;
      padding: 12px 18px;
      font-weight: 800;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .custom-url-box button:active { transform: scale(0.95); }

    /* ══════════════ PESTAÑA JUEGOS OFFLINE ══════════════ */
    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
    }

    .game-card {
      border-radius: 16px;
      padding: 20px;
      color: #FFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1.5px solid rgba(255,255,255,0.18);
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      transition: transform 0.15s;
      text-align: left;
      width: 100%;
      font-family: inherit;
    }

    .game-card:active { transform: scale(0.97); }
    .game-surf { background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); }
    .game-dino { background: linear-gradient(135deg, #334155 0%, #1E293B 100%); }

    .game-icon {
      font-size: 2.4rem;
      width: 60px;
      height: 60px;
      background: rgba(255,255,255,0.15);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .game-info h4 { font-size: 1.05rem; font-weight: 900; margin-bottom: 4px; }
    .game-info p { font-size: 0.76rem; opacity: 0.88; line-height: 1.35; }

    /* ══════════════ PESTAÑA AULA, VOLUMEN 50% & DETECTOR GOOGLE ══════════════ */
    .volume-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
    }

    .vol-btn {
      border-radius: 12px;
      padding: 14px 12px;
      font-family: inherit;
      font-size: 0.86rem;
      font-weight: 800;
      color: #FFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1.5px solid transparent;
      transition: transform 0.15s;
    }

    .vol-btn:active { transform: scale(0.96); }
    .vol-50 {
      background: linear-gradient(135deg, #0284C7, #0369A1);
      border-color: #38BDF8;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }
    .vol-25 {
      background: #0F172A;
      border-color: #38BDF8;
      color: #38BDF8;
    }
    .vol-0 {
      background: #0F172A;
      border-color: #A78BFA;
      color: #C4B5FD;
    }

    .guard-toggle-btn {
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
      border: none;
      cursor: pointer;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .guard-on {
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
      border: 1px solid #10B981;
    }

    .guard-off {
      background: rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      border: 1px solid #EF4444;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
    }

    .alert-item {
      background: #0F172A;
      border: 1px solid rgba(239, 68, 68, 0.45);
      border-left: 4px solid #EF4444;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .alert-item-info {
      min-width: 0;
      flex: 1;
    }

    .alert-item-info strong {
      font-size: 0.84rem;
      color: #FCA5A5;
    }

    .alert-item-info span {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-left: 6px;
    }

    .alert-item-query {
      font-size: 0.88rem;
      color: #FDE047;
      font-weight: 800;
      margin-top: 3px;
      word-break: break-word;
    }

    .preset-msgs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .preset-msg-btn {
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 14px;
      color: #F8FAFC;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.15s;
    }

    .preset-msg-btn:hover { border-color: #F59E0B; background: rgba(245, 158, 11, 0.08); }
    .preset-msg-btn:active { transform: scale(0.97); }
    .preset-msg-btn i { color: #F59E0B; font-size: 1.05rem; flex-shrink: 0; }

    .aux-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }

    .aux-btn {
      background: #0F172A;
      border: 1.5px solid var(--card-border);
      border-radius: 12px;
      padding: 14px 12px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.84rem;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s;
    }

    .aux-btn:active { transform: scale(0.96); }

    /* ══════════════ BARRA TÁCTIL FIJA INFERIOR ══════════════ */
    .thumb-control-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--thumb-bar-h);
      background: rgba(11, 17, 32, 0.94);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1.5px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px)) 14px;
      z-index: 500;
      box-shadow: 0 -8px 24px rgba(0,0,0,0.55);
    }

    .thumb-bar-inner {
      width: 100%;
      max-width: 1120px;
      display: flex;
      gap: 10px;
    }

    .thumb-btn {
      flex: 1;
      height: 52px;
      border: none;
      border-radius: 12px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.9rem;
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

    .thumb-btn:active { transform: scale(0.95); }
    .thumb-lock { background: linear-gradient(135deg, #EF4444, #B91C1C); border: 1px solid #F87171; }
    .thumb-msg { flex: 0.65; background: #1E293B; border: 1px solid #475569; color: #F8FAFC; }
    .thumb-unlock { background: linear-gradient(135deg, #10B981, #047857); border: 1px solid #34D399; }

    /* ══════════════ MODALES ══════════════ */
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
      border-radius: 16px;
      padding: 20px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 12px 36px rgba(0,0,0,0.6);
    }

    .modal-box h3 { font-size: 1.12rem; margin-bottom: 6px; }
    .modal-box p { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px; }

    .modal-box textarea {
      width: 100%;
      height: 88px;
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 10px;
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
      font-family: inherit;
    }

    .mbtn-cancel { background: #475569; color: #FFF; }
    .mbtn-send { background: var(--primary); color: #FFF; }

    .qr-container { text-align: center; padding: 10px 0; }
    .qr-container img {
      width: 220px;
      height: 220px;
      border-radius: 12px;
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

    #toast {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: #10B981;
      color: #FFF;
      padding: 9px 20px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.84rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.45);
      display: none;
      z-index: 2000;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Encabezado Superior -->
    <header>
      <div class="brand">
        <div class="brand-icon"><i class="fas fa-robot"></i></div>
        <div class="brand-titles">
          <h1>Control de Aula Maker</h1>
          <div class="brand-sub">
            <span style="font-size:0.74rem;color:var(--text-muted);font-weight:600;">Colegio Paulo Freire</span>
            <span class="conn-badge" id="conn-badge">
              <span class="dot-live"></span>
              <span id="conn-text">En línea</span>
            </span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-qr-modal" onclick="abrirModalQR()" title="Ver código QR para celular">
          <i class="fas fa-qrcode"></i> <span>Conectar Celular</span>
        </button>
      </div>
    </header>

    <!-- Banner de Alerta Instantánea cuando alguien busca en Google -->
    <div class="google-alert-banner" id="google-alert-banner">
      <div class="gab-left">
        <div class="gab-icon"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="gab-text">
          <h4 id="gab-title">🚫 Búsqueda en Google detectada</h4>
          <p id="gab-desc">PC 01 buscó: "..."</p>
        </div>
      </div>
      <div class="gab-actions">
        <button class="gab-btn" style="background:#EF4444;" id="gab-lock-btn">
          <i class="fas fa-lock"></i> Bloquear PC
        </button>
        <button class="gab-btn" style="background:#334155;" onclick="cambiarTab('aula')">
          <i class="fas fa-list"></i> Ver Historial
        </button>
        <button class="gab-btn" style="background:#1E293B;" onclick="limpiarAlertasGoogle()" title="Descartar alertas">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- KPIs de Resumen Rápido -->
    <div class="status-summary">
      <div class="summary-pill sp-online" onclick="cambiarTab('equipos'); filtrarEquipos('online');">
        <i class="fas fa-signal"></i>
        <div class="summary-text">
          <span>En Línea</span>
          <strong id="stat-online">0</strong>
        </div>
      </div>
      <div class="summary-pill sp-locked" onclick="cambiarTab('equipos'); filtrarEquipos('locked');">
        <i class="fas fa-lock"></i>
        <div class="summary-text">
          <span>Bloqueadas</span>
          <strong id="stat-locked">0</strong>
        </div>
      </div>
      <div class="summary-pill sp-total" onclick="cambiarTab('equipos'); filtrarEquipos('all');">
        <i class="fas fa-laptop-code"></i>
        <div class="summary-text">
          <span>Total PCs</span>
          <strong id="stat-total">0</strong>
        </div>
      </div>
    </div>

    <!-- Barra de Pestañas (Tabs) -->
    <nav class="tabs-nav">
      <button class="tab-btn active" id="tabbtn-equipos" onclick="cambiarTab('equipos')">
        <i class="fas fa-desktop"></i>
        <span>Equipos</span>
        <span class="tab-badge" id="badge-equipos">0</span>
      </button>
      <button class="tab-btn" id="tabbtn-herramientas" onclick="cambiarTab('herramientas')">
        <i class="fas fa-rocket"></i>
        <span>Web & Apps</span>
      </button>
      <button class="tab-btn" id="tabbtn-juegos" onclick="cambiarTab('juegos')">
        <i class="fas fa-gamepad"></i>
        <span>Recreo</span>
      </button>
      <button class="tab-btn" id="tabbtn-aula" onclick="cambiarTab('aula')">
        <i class="fas fa-shield-alt"></i>
        <span>Reglas & Aula</span>
        <span class="tab-badge badge-danger" id="badge-alertas" style="display:none;">0</span>
      </button>
      <button class="tab-btn" id="tabbtn-evidencias" onclick="cambiarTab('evidencias')">
        <i class="fas fa-camera"></i>
        <span>Evidencias</span>
        <span class="tab-badge badge-danger" id="badge-evidencias" style="display:none;">0</span>
      </button>
      <button class="tab-btn" id="tabbtn-archivos" onclick="cambiarTab('archivos')">
        <i class="fas fa-folder-open"></i>
        <span>Archivos</span>
        <span class="tab-badge" id="badge-trabajos" style="display:none;background:#10B981;">0</span>
      </button>
    </nav>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 1: EQUIPOS CONECTADOS + VENTANA ACTIVA EN VIVO
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel active" id="panel-equipos">
      <div class="toolbar-equipos">
        <div class="filter-pills">
          <button class="filter-btn active" id="flt-all" onclick="filtrarEquipos('all')">Todas</button>
          <button class="filter-btn" id="flt-online" onclick="filtrarEquipos('online')">🟢 Activas</button>
          <button class="filter-btn" id="flt-locked" onclick="filtrarEquipos('locked')">🔒 Bloqueadas</button>
        </div>
        <div class="toolbar-right-btns">
          <button class="btn-power-quick" onclick="abrirModalEnergia()" title="Apagar o reiniciar las computadoras del taller">
            <i class="fas fa-power-off"></i> Energía
          </button>
          <button class="btn-vol50-quick" onclick="enviarComando('all', 'set_volume', {level: 50})" title="Poner volumen de todas las PCs al 50% (Regla de la sala)">
            <i class="fas fa-volume-down"></i> Vol 50%
          </button>
          <button class="btn-refresh" onclick="cargarEstado(true)">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>
      </div>

      <div class="machines-grid" id="machines-container">
        <div class="empty-state">
          <i class="fas fa-satellite-dish"></i>
          <h4>Esperando computadoras del taller...</h4>
          <p>Ejecutá <strong>iniciar_alumno.bat</strong> en las máquinas de los alumnos y aparecerán aquí automáticamente.</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 2: HERRAMIENTAS & PLATAFORMAS WEB
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel" id="panel-herramientas">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-compass"></i> Plataformas del Taller</div>
          <div class="target-selector">
            <span>Abrir en:</span>
            <select id="web-target-select">
              <option value="all">🌍 Todas las PCs</option>
            </select>
          </div>
        </div>

        <div class="project-grid">
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://roboticapaulofreire-uy.github.io/bienvenido/')">
            <i class="fas fa-newspaper" style="color:#F59E0B;"></i>
            <span>El Diario</span>
            <small>Portal del Taller</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://scratch.mit.edu/projects/editor/')">
            <i class="fas fa-cat" style="color:#F97316;"></i>
            <span>Scratch</span>
            <small>Bloques & Juegos</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://makecode.microbit.org/')">
            <i class="fas fa-microchip" style="color:#10B981;"></i>
            <span>MakeCode</span>
            <small>Placa micro:bit</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://www.paperme.de/paperme/default/')">
            <i class="fas fa-cube" style="color:#EA580C;"></i>
            <span>PaperMe</span>
            <small>Avatar Papercraft</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://sketch.metademolab.com/canvas')">
            <i class="fas fa-running" style="color:#3B82F6;"></i>
            <span>Animated</span>
            <small>Animar Dibujos</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://www.tinkercad.com/')">
            <i class="fas fa-cubes" style="color:#06B6D4;"></i>
            <span>Tinkercad</span>
            <small>3D & Arduino</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://www.canva.com')">
            <i class="fas fa-palette" style="color:#8B5CF6;"></i>
            <span>Canva</span>
            <small>Diseño & Pósters</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://surf.jackbuehner.com/')">
            <i class="fas fa-water" style="color:#38BDF8;"></i>
            <span>Surf Edge</span>
            <small>Juego con Internet</small>
          </button>
          <button class="proj-btn" onclick="lanzarUrlSeleccion('https://chromedino.com/')">
            <i class="fas fa-dragon" style="color:#10B981;"></i>
            <span>Dino Google</span>
            <small>Juego con Internet</small>
          </button>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-globe"></i> Enviar Cualquier Dirección Web</div>
        </div>
        <div class="custom-url-box">
          <input type="url" id="inp-custom-url" placeholder="Pegá o escribí un enlace (ej: wikipedia.org)...">
          <button onclick="lanzarUrlPersonalizada()"><i class="fas fa-paper-plane"></i> Abrir</button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 3: RECREO (JUEGOS CON INTERNET Y SIN INTERNET)
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel" id="panel-juegos">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-globe"></i> Juegos de Recreo CON Internet (Apertura Instantánea)</div>
          <div class="target-selector">
            <span>Lanzar en:</span>
            <select id="game-target-select">
              <option value="all">🌍 Todas las PCs</option>
            </select>
          </div>
        </div>

        <div class="games-grid">
          <button class="game-card game-surf" onclick="lanzarJuegoWebSeleccion('https://surf.jackbuehner.com/')">
            <div class="game-icon">🏄‍♂️</div>
            <div class="game-info">
              <h4>Surf Edge (Con Internet)</h4>
              <p>Abre el juego de <strong>Surf de Edge</strong> directo por web en cualquier navegador.</p>
            </div>
          </button>

          <button class="game-card game-dino" style="background:linear-gradient(135deg, #059669 0%, #047857 100%);" onclick="lanzarJuegoWebSeleccion('https://chromedino.com/')">
            <div class="game-icon">🦖</div>
            <div class="game-info">
              <h4>Dino de Google (Con Internet)</h4>
              <p>Abre el <strong>Dinosaurio T-Rex de Google</strong> directo por web en 1 toque.</p>
            </div>
          </button>
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-wifi-slash"></i> Modo Sin Internet (Internos del Navegador)</div>
        </div>
        <div class="games-grid">
          <button class="game-card" style="background:#1E293B;" onclick="lanzarJuegoSeleccion('surf')">
            <div class="game-icon">🌊</div>
            <div class="game-info">
              <h4>Surf Offline (edge://surf)</h4>
              <p>Usa el juego interno de Microsoft Edge cuando no hay conexión a internet.</p>
            </div>
          </button>

          <button class="game-card" style="background:#1E293B;" onclick="lanzarJuegoSeleccion('dino')">
            <div class="game-icon">🌵</div>
            <div class="game-info">
              <h4>Dino Offline (chrome://dino)</h4>
              <p>Usa el juego interno de Google Chrome cuando no hay conexión a internet.</p>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 4: REGLAS DE SALA (VOL 50%, ANTI-GOOGLE) & AVISOS
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel" id="panel-aula">
      <!-- REGLA 1: VOLUMEN AL 50% -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-volume-up"></i> Regla de la Sala: Control de Volumen</div>
        </div>
        <div class="volume-grid">
          <button class="vol-btn vol-50" onclick="enviarComando('all', 'set_volume', {level: 50})">
            <i class="fas fa-volume-down"></i>
            <span>🔊 Volumen al 50% (Regla de Sala)</span>
          </button>
          <button class="vol-btn vol-25" onclick="enviarComando('all', 'set_volume', {level: 25})">
            <i class="fas fa-volume-off"></i>
            <span>🔉 Volumen Bajo (25%)</span>
          </button>
          <button class="vol-btn vol-0" onclick="enviarComando('all', 'set_volume', {level: 0})">
            <i class="fas fa-volume-mute"></i>
            <span>🔇 Silenciar Todo (0%)</span>
          </button>
        </div>
      </div>

      <!-- REGLA NUEVA: MODO FOCO (LISTA BLANCA DE NAVEGACIÓN) -->
      <div class="section-card" style="border: 1.5px solid rgba(56, 189, 248, 0.4);">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-bullseye" style="color:#38BDF8;"></i>
            <span>Modo Foco: Lista Blanca de Navegación</span>
          </div>
          <button class="guard-toggle-btn" id="btn-toggle-foco" onclick="alternarModoFoco()">
            <i class="fas fa-circle"></i> Foco Desactivado
          </button>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">
          Permite únicamente los sitios y programas de la clase. Si un alumno abre YouTube, Roblox o juegos, la ventana se minimiza automáticamente y el robot le avisa que vuelva a la tarea.
        </p>
        <div style="font-size:0.78rem;font-weight:bold;color:#38BDF8;margin-bottom:6px;">
          🎯 Seleccionar programa o sitio para la clase de hoy:
        </div>
        <div class="focus-presets-grid">
          <button class="focus-preset-btn active" id="fpreset-scratch" onclick="aplicarPresetFoco('Scratch y Programación', ['scratch', 'scratch.mit.edu', 'mit.edu'])">
            🐱 Scratch
          </button>
          <button class="focus-preset-btn" id="fpreset-tinkercad" onclick="aplicarPresetFoco('Tinkercad 3D y Circuitos', ['tinkercad', 'tinkercad.com', 'autodesk'])">
            🤖 Tinkercad
          </button>
          <button class="focus-preset-btn" id="fpreset-microbit" onclick="aplicarPresetFoco('Micro:bit y Robótica', ['makecode', 'microbit', 'microbit.org'])">
            💻 Micro:bit
          </button>
          <button class="focus-preset-btn" id="fpreset-freire" onclick="aplicarPresetFoco('Portal Paulo Freire', ['roboticapaulofreire-uy.github.io', 'paulofreire', 'bienvenido'])">
            🏫 Portal Freire
          </button>
          <button class="focus-preset-btn" id="fpreset-ceibal" onclick="aplicarPresetFoco('Ceibal y Educación', ['ceibal.edu.uy', 'uruguayeduca', 'wikipedia.org'])">
            📖 Ceibal / Educa
          </button>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <input type="text" id="inp-foco-custom" placeholder="O escribe palabras clave o dominios permitidos (ej: canva, geogebra)..." style="flex:1;background:#0F172A;border:1px solid var(--card-border);border-radius:8px;padding:8px 12px;color:#FFF;font-size:0.8rem;outline:none;">
          <button class="aux-btn" style="padding:8px 14px;background:#0284C7;color:#FFF;border:none;" onclick="guardarFocoPersonalizado()">
            Aplicar
          </button>
        </div>
        <div id="foco-status-msg" style="margin-top:8px;font-size:0.75rem;color:#94A3B8;">
          Estado actual: Libre navegación (solo vigilando búsquedas indebidas)
        </div>
      </div>

      <!-- REGLA 2: DETECTOR DE BÚSQUEDAS EN GOOGLE -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-shield-alt" style="color:#EF4444;"></i>
            <span>Detector de Búsquedas en Google</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="guard-toggle-btn guard-on" id="btn-toggle-google" onclick="alternarVigilanciaGoogle()">
              <i class="fas fa-check-circle"></i> Vigilancia Activa
            </button>
            <button class="btn-refresh" onclick="limpiarAlertasGoogle()" title="Limpiar historial">
              <i class="fas fa-trash-alt"></i> Limpiar
            </button>
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">
          Cuando un alumno intenta buscar en Google, se cierra la pestaña automáticamente, le aparece una advertencia en su pantalla y queda registrado aquí lo que buscó:
        </p>
        <div class="alerts-list" id="alerts-history-list">
          <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.8rem;">
            ✅ Ninguna búsqueda prohibida detectada hasta el momento.
          </div>
        </div>
      </div>

      <!-- AVISOS INSTANTÁNEOS -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-bolt"></i> Avisos Instantáneos en 1 Toque</div>
        </div>
        <div class="preset-msgs-grid">
          <button class="preset-msg-btn" onclick="enviarComando('all', 'message', {texto: '👀 ¡Atención al pizarrón por favor! Soltamos el mouse un momento.'})">
            <i class="fas fa-eye"></i>
            <span>👀 ¡Atención al pizarrón por favor!</span>
          </button>
          <button class="preset-msg-btn" onclick="enviarComando('all', 'message', {texto: '⏳ ¡Quedan 5 minutos! Vayan guardando su proyecto y ordenando los componentes del kit.'})">
            <i class="fas fa-hourglass-half"></i>
            <span>⏳ Quedan 5 min (Guardar y ordenar kit)</span>
          </button>
          <button class="preset-msg-btn" onclick="enviarComando('all', 'message', {texto: '💾 ¡Importante! Recuerden guardar los avances de su proyecto ahora.'})">
            <i class="fas fa-save"></i>
            <span>💾 ¡Recuerden guardar su trabajo ahora!</span>
          </button>
          <button class="preset-msg-btn" onclick="enviarComando('all', 'message', {texto: '🔉 Recuerden la regla de la sala: volumen máximo al 50% y sin usar buscadores.'})">
            <i class="fas fa-volume-down"></i>
            <span>🔉 Recordar regla: Volumen 50% y sin Google</span>
          </button>
        </div>
        <button class="aux-btn" style="width:100%;border-color:#F59E0B;color:#FBBF24;" onclick="abrirModalMensaje('all')">
          <i class="fas fa-pen"></i> Escribir un Aviso Personalizado...
        </button>
      </div>

      <div class="section-card">
        <div class="section-header">
          <div class="section-title"><i class="fas fa-sliders-h"></i> Cierre de Clase & Control de Energía</div>
        </div>
        <div class="aux-actions-grid" style="grid-template-columns: 1fr 1fr; gap:10px;">
          <button class="aux-btn" onclick="confirmarAccionEnergia('shutdown')" style="background:rgba(239,68,68,0.12);border-color:#EF4444;color:#FCA5A5;padding:14px;">
            <i class="fas fa-power-off" style="color:#EF4444;"></i> 🔴 Apagar Todas las PCs (Fin de Día)
          </button>
          <button class="aux-btn" onclick="confirmarAccionEnergia('reboot')" style="background:rgba(56,189,248,0.12);border-color:#38BDF8;color:#7DD3FC;padding:14px;">
            <i class="fas fa-sync-alt" style="color:#38BDF8;"></i> 🔄 Reiniciar Todas (Cambio de Grupo)
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 5: GALERÍA VISUAL DE EVIDENCIAS FOTOGRÁFICAS
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel" id="panel-evidencias">
      <div class="evidence-toolbar">
        <div class="evidence-stats">
          <div class="ev-pill"><i class="fas fa-camera"></i> <span id="ev-total-count">0</span> evidencias registradas</div>
          <div class="ev-pill ev-grave"><i class="fas fa-exclamation-triangle"></i> <span id="ev-grave-count">0</span> faltas desubicadas</div>
        </div>
        <div class="evidence-actions">
          <button class="btn-report-print" onclick="window.open('/api/reporte_evidencias', '_blank')">
            <i class="fas fa-print"></i> Imprimir Acta para Dirección
          </button>
          <button class="btn-clear-ev" onclick="confirmarBorradoTodasEvidencias()">
            <i class="fas fa-trash-alt"></i> Limpiar Todo
          </button>
        </div>
      </div>

      <div class="evidence-filter-bar">
        <span>Filtrar:</span>
        <button class="filter-btn active" id="evflt-all" onclick="filtrarEvidencias('all')">Todas</button>
        <button class="filter-btn" id="evflt-grave" onclick="filtrarEvidencias('grave')">🚨 Solo Desubicadas</button>
        <button class="filter-btn" id="evflt-foto" onclick="filtrarEvidencias('foto')">📸 Con Fotografía</button>
      </div>

      <div class="evidence-gallery-grid" id="evidence-gallery-container">
        <div class="empty-state">
          <i class="fas fa-camera"></i>
          <h4>No hay evidencias fotográficas registradas</h4>
          <p>Cuando un alumno intente realizar una búsqueda indebida, la cámara web capturará la fotografía automáticamente y aparecerá aquí.</p>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════════════════════
         PESTAÑA 6: REPARTIR Y RECOLECTAR TRABAJOS (OPCIÓN 4)
         ═══════════════════════════════════════════════════════════ -->
    <section class="tab-panel" id="panel-archivos">
      <!-- SECCIÓN A: REPARTIR ARCHIVO A LOS ALUMNOS -->
      <div class="section-card" style="border:1.5px solid rgba(16, 185, 129, 0.4);">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-paper-plane" style="color:#10B981;"></i>
            <span>📤 Repartir Archivo a los Alumnos</span>
          </div>
          <div class="target-selector">
            <span>Enviar a:</span>
            <select id="file-dist-target-select">
              <option value="all">🌍 Todas las computadoras</option>
            </select>
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">
          Selecciona un archivo de tu PC (guía PDF, plantilla de Scratch <code>.sb3</code>, imagen o código) y se enviará directo al Escritorio de los alumnos con un aviso en sus pantallas.
        </p>
        <div style="background:#0F172A;border:2px dashed #334155;border-radius:12px;padding:18px;text-align:center;margin-bottom:12px;" id="dropzone-dist">
          <i class="fas fa-cloud-upload-alt" style="font-size:2rem;color:#10B981;margin-bottom:8px;"></i>
          <div style="font-size:0.86rem;font-weight:700;color:#FFF;margin-bottom:4px;">Haz clic para seleccionar el archivo a repartir</div>
          <div style="font-size:0.74rem;color:#64748B;" id="file-dist-selected-name">Ningún archivo seleccionado todavía</div>
          <input type="file" id="inp-file-dist" style="display:none;" onchange="onArchivoSeleccionado(this)">
          <button class="aux-btn" style="margin-top:10px;background:#1E293B;color:#38BDF8;border-color:#38BDF8;padding:8px 16px;" onclick="document.getElementById('inp-file-dist').click()">
            <i class="fas fa-file-upload"></i> Explorar Archivos...
          </button>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div style="font-size:0.78rem;color:#94A3B8;">Guardar en los alumnos:</div>
          <select id="file-dist-dest" style="background:#0F172A;border:1px solid var(--card-border);border-radius:6px;padding:6px 10px;color:#FFF;font-size:0.78rem;outline:none;">
            <option value="escritorio">🖥️ Escritorio (Desktop)</option>
            <option value="mis_trabajos">📁 Carpeta "Mis Trabajos"</option>
            <option value="descargas">📥 Carpeta Descargas</option>
          </select>
          <button class="btn-report-print" style="margin-left:auto;padding:10px 20px;font-size:0.82rem;" id="btn-enviar-archivo" onclick="enviarArchivoAlumnos()" disabled>
            <i class="fas fa-paper-plane"></i> 🚀 Enviar Archivo Ahora
          </button>
        </div>
      </div>

      <!-- SECCIÓN B: RECOLECTAR TRABAJOS DE LOS ALUMNOS -->
      <div class="section-card" style="border:1.5px solid rgba(56, 189, 248, 0.4);">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-inbox" style="color:#38BDF8;"></i>
            <span>📥 Recolectar Trabajos de los Alumnos</span>
          </div>
          <div class="evidence-actions">
            <button class="btn-report-print" style="background:#0284C7;border-color:#38BDF8;" onclick="abrirCarpetaTrabajos()" title="Abre la carpeta en tu computadora">
              <i class="fas fa-folder-open"></i> Abrir Carpeta en PC
            </button>
            <button class="btn-report-print" onclick="window.open('/api/descargar_trabajos_zip', '_blank')" title="Descarga un ZIP con todos los trabajos">
              <i class="fas fa-file-archive"></i> Descargar Todo en ZIP
            </button>
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px;">
          Pide automáticamente a las netbooks de los alumnos que entreguen sus proyectos creados hoy. Se organizan automáticamente en carpetas por número de PC.
        </p>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
          <button class="aux-btn" style="background:linear-gradient(135deg, #0284C7, #0369A1);color:#FFF;border:none;padding:10px 18px;font-weight:bold;" onclick="iniciarRecoleccion()">
            <i class="fas fa-download"></i> 📥 Recolectar Trabajos Ahora
          </button>
          <button class="aux-btn" style="background:#1E293B;color:#94A3B8;border:1px solid var(--card-border);" onclick="cargarTrabajosRecibidos(true)">
            <i class="fas fa-sync-alt"></i> Actualizar Lista
          </button>
        </div>

        <div style="font-size:0.78rem;font-weight:bold;color:#38BDF8;margin-bottom:8px;">
          📋 Trabajos Entregados por los Alumnos:
        </div>
        <div class="alerts-list" id="trabajos-list-container">
          <div style="text-align:center;padding:18px;color:var(--text-muted);font-size:0.8rem;">
            Ningún trabajo recolectado aún. Presiona <strong>"Recolectar Trabajos Ahora"</strong> para pedir los archivos de las máquinas.
          </div>
        </div>
      </div>
    </section>
  </div>

  <!-- Modal Control de Energía Masivo -->
  <div class="modal-overlay" id="modal-energia">
    <div class="modal-box" style="border-color:#EF4444;max-width:460px;">
      <h3 style="color:#EF4444;"><i class="fas fa-power-off"></i> Control de Energía Masivo</h3>
      <p id="modal-energia-desc" style="color:#FCA5A5;font-size:0.85rem;">
        ¿Qué acción deseas realizar en las computadoras conectadas del aula?
      </p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
        <button class="aux-btn" style="background:linear-gradient(135deg, #DC2626, #991B1B);color:#FFF;padding:12px;font-size:0.92rem;font-weight:bold;border:none;border-radius:10px;text-align:left;" onclick="ejecutarEnergia('shutdown')">
          <i class="fas fa-power-off"></i> 🔴 Apagar Todas las PCs (Fin de Jornada)
        </button>
        <button class="aux-btn" style="background:linear-gradient(135deg, #0284C7, #0369A1);color:#FFF;padding:12px;font-size:0.92rem;font-weight:bold;border:none;border-radius:10px;text-align:left;" onclick="ejecutarEnergia('reboot')">
          <i class="fas fa-sync-alt"></i> 🔄 Reiniciar Todas las PCs (Cambio de Turno)
        </button>
      </div>
      <div class="modal-btns">
        <button class="mbtn-cancel" onclick="cerrarModalEnergia()">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- Modal Lightbox para Ampliar Fotografía -->
  <div class="modal-overlay" id="modal-lightbox" onclick="cerrarLightbox()">
    <div style="position:relative;max-width:85vw;max-height:85vh;text-align:center;" onclick="event.stopPropagation()">
      <button style="position:absolute;top:-12px;right:-12px;background:#EF4444;color:#FFF;border:none;border-radius:50%;width:34px;height:34px;font-weight:bold;cursor:pointer;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.5);" onclick="cerrarLightbox()">✕</button>
      <img id="lightbox-img" src="" style="max-width:100%;max-height:80vh;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.8);border:2px solid #38BDF8;">
      <div id="lightbox-caption" style="margin-top:10px;color:#FFF;font-size:0.9rem;font-weight:bold;background:rgba(15,23,42,0.85);padding:8px 16px;border-radius:8px;"></div>
    </div>
  </div>

  <!-- Modal Asignar / Cambiar Número de Máquina -->
  <div class="modal-overlay" id="modal-renumber">
    <div class="modal-box">
      <h3>🔢 Asignar Número a esta Computadora</h3>
      <p id="modal-renumber-info">Máquina seleccionada</p>
      <input type="number" id="inp-new-number" min="1" max="99" style="width:100%;background:#0F172A;border:1.5px solid var(--primary);border-radius:10px;padding:12px;font-size:1.3rem;font-weight:900;color:#FFF;text-align:center;margin-bottom:14px;outline:none;" placeholder="Ej: 1, 2, 3...">
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
        <button class="aux-btn" style="background:#0369A1;border-color:#38BDF8;padding:12px;" onclick="enviarAccionIndividual('set_volume', {level:50})">
          <i class="fas fa-volume-down"></i> Poner Volumen al 50% en esta PC
        </button>
        <button class="aux-btn" style="background:#334155;padding:12px;" onclick="enviarAccionIndividual('set_volume', {level:0})">
          <i class="fas fa-volume-mute" style="color:#A78BFA;"></i> Silenciar solo esta PC (0%)
        </button>
        <button class="aux-btn" style="background:#0284C7;border-color:#38BDF8;padding:12px;" onclick="enviarAccionIndividual('open_url', {url:'https://surf.jackbuehner.com/'})">
          <i class="fas fa-water"></i> Abrir Surf Edge (Con Internet) en esta PC
        </button>
        <button class="aux-btn" style="background:#059669;border-color:#34D399;padding:12px;" onclick="enviarAccionIndividual('open_url', {url:'https://chromedino.com/'})">
          <i class="fas fa-dragon" style="color:#FDE047;"></i> Abrir Dino Google (Con Internet) en esta PC
        </button>
        <button class="aux-btn" style="background:#1E293B;border-color:#3B82F6;padding:12px;" onclick="enviarAccionIndividual('open_url', {url:'https://roboticapaulofreire-uy.github.io/bienvenido/'})">
          <i class="fas fa-newspaper" style="color:#F59E0B;"></i> Abrir El Diario solo en esta PC
        </button>
        <button class="aux-btn" style="background:#0284C7;border-color:#38BDF8;padding:12px;" onclick="enviarAccionIndividual('reboot', {})">
          <i class="fas fa-sync-alt" style="color:#7DD3FC;"></i> Reiniciar solo esta PC
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
    var activeFilter = 'all';
    var lastMachinesList = [];
    var lastAlertTimestamp = 0;
    var googleGuardEnabled = true;

    function escaparHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function cambiarTab(tabName) {
      var tabs = ['equipos', 'herramientas', 'juegos', 'aula', 'evidencias', 'archivos'];
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        var btn = document.getElementById('tabbtn-' + t);
        var panel = document.getElementById('panel-' + t);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (panel) panel.classList.toggle('active', t === tabName);
      }
    }

    function filtrarEquipos(filtro) {
      activeFilter = filtro;
      document.getElementById('flt-all').classList.toggle('active', filtro === 'all');
      document.getElementById('flt-online').classList.toggle('active', filtro === 'online');
      document.getElementById('flt-locked').classList.toggle('active', filtro === 'locked');
      renderizarEquipos(lastMachinesList);
    }

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
      .catch(function() {
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
      if (action === 'reboot' && !confirm('¿Estás seguro de reiniciar la PC ' + indivTargetNum + '?')) return;
      enviarComando(indivTargetId, action, params);
      cerrarModalIndividual();
    }

    function abrirModalEnergia() {
      var cant = lastMachinesList ? lastMachinesList.filter(function(m){return m.online;}).length : 0;
      document.getElementById('modal-energia-desc').textContent = 'Hay ' + cant + ' computadoras activas conectadas en el aula.';
      document.getElementById('modal-energia').classList.add('open');
    }

    function cerrarModalEnergia() {
      document.getElementById('modal-energia').classList.remove('open');
    }

    function ejecutarEnergia(tipo) {
      cerrarModalEnergia();
      if (tipo === 'shutdown') {
        if (confirm('🚨 ¿Estás completamente seguro de APAGAR todas las computadoras del taller?\nLos alumnos verán un aviso de despedida de 10 segundos.')) {
          enviarComando('all', 'shutdown', {});
        }
      } else if (tipo === 'reboot') {
        if (confirm('🔄 ¿Estás seguro de REINICIAR todas las computadoras del taller para el cambio de turno?\nLos equipos se reiniciarán en 10 segundos.')) {
          enviarComando('all', 'reboot', {});
        }
      }
    }

    /* ══════════════ MODO FOCO JS ══════════════ */
    var modoFocoData = { activo: false, nombre: 'Scratch y Programación', permitidos: ['scratch', 'scratch.mit.edu'] };

    function actualizarUIModoFoco(mf) {
      if (!mf) return;
      modoFocoData = mf;
      var btn = document.getElementById('btn-toggle-foco');
      var statusMsg = document.getElementById('foco-status-msg');
      if (btn) {
        if (mf.activo) {
          btn.className = 'guard-toggle-btn guard-on';
          btn.innerHTML = '<i class="fas fa-check-circle"></i> Foco Activo';
        } else {
          btn.className = 'guard-toggle-btn';
          btn.innerHTML = '<i class="fas fa-circle"></i> Foco Desactivado';
        }
      }
      if (statusMsg) {
        if (mf.activo) {
          statusMsg.innerHTML = '🟢 <strong>MODO FOCO ACTIVO:</strong> Solo permitido <em>"' + escaparHtml(mf.nombre) + '"</em> (' + escaparHtml(mf.permitidos.join(', ')) + '). Si abren otra página, se minimiza sola.';
          statusMsg.style.color = '#38BDF8';
        } else {
          statusMsg.innerHTML = '⚪ Estado actual: Libre navegación (solo vigilando búsquedas indebidas)';
          statusMsg.style.color = '#94A3B8';
        }
      }
    }

    function alternarModoFoco() {
      var nuevoEstado = !modoFocoData.activo;
      fetch('/api/set_focus_mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: nuevoEstado,
          nombre: modoFocoData.nombre || 'Scratch y Programación',
          permitidos: modoFocoData.permitidos || ['scratch', 'scratch.mit.edu']
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.modo_foco) actualizarUIModoFoco(d.modo_foco);
        toast(nuevoEstado ? '🎯 Modo Foco Activado' : '🔓 Modo Foco Desactivado', nuevoEstado ? '#0284C7' : '#64748B');
      });
    }

    function aplicarPresetFoco(nombre, permitidos) {
      var presets = ['scratch', 'tinkercad', 'microbit', 'freire', 'ceibal'];
      presets.forEach(function(p) {
        var el = document.getElementById('fpreset-' + p);
        if (el) el.classList.remove('active');
      });
      fetch('/api/set_focus_mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: true,
          nombre: nombre,
          permitidos: permitidos
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.modo_foco) actualizarUIModoFoco(d.modo_foco);
        toast('🎯 Foco asignado: ' + nombre, '#0284C7');
      });
    }

    function guardarFocoPersonalizado() {
      var val = document.getElementById('inp-foco-custom').value.trim();
      if (!val) return;
      var lista = val.split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
      fetch('/api/set_focus_mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: true,
          nombre: 'Sitios Personalizados',
          permitidos: lista
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.modo_foco) actualizarUIModoFoco(d.modo_foco);
        toast('🎯 Foco personalizado activo', '#0284C7');
      });
    }

    /* ══════════════ GALERÍA DE EVIDENCIAS JS ══════════════ */
    var filtroEvidenciasActivo = 'all';
    var listaEvidenciasGlobal = [];

    function filtrarEvidencias(filtro) {
      filtroEvidenciasActivo = filtro;
      document.getElementById('evflt-all').classList.toggle('active', filtro === 'all');
      document.getElementById('evflt-grave').classList.toggle('active', filtro === 'grave');
      document.getElementById('evflt-foto').classList.toggle('active', filtro === 'foto');
      renderizarGaleriaEvidencias(listaEvidenciasGlobal);
    }

    function renderizarGaleriaEvidencias(alertas) {
      listaEvidenciasGlobal = alertas || [];
      var badge = document.getElementById('badge-evidencias');
      if (badge) {
        if (alertas.length > 0) {
          badge.style.display = 'inline-block';
          badge.textContent = alertas.length;
        } else {
          badge.style.display = 'none';
        }
      }

      var totalCount = document.getElementById('ev-total-count');
      var graveCount = document.getElementById('ev-grave-count');
      var graves = alertas.filter(function(a){ return !!a.grave; }).length;
      if (totalCount) totalCount.textContent = alertas.length;
      if (graveCount) graveCount.textContent = graves;

      var cont = document.getElementById('evidence-gallery-container');
      if (!cont) return;

      var filtradas = alertas.filter(function(a) {
        if (filtroEvidenciasActivo === 'grave') return !!a.grave;
        if (filtroEvidenciasActivo === 'foto') return !!a.foto;
        return true;
      });

      if (filtradas.length === 0) {
        cont.innerHTML = '<div class="empty-state">' +
          '<i class="fas fa-camera"></i>' +
          '<h4>No hay evidencias fotográficas registradas</h4>' +
          '<p>Cuando un alumno realice una búsqueda indebida, la cámara web capturará la fotografía automáticamente y aparecerá aquí.</p>' +
        '</div>';
        return;
      }

      cont.innerHTML = filtradas.map(function(a) {
        var isGrave = !!a.grave;
        var ns = a.number ? String(a.number) : '?';
        var pn = ns.length === 1 ? '0' + ns : ns;
        var imgSrc = a.foto ? ('data:image/jpeg;base64,' + a.foto) : '';
        var imgHtml = imgSrc ? (
          '<div class="ev-card-img-wrap" onclick="abrirLightbox(\'' + imgSrc + '\', \'PC ' + pn + ' · ' + escaparHtml(a.query || '') + '\')">' +
            '<img class="ev-card-img" src="' + imgSrc + '" alt="Foto Alumno">' +
            '<div class="ev-card-zoom-overlay"><i class="fas fa-search-plus"></i> Ampliar</div>' +
          '</div>'
        ) : (
          '<div class="ev-card-img-wrap" style="display:flex;align-items:center;justify-content:center;color:#64748B;font-size:12px;">' +
            '<i class="fas fa-video-slash" style="font-size:24px;margin-right:8px;"></i> Sin cámara web' +
          '</div>'
        );

        var cardClass = isGrave ? 'ev-card grave' : 'ev-card';
        var badgeTipo = isGrave ? '<span class="ev-card-keyword" style="background:#EF4444;color:#FFF;font-weight:bold;">🚨 FALTA DESUBICADA</span>' : '<span class="ev-card-keyword" style="background:#D97706;color:#FFF;font-weight:bold;">🟡 BÚSQUEDA NO AUTORIZADA</span>';

        return '<div class="' + cardClass + '">' +
          imgHtml +
          '<div class="ev-card-body">' +
            '<div class="ev-card-header">' +
              '<span class="ev-badge-pc">💻 PC ' + escaparHtml(pn) + '</span>' +
              '<span class="ev-card-time"><i class="far fa-clock"></i> ' + escaparHtml(a.hora || '') + ' (' + escaparHtml(a.fecha || '') + ')</span>' +
            '</div>' +
            '<div>' + badgeTipo + '</div>' +
            '<div class="ev-card-query">🔍 "' + escaparHtml(a.query || '') + '"</div>' +
            (a.palabra_clave ? ('<div style="font-size:11px;color:#FCA5A5;">Término detectado: <strong>"' + escaparHtml(a.palabra_clave) + '"</strong></div>') : '') +
            '<div class="ev-card-footer">' +
              '<button class="mini-btn mb-lock" style="padding:6px 10px;" onclick="enviarComando(\'' + escaparHtml(a.id) + '\', \'lock\')"><i class="fas fa-lock"></i> Bloquear</button>' +
              '<button class="mini-btn" style="background:#334155;color:#F87171;padding:6px 10px;" onclick="borrarEvidencia(\'' + escaparHtml(a.foto_file || '') + '\', ' + (a.ts || 0) + ')" title="Borrar evidencia"><i class="fas fa-trash-alt"></i></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function abrirLightbox(src, caption) {
      document.getElementById('lightbox-img').src = src;
      document.getElementById('lightbox-caption').textContent = caption;
      document.getElementById('modal-lightbox').classList.add('open');
    }

    function cerrarLightbox() {
      document.getElementById('modal-lightbox').classList.remove('open');
    }

    function borrarEvidencia(fotoFile, ts) {
      if (!confirm('¿Eliminar esta evidencia fotográfica?')) return;
      fetch('/api/borrar_evidencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_file: fotoFile, ts: ts })
      })
      .then(function(r){ return r.json(); })
      .then(function(){
        toast('Evidencia eliminada');
        cargarEstado();
      });
    }

    function confirmarBorradoTodasEvidencias() {
      if (!confirm('⚠️ ¿Estás seguro de vaciar todo el registro de evidencias fotográficas de la clase?')) return;
      fetch('/api/clear_alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrar_archivos: true })
      })
      .then(function(r){ return r.json(); })
      .then(function(){
        toast('Todas las evidencias fueron eliminadas');
        cargarEstado();
      });
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
      setTimeout(function() { t.style.display = 'none'; }, 2400);
    }

    function enviarComando(target, action, params) {
      vibrar();
      var label = action === 'set_volume' ? ('VOLUMEN ' + (params && params.level !== undefined ? params.level + '%' : '')) : action.toUpperCase();
      toast('Enviando: ' + label + '...', '#3B82F6');
      fetch('/api/comando', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target, action: action, params: params || {} })
      })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function() {
        toast('¡Listo: ' + label + '!', '#10B981');
        setTimeout(cargarEstado, 300);
      })
      .catch(function(err) {
        toast('Error de conexión', '#EF4444');
        alert('No se pudo comunicar con la PC docente (' + err.message + '). Verificá que tu celular esté conectado a la misma red Wi-Fi del aula.');
      });
    }

    function enviarComandoConVibracion(target, action, params) {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([40, 60, 40]);
      }
      enviarComando(target, action, params);
    }

    function alternarVigilanciaGoogle() {
      var nuevoEstado = !googleGuardEnabled;
      fetch('/api/toggle_google_guard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nuevoEstado })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        googleGuardEnabled = !!res.vigilancia_google;
        actualizarBotonVigilancia();
        toast(googleGuardEnabled ? '🛡️ Vigilancia Google ACTIVADA' : 'Vigilancia Google desactivada', googleGuardEnabled ? '#10B981' : '#F59E0B');
      })
      .catch(function() {
        toast('Error cambiando vigilancia', '#EF4444');
      });
    }

    function actualizarBotonVigilancia() {
      var btn = document.getElementById('btn-toggle-google');
      if (!btn) return;
      if (googleGuardEnabled) {
        btn.className = 'guard-toggle-btn guard-on';
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Vigilancia Activa';
      } else {
        btn.className = 'guard-toggle-btn guard-off';
        btn.innerHTML = '<i class="fas fa-pause-circle"></i> Vigilancia Pausada';
      }
    }

    function limpiarAlertasGoogle() {
      fetch('/api/clear_alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
      .then(function() {
        toast('Historial de alertas limpio');
        cargarEstado();
      });
    }

    function renderizarAlertasGoogle(alertas) {
      var banner = document.getElementById('google-alert-banner');
      var badge = document.getElementById('badge-alertas');
      var listCont = document.getElementById('alerts-history-list');

      if (!alertas || !alertas.length) {
        if (banner) banner.classList.remove('visible');
        if (badge) badge.style.display = 'none';
        if (listCont) {
          listCont.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:0.8rem;">' +
            '✅ Ninguna búsqueda prohibida detectada hasta el momento.' +
          '</div>';
        }
        return;
      }

      if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = alertas.length;
      }

      var ultima = alertas[0];
      var nStr = ultima.number ? String(ultima.number) : '?';
      var padNum = nStr.length === 1 ? '0' + nStr : nStr;

      if (banner) {
        banner.classList.add('visible');
        document.getElementById('gab-title').textContent = '🚫 PC ' + padNum + ' intentó buscar en Google (' + (ultima.hora || '') + ')';
        document.getElementById('gab-desc').textContent = 'Buscó: "' + (ultima.query || '') + '"';
        var lockBtn = document.getElementById('gab-lock-btn');
        if (lockBtn) {
          lockBtn.onclick = function() {
            enviarComando(ultima.id, 'lock', {});
          };
        }
      }

      if (ultima.ts && ultima.ts > lastAlertTimestamp) {
        if (lastAlertTimestamp > 0) {
          if (ultima.grave) {
            toast('🚨 [FALTA DESUBICADA] PC ' + padNum + ' buscó: "' + ultima.query + '"', '#DC2626');
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([200, 100, 200, 100, 200]);
            }
          } else {
            toast('🚫 PC ' + padNum + ' buscó en Google: ' + ultima.query, '#EF4444');
            if (window.navigator && window.navigator.vibrate) {
              window.navigator.vibrate([120, 80, 120]);
            }
          }
        }
        lastAlertTimestamp = ultima.ts;
      }

      if (listCont) {
        listCont.innerHTML = alertas.map(function(a) {
          var ns = a.number ? String(a.number) : '?';
          var pn = ns.length === 1 ? '0' + ns : ns;
          var isGrave = !!a.grave;
          var itemStyle = isGrave ? 'border: 2px solid #EF4444; background: rgba(239, 68, 68, 0.14);' : '';
          var badgeGrave = isGrave ? '<span style="background:#EF4444;color:#FFF;font-size:10px;font-weight:bold;padding:2px 7px;border-radius:4px;margin-left:6px;">🚨 FALTA DESUBICADA</span>' : '';
          var detallePalabra = a.palabra_clave ? ('<div style="font-size:11px;color:#FCA5A5;margin-top:2px;">⚠️ Término clave detectado: <strong>"' + escaparHtml(a.palabra_clave) + '"</strong></div>') : '';
          var fotoHtml = a.foto ? 
            ('<div style="margin-top:8px;"><div style="font-size:11px;color:#94A3B8;margin-bottom:3px;"><i class="fas fa-camera"></i> Foto capturada al alumno:</div><img src="data:image/jpeg;base64,' + a.foto + '" style="height:76px;border-radius:6px;border:1px solid #EF4444;cursor:pointer;object-fit:cover;" onclick="window.open(this.src)" title="Foto tomada al alumno (clic para ampliar)"></div>') : '';
          return '<div class="alert-item" style="' + itemStyle + '">' +
            '<div class="alert-item-info">' +
              '<div><strong>💻 PC ' + escaparHtml(pn) + ' (' + escaparHtml(a.hostname || '') + ')</strong>' + badgeGrave + '</div>' +
              '<span>🕒 ' + escaparHtml(a.hora || '') + '</span>' +
              '<div class="alert-item-query">🔍 "' + escaparHtml(a.query || '') + '"</div>' +
              detallePalabra +
              fotoHtml +
            '</div>' +
            '<div style="display:flex;gap:6px;align-items:flex-start;">' +
              '<button class="mini-btn mb-lock" onclick="enviarComando(\'' + escaparHtml(a.id) + '\', \'lock\')"><i class="fas fa-lock"></i> Bloquear</button>' +
              '<button class="mini-btn mb-msg" onclick="abrirModalMensaje(\'' + escaparHtml(a.id) + '\')"><i class="fas fa-comment"></i> Aviso</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    function lanzarJuegoSeleccion(game) {
      var sel = document.getElementById('game-target-select');
      var target = sel ? sel.value : 'all';
      enviarComando(target, 'launch_game', { game: game });
    }

    function lanzarJuegoWebSeleccion(url) {
      var sel = document.getElementById('game-target-select');
      var target = sel ? sel.value : 'all';
      enviarComando(target, 'open_url', { url: url });
    }

    function lanzarUrlSeleccion(url) {
      var sel = document.getElementById('web-target-select');
      var target = sel ? sel.value : 'all';
      enviarComando(target, 'open_url', { url: url });
    }

    function lanzarUrlPersonalizada() {
      var inp = document.getElementById('inp-custom-url');
      var val = (inp.value || '').trim();
      if (!val) {
        alert('Ingresá una dirección web (ej: wikipedia.org)');
        return;
      }
      if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
      lanzarUrlSeleccion(val);
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

    function actualizarSelectoresDestino(maquinas) {
      var ids = ['web-target-select', 'game-target-select', 'file-dist-target-select'];
      for (var k = 0; k < ids.length; k++) {
        var sel = document.getElementById(ids[k]);
        if (!sel) continue;
        var currentVal = sel.value || 'all';
        var html = '<option value="all">🌍 Todas las PCs (' + maquinas.length + ')</option>';
        for (var i = 0; i < maquinas.length; i++) {
          var m = maquinas[i];
          var nStr = m.number ? String(m.number) : '?';
          var padNum = nStr.length === 1 ? '0' + nStr : nStr;
          html += '<option value="' + m.id + '">💻 PC ' + padNum + ' (' + m.hostname + ')</option>';
        }
        sel.innerHTML = html;
        sel.value = currentVal;
        if (!sel.value) sel.value = 'all';
      }
    }

    /* ══════════════ REPARTIR Y RECOLECTAR ARCHIVOS JS (OPCIÓN 4) ══════════════ */
    var archivoDistribuirBase64 = null;
    var archivoDistribuirNombre = null;

    function onArchivoSeleccionado(input) {
      if (!input.files || input.files.length === 0) return;
      var file = input.files[0];
      archivoDistribuirNombre = file.name;
      var tamKb = Math.max(1, Math.round(file.size / 1024));
      var reader = new FileReader();
      reader.onload = function(e) {
        var res = e.target.result;
        archivoDistribuirBase64 = res.indexOf(',') !== -1 ? res.split(',')[1] : res;
        var info = document.getElementById('file-dist-selected-name');
        if (info) {
          info.innerHTML = '📄 <strong>' + escaparHtml(file.name) + '</strong> (' + tamKb + ' KB) listo para enviar';
          info.style.color = '#10B981';
        }
        var btn = document.getElementById('btn-enviar-archivo');
        if (btn) btn.disabled = false;
        toast('Archivo cargado listo para repartir', '#10B981');
      };
      reader.readAsDataURL(file);
    }

    function enviarArchivoAlumnos() {
      if (!archivoDistribuirBase64 || !archivoDistribuirNombre) {
        alert('Por favor selecciona primero un archivo para repartir.');
        return;
      }
      var selTarget = document.getElementById('file-dist-target-select');
      var target = selTarget ? selTarget.value : 'all';
      var selDest = document.getElementById('file-dist-dest');
      var dest = selDest ? selDest.value : 'escritorio';

      var btn = document.getElementById('btn-enviar-archivo');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
      }

      toast('📤 Repartiendo archivo a los alumnos...', '#3B82F6');

      fetch('/api/repartir_archivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: target,
          filename: archivoDistribuirNombre,
          file_b64: archivoDistribuirBase64,
          dest_folder: dest
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        toast('🚀 ¡Archivo repartido exitosamente!', '#10B981');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> 🚀 Enviar Archivo Ahora';
        }
      })
      .catch(function(err) {
        toast('Error repartiendo archivo', '#EF4444');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> 🚀 Enviar Archivo Ahora';
        }
      });
    }

    function iniciarRecoleccion() {
      if (!confirm('¿Deseas solicitar a todos los alumnos que entreguen sus trabajos creados hoy?')) return;
      toast('📥 Solicitando entrega de trabajos a los alumnos...', '#0284C7');
      fetch('/api/solicitar_recoleccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        toast('Solicitud enviada a las netbooks', '#10B981');
        setTimeout(function() { cargarTrabajosRecibidos(true); }, 2500);
      })
      .catch(function() {
        toast('Error solicitando recolección', '#EF4444');
      });
    }

    function abrirCarpetaTrabajos() {
      fetch('/api/abrir_carpeta_recoleccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        toast('Carpeta abierta en tu computadora', '#10B981');
      })
      .catch(function() {
        toast('No se pudo abrir la carpeta', '#EF4444');
      });
    }

    function cargarTrabajosRecibidos(manual) {
      if (manual) toast('Actualizando lista de trabajos...', '#3B82F6');
      fetch('/api/listar_trabajos?t=' + Date.now(), { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        renderizarListaTrabajos(data.trabajos || []);
      });
    }

    function renderizarListaTrabajos(trabajos) {
      var badge = document.getElementById('badge-trabajos');
      if (badge) {
        if (trabajos && trabajos.length > 0) {
          badge.style.display = 'inline-block';
          badge.textContent = trabajos.length;
        } else {
          badge.style.display = 'none';
        }
      }

      var cont = document.getElementById('trabajos-list-container');
      if (!cont) return;

      if (!trabajos || trabajos.length === 0) {
        cont.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:0.8rem;">' +
          'Ningún trabajo recolectado aún. Presiona <strong>"Recolectar Trabajos Ahora"</strong> para pedir los archivos de las máquinas.' +
        '</div>';
        return;
      }

      cont.innerHTML = trabajos.map(function(t) {
        var pcLabel = t.pc || 'PC';
        var fn = escaparHtml(t.filename || 'archivo');
        var tam = t.tam_kb ? (t.tam_kb + ' KB') : '';
        var hora = escaparHtml(t.hora || '');
        var fecha = escaparHtml(t.fecha || '');
        var host = escaparHtml(t.hostname || '');
        var rel = encodeURIComponent(t.rel_path || '');

        return '<div class="alert-item" style="border-left:4px solid #38BDF8;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;">' +
          '<div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
            '<span class="ev-badge-pc" style="background:#0369A1;font-size:0.75rem;padding:4px 8px;border-radius:6px;font-weight:bold;white-space:nowrap;">💻 ' + escaparHtml(pcLabel) + '</span>' +
            '<div style="min-width:0;">' +
              '<div style="font-weight:bold;font-size:0.84rem;color:#F8FAFC;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📁 ' + fn + '</div>' +
              '<div style="font-size:0.72rem;color:#94A3B8;">' + tam + ' · Entregado a las ' + hora + ' (' + fecha + ')' + (host ? (' · ' + host) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-shrink:0;">' +
            '<a href="/api/descargar_trabajo?rel=' + rel + '" class="mini-btn" style="background:#0284C7;color:#FFF;text-decoration:none;padding:6px 10px;border-radius:6px;font-size:0.75rem;display:inline-flex;align-items:center;gap:4px;" download="' + fn + '">' +
              '<i class="fas fa-download"></i> Descargar' +
            '</a>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function renderizarEquipos(maquinas) {
      var cont = document.getElementById('machines-container');
      var filtradas = maquinas.filter(function(m) {
        if (activeFilter === 'online') return m.online;
        if (activeFilter === 'locked') return m.locked;
        return true;
      });

      if (!filtradas.length) {
        if (!maquinas.length) {
          cont.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-satellite-dish"></i>' +
            '<h4>Esperando computadoras del taller...</h4>' +
            '<p>Ejecutá <strong>iniciar_alumno.bat</strong> en las máquinas de los alumnos y aparecerán aquí automáticamente.</p>' +
          '</div>';
        } else {
          cont.innerHTML = '<div class="empty-state">' +
            '<i class="fas fa-filter"></i>' +
            '<h4>No hay equipos en este filtro</h4>' +
            '<p>Tocá "Todas" arriba para ver el listado completo de computadoras.</p>' +
          '</div>';
        }
        return;
      }

      cont.innerHTML = filtradas.map(function(m) {
        var stateClass = !m.online ? 'offline' : (m.locked ? 'locked' : 'online');
        var pillHtml = !m.online
          ? '<span class="status-pill pill-offline">Desconectada</span>'
          : (m.locked ? '<span class="status-pill pill-locked">🔒 Bloqueada</span>' : '<span class="status-pill pill-online">🟢 En línea</span>');

        var nStr = m.number ? String(m.number) : '?';
        var padNum = nStr.length === 1 ? '0' + nStr : nStr;
        var winTitle = m.active_window ? escaparHtml(m.active_window) : 'Escritorio / Sin ventana activa';

        var alertChipHtml = '';
        if (m.last_google_alert) {
          var isGrave = !!m.last_alert_grave;
          var chipBg = isGrave ? 'background:rgba(239, 68, 68, 0.22);border:1px solid #EF4444;color:#FCA5A5;' : '';
          var chipIcon = isGrave ? '<i class="fas fa-exclamation-triangle" style="color:#EF4444;"></i>' : '<i class="fas fa-exclamation-circle"></i>';
          var fotoMini = m.last_alert_foto ? 
            ('<img src="data:image/jpeg;base64,' + m.last_alert_foto + '" style="width:28px;height:28px;border-radius:4px;object-fit:cover;margin-left:6px;cursor:pointer;border:1px solid #EF4444;" onclick="event.stopPropagation();window.open(this.src)" title="Foto del alumno (clic para ver)">') : '';
          alertChipHtml = '<div class="machine-alert-chip" style="display:flex;align-items:center;' + chipBg + '">' +
            chipIcon +
            '<span>' + (isGrave ? '🚨 DESUBICADA: "' : 'Última búsqueda: "') + escaparHtml(m.last_google_alert) + '"</span>' +
            fotoMini +
          '</div>';
        }

        return '<div class="machine-card ' + stateClass + '">' +
          '<div class="machine-head">' +
            '<div class="machine-title">' +
              '<div class="machine-num-badge">#' + padNum + '</div>' +
              '<div>' +
                '<h3>PC ' + padNum + '</h3>' +
                '<p>' + escaparHtml(m.ip) + ' · ' + escaparHtml(m.hostname) + '</p>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              pillHtml +
              '<button class="btn-renumber" onclick="abrirModalRenombrar(\'' + escaparHtml(m.id) + '\', \'' + padNum + '\')" title="Cambiar número de esta PC"><i class="fas fa-pen"></i></button>' +
            '</div>' +
          '</div>' +
          '<div class="machine-activity" title="' + winTitle + '">' +
            '<i class="fas fa-eye"></i>' +
            '<span>' + (m.online ? ('Viendo: ' + winTitle) : 'Sin señal reciente') + '</span>' +
          '</div>' +
          alertChipHtml +
          '<div class="machine-actions">' +
            (m.locked
              ? '<button class="mini-btn mb-unlock" onclick="enviarComando(\'' + escaparHtml(m.id) + '\', \'unlock\')"><i class="fas fa-unlock"></i> Desbloquear</button>'
              : '<button class="mini-btn mb-lock" onclick="enviarComando(\'' + escaparHtml(m.id) + '\', \'lock\')"><i class="fas fa-lock"></i> Bloquear</button>') +
            '<button class="mini-btn mb-msg" onclick="abrirModalMensaje(\'' + escaparHtml(m.id) + '\')"><i class="fas fa-comment"></i> Aviso</button>' +
            '<button class="mini-btn mb-more" onclick="abrirModalIndividual(\'' + escaparHtml(m.id) + '\', \'' + padNum + '\')" title="Más acciones (Volumen 50%, Juegos, Apagar)"><i class="fas fa-ellipsis-v"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function cargarEstado(manual) {
      if (manual) toast('Actualizando equipos...', '#3B82F6');
      fetch('/api/status?t=' + Date.now(), { cache: 'no-store' })
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(data) {
          var badge = document.getElementById('conn-badge');
          var txt = document.getElementById('conn-text');
          if (badge && txt) {
            badge.classList.remove('offline');
            txt.textContent = 'Activo · ' + (data.ip || '');
          }

          if (data.vigilancia_google !== undefined) {
            googleGuardEnabled = !!data.vigilancia_google;
            actualizarBotonVigilancia();
          }

          if (data.modo_foco !== undefined) {
            actualizarUIModoFoco(data.modo_foco);
          }

          renderizarAlertasGoogle(data.alertas || []);
          renderizarGaleriaEvidencias(data.alertas || []);
          renderizarListaTrabajos(data.trabajos || []);

          var maquinas = data.maquinas || [];
          maquinas.sort(function(a, b) {
            var na = parseInt(a.number) || 999;
            var nb = parseInt(b.number) || 999;
            return na - nb;
          });

          lastMachinesList = maquinas;

          var onlineCount = 0;
          var lockedCount = 0;
          maquinas.forEach(function(m) {
            if (m.online) onlineCount++;
            if (m.locked) lockedCount++;
          });

          document.getElementById('stat-online').textContent = onlineCount;
          document.getElementById('stat-locked').textContent = lockedCount;
          document.getElementById('stat-total').textContent = maquinas.length;
          document.getElementById('badge-equipos').textContent = onlineCount;

          actualizarSelectoresDestino(maquinas);
          renderizarEquipos(maquinas);
        })
        .catch(function() {
          var badge = document.getElementById('conn-badge');
          var txt = document.getElementById('conn-text');
          if (badge && txt) {
            badge.classList.add('offline');
            txt.textContent = 'Sin conexión';
          }
        });
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
        sys.stdout.write(f"  [HTTP] {self.client_address[0]} {format % args}\n")
        sys.stdout.flush()

    def responder_json(self, data, code=200):
        try:
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
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
                alertas_copia = list(alertas_busquedas)
                trabajos_copia = list(trabajos_recibidos)
                vg = vigilancia_google
                mf = dict(modo_foco)
            self.responder_json({
                "ip": IP_DOCENTE,
                "maquinas": lista,
                "alertas": alertas_copia,
                "trabajos": trabajos_copia,
                "vigilancia_google": vg,
                "modo_foco": mf
            })
            return

        if url.path == "/api/listar_trabajos":
            with lock_estado:
                trabajos_copia = list(trabajos_recibidos)
            self.responder_json({"status": "ok", "trabajos": trabajos_copia})
            return

        if url.path.startswith("/api/descargar_distribuido/"):
            fname = os.path.basename(urllib.parse.unquote(url.path.replace("/api/descargar_distribuido/", "")))
            fpath = os.path.join(DIR_DISTRIBUCION, fname)
            if os.path.exists(fpath) and os.path.isfile(fpath):
                with open(fpath, "rb") as f:
                    contenido = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
                self.send_header("Content-Length", str(len(contenido)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(contenido)
                return
            else:
                self.send_response(404)
                self.end_headers()
                return

        if url.path == "/api/descargar_trabajos_zip":
            import io
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for root, dirs, files in os.walk(DIR_RECOLECCION):
                    for file in files:
                        if file.endswith(".meta.json"):
                            continue
                        fpath = os.path.join(root, file)
                        arcname = os.path.relpath(fpath, DIR_RECOLECCION)
                        zip_file.write(fpath, arcname)
            zip_data = zip_buffer.getvalue()
            nombre_zip = f"Trabajos_Alumnos_{time.strftime('%Y%m%d_%H%M')}.zip"
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", f'attachment; filename="{nombre_zip}"')
            self.send_header("Content-Length", str(len(zip_data)))
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(zip_data)
            return

        if url.path == "/api/descargar_trabajo":
            params = urllib.parse.parse_qs(url.query)
            rel = params.get("rel", [""])[0]
            rel_sanitizado = rel.replace("..", "").lstrip("/\\")
            fpath = os.path.join(DIR_RECOLECCION, rel_sanitizado)
            if os.path.exists(fpath) and os.path.isfile(fpath):
                with open(fpath, "rb") as f:
                    contenido = f.read()
                fname = os.path.basename(fpath)
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
                self.send_header("Content-Length", str(len(contenido)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(contenido)
                return
            else:
                self.send_response(404)
                self.end_headers()
                return

        if url.path == "/api/evidencias":
            with lock_estado:
                alertas_copia = list(alertas_busquedas)
            self.responder_json({"status": "ok", "evidencias": alertas_copia})
            return

        if url.path == "/api/reporte_evidencias":
            with lock_estado:
                alertas_copia = list(alertas_busquedas)
            filas_html = ""
            for idx, a in enumerate(alertas_copia, 1):
                es_g = a.get("grave", False)
                badge = '<span style="background:#DC2626;color:#FFF;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🚨 FALTA DESUBICADA</span>' if es_g else '<span style="background:#D97706;color:#FFF;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">🟡 BÚSQUEDA NO PERMITIDA</span>'
                foto_img = f'<img src="data:image/jpeg;base64,{a["foto"]}" style="width:120px;height:90px;object-fit:cover;border-radius:4px;border:1px solid #CBD5E1;">' if a.get("foto") else '<span style="color:#94A3B8;font-size:11px;">Sin fotografía</span>'
                filas_html += f"""
                <tr>
                  <td style="text-align:center;font-weight:bold;">{idx}</td>
                  <td><strong>PC {a.get('number', '?')}</strong><br><small style="color:#64748B;">{a.get('hostname', '')}</small></td>
                  <td>{a.get('fecha', time.strftime('%d/%m/%Y'))}<br><small style="color:#64748B;">{a.get('hora', '')}</small></td>
                  <td>{badge}<br><strong style="font-size:13px;display:block;margin-top:4px;">"{a.get('query', '')}"</strong><small style="color:#EF4444;">Término detectado: {a.get('palabra_clave', '-')}</small></td>
                  <td style="text-align:center;">{foto_img}</td>
                  <td style="width:130px;border-bottom:1px dotted #94A3B8;"></td>
                </tr>
                """
            if not filas_html:
                filas_html = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#64748B;">No hay incidencias registradas en la sesión.</td></tr>'

            doc_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta de Incidencias Digitales - Colegio Paulo Freire</title>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; margin: 25px; line-height: 1.4; }}
    .header {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 20px; }}
    .header h2 {{ margin: 0; color: #065F46; font-size: 20px; }}
    .header h4 {{ margin: 4px 0 0 0; color: #64748B; font-size: 13px; font-weight: normal; }}
    .meta-box {{ background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 14px; font-size: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    th, td {{ border: 1px solid #CBD5E1; padding: 9px; text-align: left; font-size: 12px; vertical-align: middle; }}
    th {{ background: #F1F5F9; color: #334155; font-size: 12px; text-transform: uppercase; }}
    .firmas {{ margin-top: 55px; display: flex; justify-content: space-around; text-align: center; }}
    .linea-firma {{ width: 220px; border-top: 1.5px solid #334155; padding-top: 6px; font-weight: bold; font-size: 12px; }}
    .no-print {{ margin-bottom: 15px; display: flex; gap: 10px; }}
    .btn-print {{ background: #059669; color: #FFF; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; }}
    @media print {{
      .no-print {{ display: none !important; }}
      body {{ margin: 10mm; }}
    }}
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
    <button class="btn-print" style="background:#475569;" onclick="window.close()">Cerrar</button>
  </div>
  <div class="header">
    <div>
      <h2>COLEGIO PAULO FREIRE · TALLER DE ROBÓTICA E INFORMÁTICA</h2>
      <h4>Acta Oficial de Registro de Incidencias Digitales y Búsquedas No Autorizadas</h4>
    </div>
    <div style="text-align:right;font-size:12px;color:#64748B;">
      Fecha de emisión: <strong>{time.strftime('%d/%m/%Y %H:%M')}</strong>
    </div>
  </div>
  <div class="meta-box">
    <div><strong>Docente responsable:</strong> Control de Aula Maker</div>
    <div><strong>Total de incidencias registradas:</strong> {len(alertas_copia)}</div>
    <div><strong>Estado del guardián:</strong> Activo con captura fotográfica</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px;text-align:center;">#</th>
        <th style="width:90px;">Equipo</th>
        <th style="width:90px;">Fecha/Hora</th>
        <th>Búsqueda realizada & Infracción</th>
        <th style="width:130px;text-align:center;">Fotografía</th>
        <th style="width:130px;">Firma Alumno / Observación</th>
      </tr>
    </thead>
    <tbody>
      {filas_html}
    </tbody>
  </table>
  <div class="firmas">
    <div>
      <div class="linea-firma">Firma del Docente de Taller</div>
      <small style="color:#64748B;">Colegio Paulo Freire</small>
    </div>
    <div>
      <div class="linea-firma">Firma de Dirección / Adscripción</div>
      <small style="color:#64748B;">Constancia de Notificación</small>
    </div>
  </div>
</body>
</html>"""
            self.responder_html(doc_html)
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
        global vigilancia_google
        url = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"

        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}

        if url.path == "/api/toggle_google_guard":
            with lock_estado:
                if "enabled" in data:
                    vigilancia_google = bool(data["enabled"])
                else:
                    vigilancia_google = not vigilancia_google
                cola_global.append({
                    "action": "set_google_guard",
                    "params": {"enabled": vigilancia_google},
                    "time": time.time(),
                    "seq": len(cola_global) + 1
                })
                vg = vigilancia_google
            self.responder_json({"status": "ok", "vigilancia_google": vg})
            return

        if url.path == "/api/set_focus_mode":
            with lock_estado:
                modo_foco["activo"] = bool(data.get("activo", False))
                if "nombre" in data:
                    modo_foco["nombre"] = str(data["nombre"])
                if "permitidos" in data:
                    modo_foco["permitidos"] = [str(x).strip().lower() for x in data["permitidos"] if str(x).strip()]
                cola_global.append({
                    "action": "set_focus_mode",
                    "params": dict(modo_foco),
                    "time": time.time(),
                    "seq": len(cola_global) + 1
                })
                mf_copy = dict(modo_foco)
            print(f"  [🎯 MODO FOCO DOCENTE] {'ACTIVADO' if mf_copy['activo'] else 'DESACTIVADO'}: {mf_copy['nombre']} -> {mf_copy['permitidos']}", flush=True)
            self.responder_json({"status": "ok", "modo_foco": mf_copy})
            return

        if url.path == "/api/borrar_evidencia":
            foto_f = data.get("foto_file", "")
            ts = data.get("ts", 0)
            with lock_estado:
                if foto_f:
                    p1 = os.path.join(DIR_EVIDENCIAS_DOCENTE, foto_f)
                    p2 = os.path.join(DIR_EVIDENCIAS_DOCENTE, foto_f.replace(".jpg", ".json"))
                    for p in (p1, p2):
                        if os.path.exists(p):
                            try: os.remove(p)
                            except Exception: pass
                alertas_busquedas[:] = [a for a in alertas_busquedas if a.get("foto_file") != foto_f and a.get("ts") != ts]
            self.responder_json({"status": "ok"})
            return

        if url.path == "/api/clear_alerts":
            with lock_estado:
                alertas_busquedas.clear()
                for m in maquinas.values():
                    m["last_google_alert"] = ""
                # Si se solicita borrar también de disco
                if data.get("borrar_archivos", False):
                    try:
                        for f in os.listdir(DIR_EVIDENCIAS_DOCENTE):
                            os.remove(os.path.join(DIR_EVIDENCIAS_DOCENTE, f))
                    except Exception:
                        pass
            self.responder_json({"status": "ok"})
            return

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
            ventana_activa = str(data.get("active_window", "")).strip()
            alerta_google = data.get("google_alert")

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
                            "active_window": ventana_activa,
                            "last_google_alert": "",
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
                        if ventana_activa:
                            m["active_window"] = ventana_activa

                    debe_bloquear = m.get("locked", False)
                    alerta_foto = data.get("google_alert_foto", "")
                    alerta_grave = bool(data.get("google_alert_grave", False))
                    alerta_palabra = str(data.get("google_alert_palabra", "")).strip()
                    alerta_foco_msg = str(data.get("focus_alert", "")).strip()
                    if alerta_foco_msg:
                        print(f"  [🎯 MODO FOCO] PC {num_asignado} ({maquinas[mid]['hostname']}): {alerta_foco_msg}", flush=True)

                    # Se registra si es búsqueda desubicada (SIEMPRE) o si vigilancia_google está activa
                    if alerta_google and (vigilancia_google or alerta_grave):
                        q_str = str(alerta_google).strip()
                        maquinas[mid]["last_google_alert"] = q_str
                        maquinas[mid]["last_alert_grave"] = alerta_grave
                        maquinas[mid]["last_alert_palabra"] = alerta_palabra
                        foto_fname = ""
                        if alerta_foto:
                            maquinas[mid]["last_alert_foto"] = alerta_foto
                            try:
                                ts_sec = int(time.time())
                                foto_fname = f"evidencia_PC{num_asignado}_{ts_sec}.jpg"
                                meta_fname = f"evidencia_PC{num_asignado}_{ts_sec}.json"
                                fpath = os.path.join(DIR_EVIDENCIAS_DOCENTE, foto_fname)
                                mpath = os.path.join(DIR_EVIDENCIAS_DOCENTE, meta_fname)
                                with open(fpath, "wb") as fh:
                                    fh.write(base64.b64decode(alerta_foto))
                                with open(mpath, "w", encoding="utf-8") as fh:
                                    json.dump({
                                        "id": mid,
                                        "number": num_asignado,
                                        "hostname": maquinas[mid].get("hostname", mid),
                                        "query": q_str,
                                        "grave": alerta_grave,
                                        "palabra_clave": alerta_palabra,
                                        "hora": time.strftime("%H:%M:%S"),
                                        "fecha": time.strftime("%d/%m/%Y"),
                                        "ts": time.time(),
                                        "foto_file": foto_fname
                                    }, fh, indent=2, ensure_ascii=False)
                            except Exception as e:
                                print(f"  [!] Error guardando evidencia fotográfica: {e}", flush=True)

                        alerta_obj = {
                            "id": mid,
                            "number": num_asignado,
                            "hostname": maquinas[mid].get("hostname", mid),
                            "query": q_str,
                            "grave": alerta_grave,
                            "palabra_clave": alerta_palabra,
                            "foto": alerta_foto,
                            "foto_file": foto_fname,
                            "hora": time.strftime("%H:%M:%S"),
                            "fecha": time.strftime("%d/%m/%Y"),
                            "ts": time.time()
                        }
                        alertas_busquedas.insert(0, alerta_obj)
                        if len(alertas_busquedas) > 60:
                            del alertas_busquedas[60:]
                        if alerta_grave:
                            print(f"  [🚨 ALERTA ROJA · BÚSQUEDA DESUBICADA] PC {num_asignado} ({maquinas[mid]['hostname']}) buscó: \"{q_str}\" (Término: {alerta_palabra})", flush=True)
                        else:
                            print(f"  [🚨 ALERTA GOOGLE] PC {num_asignado} ({maquinas[mid]['hostname']}) buscó: \"{q_str}\"", flush=True)

                    vg = vigilancia_google
                    palabras_sync = cargar_palabras_prohibidas_servidor()
                    mf_status = dict(modo_foco)

            self.responder_json({
                "status": "ok",
                "vigilancia_google": vg,
                "palabras_prohibidas": palabras_sync,
                "force_lock": debe_bloquear,
                "modo_foco": mf_status
            })
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

        if url.path == "/api/repartir_archivo":
            target = data.get("target", "all")
            filename = os.path.basename(data.get("filename", "archivo_docente"))
            file_b64 = data.get("file_b64", "")
            dest_folder = data.get("dest_folder", "escritorio")

            if not filename or not file_b64:
                self.responder_json({"status": "error", "message": "Datos incompletos"}, 400)
                return

            fpath = os.path.join(DIR_DISTRIBUCION, filename)
            try:
                with open(fpath, "wb") as f:
                    f.write(base64.b64decode(file_b64))
            except Exception as e:
                self.responder_json({"status": "error", "message": str(e)}, 500)
                return

            download_url = f"http://{IP_DOCENTE}:{PUERTO_WEB}/api/descargar_distribuido/{urllib.parse.quote(filename)}"
            cmd = {
                "action": "receive_file",
                "params": {
                    "filename": filename,
                    "url": download_url,
                    "dest": dest_folder
                },
                "time": time.time()
            }

            with lock_estado:
                if target == "all":
                    cmd["seq"] = len(cola_global) + 1
                    cola_global.append(cmd)
                else:
                    if target not in colas_comandos:
                        colas_comandos[target] = []
                    colas_comandos[target].append(cmd)

            print(f"  [📤 REPARTIR ARCHIVO] '{filename}' enviado a: {target} (Destino: {dest_folder})", flush=True)
            self.responder_json({"status": "ok", "url": download_url})
            return

        if url.path == "/api/solicitar_recoleccion":
            upload_url = f"http://{IP_DOCENTE}:{PUERTO_WEB}/api/subir_trabajo"
            cmd = {
                "action": "collect_files",
                "params": {
                    "upload_url": upload_url
                },
                "time": time.time()
            }
            with lock_estado:
                cmd["seq"] = len(cola_global) + 1
                cola_global.append(cmd)
            print(f"  [📥 SOLICITAR RECOLECCIÓN] Orden masiva enviada a todas las máquinas", flush=True)
            self.responder_json({"status": "ok"})
            return

        if url.path == "/api/subir_trabajo":
            mid = data.get("id", "PC")
            num = data.get("number")
            if not num:
                with lock_estado:
                    num = maquinas_numeros.get(mid, "?")
            num_str = str(num).zfill(2) if str(num).isdigit() else str(num)
            hostname = data.get("hostname", mid)
            filename = os.path.basename(data.get("filename", "trabajo"))
            file_b64 = data.get("file_b64", "")

            if file_b64:
                pc_folder = os.path.join(DIR_RECOLECCION, f"PC_{num_str}")
                os.makedirs(pc_folder, exist_ok=True)
                dst_file = os.path.join(pc_folder, filename)
                raw_bytes = base64.b64decode(file_b64)
                with open(dst_file, "wb") as f:
                    f.write(raw_bytes)

                meta_file = dst_file + ".meta.json"
                hora_str = time.strftime("%H:%M:%S")
                fecha_str = time.strftime("%d/%m/%Y")
                with open(meta_file, "w", encoding="utf-8") as mf:
                    json.dump({
                        "id": mid,
                        "number": num,
                        "hostname": hostname,
                        "filename": filename,
                        "hora": hora_str,
                        "fecha": fecha_str,
                        "tam_bytes": len(raw_bytes)
                    }, mf, indent=2, ensure_ascii=False)

                rel = f"PC_{num_str}/{filename}"
                item = {
                    "pc": f"PC_{num_str}",
                    "hostname": hostname,
                    "filename": filename,
                    "tam_kb": max(1, len(raw_bytes) // 1024),
                    "hora": hora_str,
                    "fecha": fecha_str,
                    "rel_path": rel,
                    "mtime": time.time()
                }
                with lock_estado:
                    trabajos_recibidos[:] = [t for t in trabajos_recibidos if not (t.get("pc") == f"PC_{num_str}" and t.get("filename") == filename)]
                    trabajos_recibidos.insert(0, item)
                    if len(trabajos_recibidos) > 120:
                        del trabajos_recibidos[120:]
                print(f"  [📥 TRABAJO RECIBIDO] PC_{num_str} ({hostname}) entregó: {filename} ({len(raw_bytes)//1024} KB)", flush=True)
            self.responder_json({"status": "ok"})
            return

        if url.path == "/api/abrir_carpeta_recoleccion":
            try:
                if platform.system() == "Windows":
                    os.startfile(DIR_RECOLECCION)
                elif platform.system() == "Darwin":
                    subprocess.run(["open", DIR_RECOLECCION])
                else:
                    subprocess.run(["xdg-open", DIR_RECOLECCION])
                self.responder_json({"status": "ok"})
            except Exception as e:
                self.responder_json({"status": "error", "message": str(e)}, 500)
            return

        if url.path == "/api/limpiar_trabajos":
            with lock_estado:
                trabajos_recibidos.clear()
            self.responder_json({"status": "ok"})
            return

        self.send_response(404)
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

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
    mantener_equipo_despierto()
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
