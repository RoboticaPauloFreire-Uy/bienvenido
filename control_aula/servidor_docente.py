#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SERVIDORDOCENTE.PY — SERVIDOR DE CONTROL DE AULA LOCAL (PYTHON PURO)
Colegio Paulo Freire · Taller de Robótica & Informática

No requiere dependencias externas (funciona con la biblioteca estándar de Python).
Inicia el servidor web en el puerto 5000 y el faro de auto-descubrimiento UDP en el puerto 5005.
"""

import http.server
import socket
import socketserver
import threading
import json
import time
import os
import sys
import urllib.parse

PUERTO_WEB = 5000
PUERTO_UDP = 5005
TIMEOUT_DESCONEXION = 8  # Segundos sin ping para marcar máquina como desconectada

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
# INTERFAZ GRÁFICA WEB DEL DOCENTE (HTML + CSS + JS EMBEBIDO)
# ══════════════════════════════════════════════════════════════
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Control de Aula · Colegio Paulo Freire</title>
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
      --danger-hover: #DC2626;
      --warning: #F59E0B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 16px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Header */
    header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      font-size: 2rem;
      background: #3B82F6;
      color: #FFF;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .brand-titles h1 {
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .brand-titles p {
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .server-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0F172A;
      border: 1px solid var(--card-border);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-family: 'Special Elite', monospace;
      color: #38BDF8;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10B981;
    }

    /* Panel de Estadísticas */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .stat-info span {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .stat-info h2 {
      font-size: 1.6rem;
      font-weight: 900;
      margin-top: 2px;
    }

    .stat-icon {
      font-size: 1.8rem;
      opacity: 0.8;
    }

    /* Barra de Acciones Globales */
    .actions-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    }

    .section-title {
      font-size: 0.95rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .big-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .action-btn {
      border: none;
      border-radius: 10px;
      padding: 14px 16px;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 800;
      color: #FFF;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.18s ease;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
    }

    .action-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.35);
    }

    .action-btn:active {
      transform: translateY(1px);
    }

    .action-btn i { font-size: 1.4rem; }

    .btn-lock { background: linear-gradient(135deg, #EF4444, #B91C1C); }
    .btn-unlock { background: linear-gradient(135deg, #10B981, #047857); }
    .btn-msg { background: linear-gradient(135deg, #F59E0B, #B45309); }
    .btn-mute { background: linear-gradient(135deg, #6366F1, #4338CA); }
    .btn-off { background: linear-gradient(135deg, #475569, #1E293B); border: 1px solid #64748B; }

    /* Lanzador Rápido de Sitios Web */
    .quick-urls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }

    .quick-url-btn {
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
      color: #F8FAFC;
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
    }

    .quick-url-btn:hover {
      background: #334155;
      border-color: #38BDF8;
      transform: translateY(-1px);
    }

    .custom-url-row {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .custom-url-row input {
      flex: 1;
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.88rem;
      outline: none;
    }

    .custom-url-row input:focus {
      border-color: var(--primary);
    }

    .custom-url-row button {
      background: var(--primary);
      color: #FFF;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }

    .custom-url-row button:hover { background: var(--primary-hover); }

    /* Lista de Máquinas */
    .machines-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .machine-card {
      background: var(--card-bg);
      border: 1.5px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s ease;
    }

    .machine-card.online { border-color: #10B981; }
    .machine-card.locked { background: #26161C; border-color: #EF4444; }
    .machine-card.offline { opacity: 0.5; border-color: #475569; }

    .machine-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .machine-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .machine-title i {
      font-size: 1.3rem;
      color: #38BDF8;
    }

    .machine-title h3 {
      font-size: 0.98rem;
      font-weight: 800;
    }

    .machine-title p {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .status-pill {
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      letter-spacing: 0.04em;
    }

    .pill-online { background: #064E3B; color: #6EE7B7; border: 1px solid #059669; }
    .pill-locked { background: #7F1D1D; color: #FCA5A5; border: 1px solid #DC2626; }
    .pill-offline { background: #334155; color: #94A3B8; }

    .machine-actions {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }

    .mini-btn {
      flex: 1;
      padding: 6px 10px;
      font-size: 0.76rem;
      font-weight: 700;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #FFF;
      transition: opacity 0.15s;
    }

    .mini-btn:hover { opacity: 0.85; }
    .mb-lock { background: #EF4444; }
    .mb-unlock { background: #10B981; }
    .mb-msg { background: #F59E0B; }

    /* Modal Mensaje */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-overlay.open { display: flex; }

    .modal-box {
      background: #1E293B;
      border: 1.5px solid var(--primary);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .modal-box h3 {
      font-size: 1.15rem;
      margin-bottom: 8px;
    }

    .modal-box p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .modal-box textarea {
      width: 100%;
      height: 90px;
      background: #0F172A;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px;
      color: #FFF;
      font-family: inherit;
      font-size: 0.9rem;
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
      padding: 8px 16px;
      font-weight: 700;
      border-radius: 6px;
      border: none;
      cursor: pointer;
    }

    .mbtn-cancel { background: #475569; color: #FFF; }
    .mbtn-send { background: var(--primary); color: #FFF; }

    /* Toast notificación */
    #toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10B981;
      color: #FFF;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      display: none;
      z-index: 2000;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon"><i class="fas fa-robot"></i></div>
        <div class="brand-titles">
          <h1>Control de Aula Maker</h1>
          <p>Colegio Paulo Freire · Laboratorio de Informática & Robótica</p>
        </div>
      </div>
      <div class="server-badge">
        <span class="pulse-dot"></span>
        <span>DOCENTE: <strong>__DOCENTE_IP__:__PUERTO__</strong></span>
      </div>
    </header>

    <!-- Tarjetas de Estadísticas -->
    <div class="stats-bar">
      <div class="stat-card">
        <div class="stat-info">
          <span>Máquinas Activas</span>
          <h2 id="stat-online">0</h2>
        </div>
        <div class="stat-icon" style="color:#10B981;"><i class="fas fa-desktop"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <span>Modo Atención (Bloqueadas)</span>
          <h2 id="stat-locked" style="color:#EF4444;">0</h2>
        </div>
        <div class="stat-icon" style="color:#EF4444;"><i class="fas fa-lock"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <span>Total Registradas</span>
          <h2 id="stat-total">0</h2>
        </div>
        <div class="stat-icon" style="color:#38BDF8;"><i class="fas fa-network-wired"></i></div>
      </div>
    </div>

    <!-- Comandos Globales para Todo el Taller -->
    <section class="actions-section">
      <div class="section-title"><i class="fas fa-bolt"></i> Acciones para Todas las Máquinas</div>
      <div class="big-actions-grid">
        <button class="action-btn btn-lock" onclick="enviarComando('all', 'lock')">
          <i class="fas fa-lock"></i>
          <span>Modo Atención (Bloquear)</span>
        </button>
        <button class="action-btn btn-unlock" onclick="enviarComando('all', 'unlock')">
          <i class="fas fa-lock-open"></i>
          <span>Desbloquear Pantallas</span>
        </button>
        <button class="action-btn btn-msg" onclick="abrirModalMensaje('all')">
          <i class="fas fa-comment-dots"></i>
          <span>Enviar Mensaje</span>
        </button>
        <button class="action-btn btn-mute" onclick="enviarComando('all', 'mute')">
          <i class="fas fa-volume-mute"></i>
          <span>Silenciar Audio</span>
        </button>
        <button class="action-btn btn-off" onclick="confirmarApagado()">
          <i class="fas fa-power-off"></i>
          <span>Apagar Equipos</span>
        </button>
      </div>

      <!-- Lanzador de URLs del Taller -->
      <div class="section-title" style="margin-top:10px;"><i class="fas fa-rocket"></i> Abrir Proyecto / Web en Todo el Taller</div>
      <div class="quick-urls-grid">
        <button class="quick-url-btn" onclick="lanzarUrl('https://roboticapaulofreire-uy.github.io/bienvenido/')">
          <i class="fas fa-newspaper" style="color:#F59E0B;"></i> El Diario
        </button>
        <button class="quick-url-btn" onclick="lanzarUrl('https://scratch.mit.edu/projects/editor/')">
          <i class="fas fa-cat" style="color:#F97316;"></i> Scratch
        </button>
        <button class="quick-url-btn" onclick="lanzarUrl('https://makecode.microbit.org/')">
          <i class="fas fa-microchip" style="color:#10B981;"></i> MakeCode
        </button>
        <button class="quick-url-btn" onclick="lanzarUrl('https://www.paperme.de/paperme/default/')">
          <i class="fas fa-cube" style="color:#EA580C;"></i> PaperMe
        </button>
        <button class="quick-url-btn" onclick="lanzarUrl('https://sketch.metademolab.com/canvas')">
          <i class="fas fa-running" style="color:#3B82F6;"></i> Animated Draw
        </button>
        <button class="quick-url-btn" onclick="lanzarUrl('https://www.canva.com')">
          <i class="fas fa-palette" style="color:#8B5CF6;"></i> Canva
        </button>
      </div>

      <div class="custom-url-row">
        <input type="url" id="inp-custom-url" placeholder="Pegá cualquier enlace web acá (ej: https://wikipedia.org o video)">
        <button onclick="lanzarUrlPersonalizada()"><i class="fas fa-paper-plane"></i> Abrir en Todas</button>
      </div>
    </section>

    <!-- Lista de Máquinas de Alumnos -->
    <div class="section-title"><i class="fas fa-laptop-code"></i> Computadoras del Aula Conectadas</div>
    <div class="machines-grid" id="machines-container">
      <p style="color:var(--text-muted);font-size:0.9rem;">Esperando computadoras de los alumnos... Asegurate de ejecutar cliente_alumno.py en ellas.</p>
    </div>
  </div>

  <!-- Modal de Mensaje -->
  <div class="modal-overlay" id="modal-msg">
    <div class="modal-box">
      <h3>📢 Enviar Mensaje a Pantalla</h3>
      <p id="modal-msg-target">Destinatario: Todas las máquinas</p>
      <textarea id="modal-msg-text" placeholder="Escribí acá tu aviso (ej: ¡Quedan 5 minutos para guardar el proyecto y apagar los kits!)..."></textarea>
      <div class="modal-btns">
        <button class="mbtn-cancel" onclick="cerrarModalMensaje()">Cancelar</button>
        <button class="mbtn-send" onclick="enviarMensajeModal()">Enviar Aviso</button>
      </div>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    var currentTarget = 'all';

    function toast(txt, color) {
      var t = document.getElementById('toast');
      t.textContent = txt;
      t.style.background = color || '#10B981';
      t.style.display = 'block';
      setTimeout(function() { t.style.display = 'none'; }, 2200);
    }

    function enviarComando(target, action, params) {
      fetch('/api/comando', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: target, action: action, params: params || {} })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        toast('Comando «' + action + '» enviado a: ' + target);
        cargarEstado();
      })
      .catch(function(err) {
        toast('Error enviando comando: ' + err, '#EF4444');
      });
    }

    function lanzarUrl(url) {
      enviarComando('all', 'open_url', { url: url });
    }

    function lanzarUrlPersonalizada() {
      var inp = document.getElementById('inp-custom-url');
      var val = (inp.value || '').trim();
      if (!val) {
        alert('Ingresá una dirección web (ej: https://...)');
        return;
      }
      if (!/^https?:\\/\\//i.test(val)) val = 'https://' + val;
      lanzarUrl(val);
      inp.value = '';
    }

    function abrirModalMensaje(target) {
      currentTarget = target;
      document.getElementById('modal-msg-target').textContent = 'Destinatario: ' + (target === 'all' ? 'Todas las computadoras' : target);
      document.getElementById('modal-msg-text').value = '';
      document.getElementById('modal-msg').classList.add('open');
      setTimeout(function() { document.getElementById('modal-msg-text').focus(); }, 100);
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

    function confirmarApagado() {
      if (confirm('¿Estás seguro de que deseás apagar todas las computadoras del aula al terminar la clase?')) {
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
            cont.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;grid-column:1/-1;">Esperando computadoras... En cada máquina del alumno ejecutá <strong>iniciar_alumno.bat</strong>.</p>';
            return;
          }

          cont.innerHTML = maquinas.map(function(m) {
            var stateClass = !m.online ? 'offline' : (m.locked ? 'locked' : 'online');
            var pillHtml = !m.online
              ? '<span class="status-pill pill-offline">Desconectada</span>'
              : (m.locked ? '<span class="status-pill pill-locked">🔒 Bloqueada</span>' : '<span class="status-pill pill-online">🟢 Activa</span>');

            return '<div class="machine-card ' + stateClass + '">' +
              '<div class="machine-head">' +
                '<div class="machine-title">' +
                  '<i class="fas fa-desktop"></i>' +
                  '<div>' +
                    '<h3>' + m.hostname + '</h3>' +
                    '<p>' + m.ip + ' · ' + (m.os || 'SO') + '</p>' +
                  '</div>' +
                '</div>' +
                pillHtml +
              '</div>' +
              '<div class="machine-actions">' +
                (m.locked
                  ? '<button class="mini-btn mb-unlock" onclick="enviarComando(\\'' + m.id + '\\', \\'unlock\\')"><i class="fas fa-unlock"></i> Desbloquear</button>'
                  : '<button class="mini-btn mb-lock" onclick="enviarComando(\\'' + m.id + '\\', \\'lock\\')"><i class="fas fa-lock"></i> Bloquear</button>') +
                '<button class="mini-btn mb-msg" onclick="abrirModalMensaje(\\'' + m.id + '\\')"><i class="fas fa-comment"></i> Mensaje</button>' +
              '</div>' +
            '</div>';
          }).join('');
        })
        .catch(function(err) {
          console.warn('Error leyendo estado:', err);
        });
    }

    // Polling en vivo cada 1.5 segundos
    setInterval(cargarEstado, 1500);
    cargarEstado();
  </script>
</body>
</html>
"""

class ControlAulaHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silenciar logs http excesivos en terminal
        return

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)

        if url.path == "/" or url.path == "/index.html":
            html = DASHBOARD_HTML.replace("__DOCENTE_IP__", IP_DOCENTE).replace("__PUERTO__", str(PUERTO_WEB))
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        if url.path == "/api/status":
            with lock_estado:
                lista = list(maquinas.values())
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"ip": IP_DOCENTE, "maquinas": lista}).encode("utf-8"))
            return

        if url.path == "/api/poll":
            params = urllib.parse.parse_qs(url.query)
            mid = params.get("id", [""])[0]
            comandos_a_ejecutar = []

            with lock_estado:
                # Comandos individuales
                if mid in colas_comandos and colas_comandos[mid]:
                    comandos_a_ejecutar.extend(colas_comandos[mid])
                    colas_comandos[mid] = []

                # Comandos globales (cola_global)
                if mid in maquinas:
                    last_global = maquinas[mid].get("last_global_seq", 0)
                    nuevos_globales = [c for c in cola_global if c["seq"] > last_global]
                    if nuevos_globales:
                        comandos_a_ejecutar.extend(nuevos_globales)
                        maquinas[mid]["last_global_seq"] = cola_global[-1]["seq"]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"comandos": comandos_a_ejecutar}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"

        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}

        if url.path == "/api/ping":
            mid = data.get("id")
            if mid:
                with lock_estado:
                    if mid not in maquinas:
                        maquinas[mid] = {
                            "id": mid,
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
                        if "locked" in data:
                            m["locked"] = data["locked"]

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
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
                    # Actualizar estado proyectado
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

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"status": "queued"}')
            return

        self.send_response(404)
        self.end_headers()

def main():
    print("=" * 65)
    print("  COLEGIO PAULO FREIRE — SERVIDOR DE CONTROL DE AULA")
    print("=" * 65)
    print(f"  [+] IP del Docente detectada:  {IP_DOCENTE}")
    print(f"  [+] Interfaz Web de Control:  http://localhost:{PUERTO_WEB}")
    print(f"  [+] Acceso desde Móvil/Tablet: http://{IP_DOCENTE}:{PUERTO_WEB}")
    print(f"  [+] Faro de auto-descubrimiento activo en UDP:{PUERTO_UDP}")
    print("=" * 65)
    print("  Listo. Abrí el enlace en tu navegador para controlar el aula.")
    print("  Presioná Ctrl + C para detener el servidor.\n")

    # Iniciar hilo de faro UDP
    t_udp = threading.Thread(target=faro_udp, daemon=True)
    t_udp.start()

    # Iniciar hilo limpiador de inactivas
    t_clean = threading.Thread(target=limpiar_maquinas_inactivas, daemon=True)
    t_clean.start()

    # Iniciar servidor HTTP
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PUERTO_WEB), ControlAulaHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Servidor detenido por el docente.")

if __name__ == "__main__":
    main()
