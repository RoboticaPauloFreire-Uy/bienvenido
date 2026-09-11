/**
 * ===================================================================
 * APLICACIONES WEB INTERACTIVAS DEL TALLER:
 * 1. Pixel Art Studio (Diseñador de Sprites)
 * 2. Binary & Logic Translator
 * ===================================================================
 */

class PixelArtStudio {
  constructor(container) {
    this.container = container;
    this.gridSize = 16;
    this.currentColor = '#3b82f6';
    this.isDrawing = false;
    this.palette = [
      '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
      '#64748b', '#78350f'
    ];
  }

  init() {
    this.container.innerHTML = `
      <div class="tool-wrapper pixel-art-ui">
        <div class="tool-toolbar">
          <div class="palette-colors">
            ${this.palette.map((color, i) => `
              <button class="color-swatch ${i === 7 ? 'active' : ''}" style="background-color: ${color};" data-color="${color}"></button>
            `).join('')}
            <input type="color" id="custom-color-picker" value="${this.currentColor}" title="Color personalizado">
          </div>
          <div class="tool-actions">
            <button id="pa-clear-btn" class="btn-tool"><i class="fas fa-trash"></i> Limpiar</button>
            <button id="pa-export-btn" class="btn-tool btn-tool-primary"><i class="fas fa-download"></i> Exportar PNG</button>
          </div>
        </div>

        <div class="pixel-canvas-wrapper">
          <div id="pixel-grid" class="pixel-grid"></div>
        </div>
      </div>
    `;

    this.renderGrid();
    this.attachEvents();
  }

  renderGrid() {
    const grid = this.container.querySelector('#pixel-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

    for (let i = 0; i < this.gridSize * this.gridSize; i++) {
      const cell = document.createElement('div');
      cell.className = 'pixel-cell';
      
      cell.addEventListener('mousedown', () => {
        this.isDrawing = true;
        this.paintCell(cell);
      });

      cell.addEventListener('mouseenter', () => {
        if (this.isDrawing) {
          this.paintCell(cell);
        }
      });

      grid.appendChild(cell);
    }

    window.addEventListener('mouseup', () => {
      this.isDrawing = false;
    });
  }

  paintCell(cell) {
    cell.style.backgroundColor = this.currentColor;
    if (window.sounds) window.sounds.playTone(350, 'sine', 0.03, 0.05, 0.01);
  }

  attachEvents() {
    const swatches = this.container.querySelectorAll('.color-swatch');
    const colorPicker = this.container.querySelector('#custom-color-picker');

    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.currentColor = swatch.getAttribute('data-color');
      });
    });

    colorPicker.addEventListener('input', (e) => {
      swatches.forEach(s => s.classList.remove('active'));
      this.currentColor = e.target.value;
    });

    document.getElementById('pa-clear-btn').addEventListener('click', () => {
      const cells = this.container.querySelectorAll('.pixel-cell');
      cells.forEach(c => c.style.backgroundColor = 'transparent');
      if (window.sounds) window.sounds.playClick();
    });

    document.getElementById('pa-export-btn').addEventListener('click', () => {
      this.exportImage();
    });
  }

  exportImage() {
    const canvas = document.createElement('canvas');
    const scale = 20; // 16x16 -> 320x320
    canvas.width = this.gridSize * scale;
    canvas.height = this.gridSize * scale;
    const ctx = canvas.getContext('2d');

    const cells = this.container.querySelectorAll('.pixel-cell');
    cells.forEach((cell, idx) => {
      const x = (idx % this.gridSize) * scale;
      const y = Math.floor(idx / this.gridSize) * scale;
      const bg = cell.style.backgroundColor;

      if (bg && bg !== 'transparent') {
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, scale, scale);
      }
    });

    const link = document.createElement('a');
    link.download = 'pixel_sprite_taller.png';
    link.href = canvas.toDataURL();
    link.click();
    if (window.sounds) window.sounds.playSuccess();
  }

  destroy() {
    this.isDrawing = false;
  }
}

class BinaryTranslator {
  constructor(container) {
    this.container = container;
  }

  init() {
    this.container.innerHTML = `
      <div class="tool-wrapper binary-translator-ui">
        <div class="translator-grid">
          <div class="input-card">
            <label class="card-label">📝 Texto Normal / Frase:</label>
            <textarea id="bt-text-input" placeholder="Escribe aquí (ej: 'Hola Mundo' o 'Programar es genial')...">Taller de Programación</textarea>
          </div>
          <div class="output-card">
            <label class="card-label">💻 Representación Binaria (Bytes en Memoria):</label>
            <div id="bt-binary-output" class="code-terminal-box">01010100 01100001 01101100...</div>
          </div>
        </div>

        <div class="translator-grid secondary-row">
          <div class="output-card">
            <label class="card-label">🔢 Hexadecimal (Color / Memoria):</label>
            <div id="bt-hex-output" class="code-terminal-box hex-box">54 61 6c 6c 65 72...</div>
          </div>
          <div class="output-card">
            <label class="card-label">📊 Estadísticas de Datos:</label>
            <div id="bt-stats-box" class="stats-mini-grid">
              <div>Caracteres: <strong id="bt-char-count">23</strong></div>
              <div>Bits: <strong id="bt-bits-count">184</strong></div>
              <div>Bytes: <strong id="bt-bytes-count">23</strong></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById('bt-text-input');
    input.addEventListener('input', () => this.update());
    this.update();
  }

  update() {
    const text = document.getElementById('bt-text-input').value;
    const binaryOutput = document.getElementById('bt-binary-output');
    const hexOutput = document.getElementById('bt-hex-output');

    let binaryStr = '';
    let hexStr = '';

    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const bin = code.toString(2).padStart(8, '0');
      const hex = code.toString(16).toUpperCase().padStart(2, '0');
      binaryStr += bin + ' ';
      hexStr += hex + ' ';
    }

    binaryOutput.innerText = binaryStr || '(Escribe texto arriba para traducir)';
    hexOutput.innerText = hexStr || '(Vacío)';

    document.getElementById('bt-char-count').innerText = text.length;
    document.getElementById('bt-bytes-count').innerText = text.length;
    document.getElementById('bt-bits-count').innerText = text.length * 8;
  }

  destroy() {}
}

/**
 * ===================================================================
 * 3. Paint Cancha de Fútbol (Taller de Dibujo Digital - Sala 5)
 * Herramienta intuitiva de Paint para niños de 5 años usando figuras
 * geométricas (rectángulos, círculos, líneas y césped verde).
 * ===================================================================
 */
class PaintCanchaStudio {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.currentTool = 'rect'; // 'grass', 'rect', 'circle', 'line', 'brush', 'ball'
    this.currentColor = '#ffffff';
    this.lineWidth = 6;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.history = [];
    this.maxHistory = 15;
    this.previewImageData = null;
  }

  init() {
    this.container.innerHTML = `
      <div class="tool-wrapper paint-cancha-ui">
        <div class="pc-toolbar">
          <div class="pc-tools-group">
            <span class="pc-group-label"><i class="fas fa-shapes"></i> Figuras:</span>
            <button class="pc-btn-tool active" data-tool="rect" title="Dibujar Rectángulo (Límites y Áreas)">
              <i class="far fa-square"></i> Rectángulo
            </button>
            <button class="pc-btn-tool" data-tool="circle" title="Dibujar Círculo (Medio Campo y Penales)">
              <i class="far fa-circle"></i> Círculo
            </button>
            <button class="pc-btn-tool" data-tool="line" title="Dibujar Línea Recta (Mitad de Cancha)">
              <i class="fas fa-minus"></i> Línea
            </button>
            <button class="pc-btn-tool" data-tool="ball" title="Estampar Pelota de Fútbol">
              ⚽ Pelota
            </button>
            <button class="pc-btn-tool" data-tool="brush" title="Pincel Libre para Redes y Jugadores">
              <i class="fas fa-paint-brush"></i> Pincel
            </button>
          </div>

          <div class="pc-colors-group">
            <span class="pc-group-label"><i class="fas fa-palette"></i> Colores:</span>
            <button class="pc-color-btn active" style="background:#ffffff;" data-color="#ffffff" title="Blanco (Líneas de la cancha)"></button>
            <button class="pc-color-btn" style="background:#16A34A;" data-color="#16A34A" title="Verde Césped"></button>
            <button class="pc-color-btn" style="background:#FACC15;" data-color="#FACC15" title="Amarillo"></button>
            <button class="pc-color-btn" style="background:#2563EB;" data-color="#2563EB" title="Azul"></button>
            <button class="pc-color-btn" style="background:#DC2626;" data-color="#DC2626" title="Rojo"></button>
            <button class="pc-color-btn" style="background:#000000;" data-color="#000000" title="Negro"></button>
          </div>

          <div class="pc-actions-group">
            <button id="pc-fill-grass-btn" class="pc-btn-action" style="background:#166534;color:#fff;" title="Pintar todo de césped verde">
              <i class="fas fa-fill-drip"></i> Césped
            </button>
            <button id="pc-undo-btn" class="pc-btn-action" title="Deshacer último trazo (Ctrl+Z)">
              <i class="fas fa-undo"></i> Deshacer
            </button>
            <button id="pc-clear-btn" class="pc-btn-action" title="Borrar todo">
              <i class="fas fa-trash"></i> Limpiar
            </button>
            <button id="pc-export-btn" class="pc-btn-action pc-btn-export" title="Descargar dibujo como imagen para entregar en Google Drive">
              <i class="fas fa-download"></i> Guardar PNG
            </button>
          </div>
        </div>

        <div class="pc-canvas-container">
          <canvas id="paint-cancha-canvas" width="800" height="520"></canvas>
          <div class="pc-canvas-hint">
            <span><i class="fas fa-lightbulb"></i> <strong>Tip de Paint:</strong> Arrastrá con el mouse o dedo para formar la figura. ¡Usá <strong>Rectángulo</strong> para la cancha, <strong>Línea</strong> para el medio y <strong>Círculo</strong> para el centro!</span>
          </div>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('#paint-cancha-canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    this.setupGrassBackground();
    this.saveState();
    this.attachEvents();
  }

  setupGrassBackground() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Dibujar césped verde a rayas sutiles como cancha profesional
    this.ctx.fillStyle = '#15803D';
    this.ctx.fillRect(0, 0, w, h);

    const stripes = 8;
    const stripeW = w / stripes;
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) {
        this.ctx.fillStyle = '#16A34A';
        this.ctx.fillRect(i * stripeW, 0, stripeW, h);
      }
    }
  }

  saveState() {
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
  }

  undo() {
    if (this.history.length > 1) {
      this.history.pop();
      const previousState = this.history[this.history.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
      if (window.sounds) window.sounds.playClick();
    }
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  attachEvents() {
    // Selección de herramientas
    const toolBtns = this.container.querySelectorAll('.pc-btn-tool');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTool = btn.getAttribute('data-tool');
        if (window.sounds) window.sounds.playClick();
      });
    });

    // Selección de colores
    const colorBtns = this.container.querySelectorAll('.pc-color-btn');
    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentColor = btn.getAttribute('data-color');
        if (window.sounds) window.sounds.playClick();
      });
    });

    // Césped
    document.getElementById('pc-fill-grass-btn').addEventListener('click', () => {
      this.setupGrassBackground();
      this.saveState();
      if (window.sounds) window.sounds.playSuccess();
    });

    // Deshacer
    document.getElementById('pc-undo-btn').addEventListener('click', () => {
      this.undo();
    });

    // Limpiar
    document.getElementById('pc-clear-btn').addEventListener('click', () => {
      if (confirm('¿Querés limpiar la hoja y volver a empezar?')) {
        this.setupGrassBackground();
        this.saveState();
        if (window.sounds) window.sounds.playClick();
      }
    });

    // Exportar
    document.getElementById('pc-export-btn').addEventListener('click', () => {
      this.exportImage();
    });

    // Tecla Ctrl + Z
    this.keyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Eventos de dibujo en Canvas
    const onStart = (e) => {
      e.preventDefault();
      const pos = this.getCanvasPos(e);
      this.isDrawing = true;
      this.startX = pos.x;
      this.startY = pos.y;
      this.previewImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

      if (this.currentTool === 'brush') {
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
      } else if (this.currentTool === 'ball') {
        this.drawBall(pos.x, pos.y, 20);
        this.saveState();
        this.isDrawing = false;
        if (window.sounds) window.sounds.playTone(520, 'sine', 0.08, 0.1, 0.01);
      }
    };

    const onMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = this.getCanvasPos(e);

      if (this.currentTool === 'brush') {
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
      } else {
        // Restaurar estado antes de previsualizar forma
        this.ctx.putImageData(this.previewImageData, 0, 0);
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.lineCap = 'round';

        if (this.currentTool === 'rect') {
          const w = pos.x - this.startX;
          const h = pos.y - this.startY;
          this.ctx.strokeRect(this.startX, this.startY, w, h);
        } else if (this.currentTool === 'circle') {
          const radius = Math.hypot(pos.x - this.startX, pos.y - this.startY);
          this.ctx.beginPath();
          this.ctx.arc(this.startX, this.startY, radius, 0, Math.PI * 2);
          this.ctx.stroke();
        } else if (this.currentTool === 'line') {
          this.ctx.beginPath();
          this.ctx.moveTo(this.startX, this.startY);
          this.ctx.lineTo(pos.x, pos.y);
          this.ctx.stroke();
        }
      }
    };

    const onEnd = (e) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      this.saveState();
      if (window.sounds) window.sounds.playTone(420, 'triangle', 0.05, 0.05, 0.01);
    };

    this.canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    this.canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  drawBall(x, y, r) {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#000000';
    this.ctx.stroke();

    // Pentágono central negro de la pelota
    this.ctx.beginPath();
    this.ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
    this.ctx.fillStyle = '#000000';
    this.ctx.fill();
    this.ctx.restore();
  }

  exportImage() {
    const link = document.createElement('a');
    link.download = 'cancha_futbol_paint_sala5.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    if (window.sounds) window.sounds.playSuccess();
    alert('¡Excelente! Tu dibujo se descargó como "cancha_futbol_paint_sala5.png". Ahora podés subirlo a tu carpeta de Google Drive en la plataforma.');
  }

  destroy() {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
  }
}

if (typeof window !== 'undefined') {
  window.PixelArtStudio = PixelArtStudio;
  window.BinaryTranslator = BinaryTranslator;
  window.PaintCanchaStudio = PaintCanchaStudio;
}

