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

if (typeof window !== 'undefined') {
  window.PixelArtStudio = PixelArtStudio;
  window.BinaryTranslator = BinaryTranslator;
}
