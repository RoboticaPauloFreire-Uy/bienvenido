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
colas_comandos = {}      # machine_id -> [comandos]
cola_global = []         # Comandos para todas las máquinas
alertas_busquedas = []   # Historial de búsquedas prohibidas detectadas
vigilancia_google = True # Regla activa por defecto: no buscar en Google
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
          <div class="section-title"><i class="fas fa-sliders-h"></i> Cierre de Clase</div>
        </div>
        <div class="aux-actions-grid">
          <button class="aux-btn" onclick="confirmarApagado()" style="border-color:rgba(239,68,68,0.4);">
            <i class="fas fa-power-off" style="color:#EF4444;"></i> Apagar Todas las PCs del Taller
          </button>
        </div>
      </div>
    </section>
  </div>

  <!-- ══════════════════════════════════════════════════════════════
       BARRA FIJA INFERIOR PARA CONTROLAR CON EL PULGAR DESDE EL CELULAR
       ══════════════════════════════════════════════════════════════ -->
  <div class="thumb-control-bar">
    <div class="thumb-bar-inner">
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
      var tabs = ['equipos', 'herramientas', 'juegos', 'aula'];
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
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([120, 80, 120]);
          }
          toast('🚫 PC ' + padNum + ' buscó en Google: ' + ultima.query, '#EF4444');
        }
        lastAlertTimestamp = ultima.ts;
      }

      if (listCont) {
        listCont.innerHTML = alertas.map(function(a) {
          var ns = a.number ? String(a.number) : '?';
          var pn = ns.length === 1 ? '0' + ns : ns;
          return '<div class="alert-item">' +
            '<div class="alert-item-info">' +
              '<strong>💻 PC ' + escaparHtml(pn) + ' (' + escaparHtml(a.hostname || '') + ')</strong>' +
              '<span>🕒 ' + escaparHtml(a.hora || '') + '</span>' +
              '<div class="alert-item-query">🔍 "' + escaparHtml(a.query || '') + '"</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;">' +
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
      var ids = ['web-target-select', 'game-target-select'];
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
          alertChipHtml = '<div class="machine-alert-chip">' +
            '<i class="fas fa-exclamation-circle"></i>' +
            '<span>Última búsqueda bloqueada: "' + escaparHtml(m.last_google_alert) + '"</span>' +
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

          renderizarAlertasGoogle(data.alertas || []);

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
                vg = vigilancia_google
            self.responder_json({
                "ip": IP_DOCENTE,
                "maquinas": lista,
                "alertas": alertas_copia,
                "vigilancia_google": vg
            })
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

        if url.path == "/api/clear_alerts":
            with lock_estado:
                alertas_busquedas.clear()
                for m in maquinas.values():
                    m["last_google_alert"] = ""
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
                        if "locked" in data:
                            m["locked"] = data["locked"]

                    if alerta_google and vigilancia_google:
                        q_str = str(alerta_google).strip()
                        maquinas[mid]["last_google_alert"] = q_str
                        alerta_obj = {
                            "id": mid,
                            "number": num_asignado,
                            "hostname": maquinas[mid].get("hostname", mid),
                            "query": q_str,
                            "hora": time.strftime("%H:%M:%S"),
                            "ts": time.time()
                        }
                        alertas_busquedas.insert(0, alerta_obj)
                        if len(alertas_busquedas) > 40:
                            del alertas_busquedas[40:]
                        print(f"  [🚨 ALERTA GOOGLE] PC {num_asignado} ({maquinas[mid]['hostname']}) buscó: \"{q_str}\"", flush=True)

                    vg = vigilancia_google

            self.responder_json({"status": "ok", "vigilancia_google": vg})
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
