/**
 * ===================================================================
 * MINIJUEGO: BUG HUNTER RETRO CODE SNAKE
 * ===================================================================
 * Serpiente retro temática de programación: caza bugs de código para
 * compilar tu programa y evitar chocar contra los límites del procesador.
 */

class RetroSnakeGame {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.gridSize = 20;
    this.tileCountX = 25;
    this.tileCountY = 16;
    
    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.bug = { x: 10, y: 10, type: 'syntax_error' };
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('retroSnake_highScore') || '0', 10);
    this.isRunning = false;
    this.gameInterval = null;
    this.speed = 110; // ms

    this.bugTypes = [
      { name: "SyntaxError", color: "#10b981", points: 10, label: "{;}" },
      { name: "NullPointer", color: "#06b6d4", points: 20, label: "null" },
      { name: "InfiniteLoop", color: "#ec4899", points: 30, label: "while" }
    ];

    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper retro-snake-ui">
        <div class="game-hud">
          <div class="hud-item"><span class="hud-label">BUGS DEPURADOS:</span> <span id="rs-score" class="hud-val">0</span></div>
          <div class="hud-item"><span class="hud-label">LONGITUD:</span> <span id="rs-length" class="hud-val">3</span></div>
          <div class="hud-item"><span class="hud-label">RÉCORD:</span> <span id="rs-highscore" class="hud-val">${this.highScore}</span></div>
        </div>
        <div class="canvas-box">
          <canvas id="retroSnakeCanvas" width="500" height="320"></canvas>
          <div id="rs-overlay" class="game-overlay">
            <h2 class="game-title">🐛 BUG HUNTER SNAKE 🐛</h2>
            <p class="game-desc">¡Controla al recolector de bugs para limpiar el código de errores!</p>
            <div class="controls-badge">
              <span>[ FLECHAS / WASD ] Mover la serpiente</span>
            </div>
            <button id="rs-start-btn" class="btn btn-arcade-start">INICIAR DEPURACIÓN</button>
          </div>
        </div>
        <div class="mobile-dpad">
          <button id="rs-btn-up" class="dpad-btn dpad-up">▲</button>
          <div class="dpad-middle">
            <button id="rs-btn-left" class="dpad-btn dpad-left">◀</button>
            <button id="rs-btn-down" class="dpad-btn dpad-down">▼</button>
            <button id="rs-btn-right" class="dpad-btn dpad-right">▶</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('retroSnakeCanvas');
    this.ctx = this.canvas.getContext('2d');

    document.getElementById('rs-start-btn').addEventListener('click', () => this.start());

    // Botones virtuales
    const upBtn = document.getElementById('rs-btn-up');
    const downBtn = document.getElementById('rs-btn-down');
    const leftBtn = document.getElementById('rs-btn-left');
    const rightBtn = document.getElementById('rs-btn-right');

    if (upBtn) upBtn.addEventListener('click', () => this.setDir(0, -1));
    if (downBtn) downBtn.addEventListener('click', () => this.setDir(0, 1));
    if (leftBtn) leftBtn.addEventListener('click', () => this.setDir(-1, 0));
    if (rightBtn) rightBtn.addEventListener('click', () => this.setDir(1, 0));

    window.addEventListener('keydown', this.handleKeyDown);
    this.drawStaticScreen();
  }

  setDir(x, y) {
    if ((x !== 0 && this.direction.x !== -x) || (y !== 0 && this.direction.y !== -y)) {
      this.nextDirection = { x, y };
      if (window.sounds) window.sounds.playClick();
    }
  }

  handleKeyDown(e) {
    if (!this.isRunning) {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.start();
      }
      return;
    }

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        this.setDir(0, -1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.setDir(0, 1);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.setDir(-1, 0);
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.setDir(1, 0);
        break;
    }
  }

  start() {
    document.getElementById('rs-overlay').classList.add('hidden');
    this.snake = [
      { x: 5, y: 8 },
      { x: 4, y: 8 },
      { x: 3, y: 8 }
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.spawnBug();
    this.isRunning = true;

    if (this.gameInterval) clearInterval(this.gameInterval);
    this.gameInterval = setInterval(() => this.tick(), this.speed);
  }

  spawnBug() {
    let valid = false;
    while (!valid) {
      this.bug.x = Math.floor(Math.random() * this.tileCountX);
      this.bug.y = Math.floor(Math.random() * this.tileCountY);
      valid = !this.snake.some(segment => segment.x === this.bug.x && segment.y === this.bug.y);
    }
    const bugInfo = this.bugTypes[Math.floor(Math.random() * this.bugTypes.length)];
    this.bug.color = bugInfo.color;
    this.bug.label = bugInfo.label;
    this.bug.points = bugInfo.points;
  }

  tick() {
    if (!this.isRunning) return;

    this.direction = this.nextDirection;
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y
    };

    // Colisión con paredes
    if (head.x < 0 || head.x >= this.tileCountX || head.y < 0 || head.y >= this.tileCountY) {
      this.gameOver();
      return;
    }

    // Colisión consigo misma
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    // Comer bug
    if (head.x === this.bug.x && head.y === this.bug.y) {
      this.score += this.bug.points;
      if (window.sounds) window.sounds.playCoin();
      document.getElementById('rs-score').innerText = this.score;
      document.getElementById('rs-length').innerText = this.snake.length;
      this.spawnBug();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  drawStaticScreen() {
    this.ctx.fillStyle = '#0b1120';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Rejilla sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Dibujar Bug
    ctx.save();
    ctx.fillStyle = this.bug.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.bug.color;
    ctx.fillRect(
      this.bug.x * this.gridSize + 2,
      this.bug.y * this.gridSize + 2,
      this.gridSize - 4,
      this.gridSize - 4
    );

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(this.bug.label, this.bug.x * this.gridSize + 3, this.bug.y * this.gridSize + 13);
    ctx.restore();

    // Dibujar Serpiente
    this.snake.forEach((seg, index) => {
      ctx.save();
      if (index === 0) {
        // Cabeza
        ctx.fillStyle = '#10b981';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#10b981';
        ctx.fillRect(seg.x * this.gridSize + 1, seg.y * this.gridSize + 1, this.gridSize - 2, this.gridSize - 2);

        // Ojos
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(seg.x * this.gridSize + 4, seg.y * this.gridSize + 4, 3, 3);
        ctx.fillRect(seg.x * this.gridSize + 13, seg.y * this.gridSize + 4, 3, 3);
      } else {
        // Cuerpo con degradado verde esmeralda
        ctx.fillStyle = '#059669';
        ctx.fillRect(seg.x * this.gridSize + 2, seg.y * this.gridSize + 2, this.gridSize - 4, this.gridSize - 4);
      }
      ctx.restore();
    });
  }

  gameOver() {
    this.isRunning = false;
    clearInterval(this.gameInterval);
    if (window.sounds) window.sounds.playGameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('retroSnake_highScore', this.highScore.toString());
      document.getElementById('rs-highscore').innerText = this.highScore;
    }

    const overlay = document.getElementById('rs-overlay');
    overlay.innerHTML = `
      <h2 class="game-title error-text">⚠️ EXCEPCIÓN NO CONTROLADA ⚠️</h2>
      <p class="game-score-final">Puntuación: <strong>${this.score}</strong> | Bugs: <strong>${this.snake.length - 3}</strong></p>
      <p class="game-highscore">Récord de Depuración: ${this.highScore}</p>
      <button id="rs-retry-btn" class="btn btn-arcade-start">REINTENTAR COMPILACIÓN</button>
    `;
    overlay.classList.remove('hidden');

    document.getElementById('rs-retry-btn').addEventListener('click', () => this.start());
  }

  destroy() {
    this.isRunning = false;
    if (this.gameInterval) clearInterval(this.gameInterval);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

if (typeof window !== 'undefined') {
  window.RetroSnakeGame = RetroSnakeGame;
}
