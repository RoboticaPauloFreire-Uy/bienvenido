/**
 * ===================================================================
 * MINIJUEGO: NEON CYBER RUNNER 2099
 * ===================================================================
 * Arcade de plataformas infinito en Canvas HTML5 con doble salto,
 * obstáculos dinámicos, recolección de tokens de código y partículas.
 */

class NeonRunnerGame {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.isRunning = false;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('neonRunner_highScore') || '0', 10);
    this.tokensCollected = 0;
    this.speed = 5;
    this.distance = 0;
    
    // Jugador
    this.player = {
      x: 80,
      y: 200,
      width: 32,
      height: 48,
      dy: 0,
      gravity: 0.65,
      jumpPower: -12,
      isGrounded: false,
      jumpsLeft: 2,
      isSliding: false,
      trail: []
    };

    this.groundY = 280;
    this.obstacles = [];
    this.tokens = [];
    this.particles = [];
    this.obstacleTimer = 0;
    this.tokenTimer = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleTouch = this.handleTouch.bind(this);
    this.loop = this.loop.bind(this);
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper neon-runner-ui">
        <div class="game-hud">
          <div class="hud-item"><span class="hud-label">PUNTOS:</span> <span id="nr-score" class="hud-val">0</span></div>
          <div class="hud-item"><span class="hud-label">TOKENS &lt;/&gt;:</span> <span id="nr-tokens" class="hud-val">0</span></div>
          <div class="hud-item"><span class="hud-label">RÉCORD:</span> <span id="nr-highscore" class="hud-val">${this.highScore}</span></div>
        </div>
        <div class="canvas-box">
          <canvas id="neonRunnerCanvas" width="700" height="340"></canvas>
          <div id="nr-overlay" class="game-overlay">
            <h2 class="game-title">⚡ NEON CYBER RUNNER ⚡</h2>
            <p class="game-desc">¡Esquiva los Firewalls y recolecta Tokens de Código en el ciberespacio!</p>
            <div class="controls-badge">
              <span>[ ESPACIO / ARRIBA ] Saltar (x2)</span>
              <span>[ ABAJO ] Deslizarse</span>
            </div>
            <button id="nr-start-btn" class="btn btn-arcade-start">INICIAR PARTIDA</button>
          </div>
        </div>
        <div class="mobile-controls-row">
          <button id="nr-btn-jump" class="mobile-ctrl-btn">🚀 SALTAR</button>
          <button id="nr-btn-slide" class="mobile-ctrl-btn">⚡ DESLIZAR</button>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('neonRunnerCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Botones
    const startBtn = document.getElementById('nr-start-btn');
    startBtn.addEventListener('click', () => this.start());

    const jumpBtn = document.getElementById('nr-btn-jump');
    const slideBtn = document.getElementById('nr-btn-slide');
    if (jumpBtn) jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump(); });
    if (jumpBtn) jumpBtn.addEventListener('mousedown', () => this.jump());
    if (slideBtn) {
      slideBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.slide(true); });
      slideBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.slide(false); });
      slideBtn.addEventListener('mousedown', () => this.slide(true));
      slideBtn.addEventListener('mouseup', () => this.slide(false));
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('touchstart', this.handleTouch);

    this.drawInitialScreen();
  }

  drawInitialScreen() {
    this.ctx.fillStyle = '#0a0e1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
  }

  handleKeyDown(e) {
    if (!this.isRunning) {
      if (e.code === 'Space' || e.code === 'Enter') {
        this.start();
      }
      return;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      this.jump();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      this.slide(true);
    }
  }

  handleKeyUp(e) {
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.slide(false);
    }
  }

  handleTouch(e) {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.jump();
  }

  jump() {
    if (this.player.jumpsLeft > 0) {
      this.player.dy = this.player.jumpPower;
      this.player.isGrounded = false;
      this.player.jumpsLeft--;
      if (window.sounds) window.sounds.playJump();
      this.createParticles(this.player.x + 16, this.player.y + 40, '#00f2fe', 8);
    }
  }

  slide(active) {
    this.player.isSliding = active;
    if (active) {
      this.player.height = 24;
    } else {
      this.player.height = 48;
    }
  }

  start() {
    document.getElementById('nr-overlay').classList.add('hidden');
    this.score = 0;
    this.tokensCollected = 0;
    this.speed = 5;
    this.distance = 0;
    this.obstacles = [];
    this.tokens = [];
    this.particles = [];
    
    this.player.y = this.groundY - 48;
    this.player.dy = 0;
    this.player.jumpsLeft = 2;
    this.player.isSliding = false;
    this.player.height = 48;
    
    this.isRunning = true;
    if (window.sounds) window.sounds.playClick();

    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.loop();
  }

  createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        life: 25
      });
    }
  }

  spawnObstacle() {
    const isHigh = Math.random() > 0.65;
    if (isHigh) {
      // Obstáculo flotante (requiere deslizarse o salto muy preciso)
      this.obstacles.push({
        x: this.canvas.width + 20,
        y: this.groundY - 60,
        width: 35,
        height: 25,
        color: '#ff0055',
        type: 'drone'
      });
    } else {
      // Firewall de suelo
      const height = Math.random() > 0.5 ? 40 : 25;
      this.obstacles.push({
        x: this.canvas.width + 20,
        y: this.groundY - height,
        width: 25,
        height: height,
        color: '#ff3366',
        type: 'barrier'
      });
    }
  }

  spawnToken() {
    this.tokens.push({
      x: this.canvas.width + 20,
      y: this.groundY - 40 - Math.random() * 60,
      size: 14,
      collected: false
    });
  }

  update() {
    this.distance += 1;
    this.score = Math.floor(this.distance / 5) + (this.tokensCollected * 50);
    this.speed = 5 + Math.min(8, this.distance / 1200);

    // Actualizar HUD
    document.getElementById('nr-score').innerText = this.score;
    document.getElementById('nr-tokens').innerText = this.tokensCollected;

    // Física del Jugador
    this.player.dy += this.player.gravity;
    this.player.y += this.player.dy;

    if (this.player.y + this.player.height >= this.groundY) {
      this.player.y = this.groundY - this.player.height;
      this.player.dy = 0;
      this.player.isGrounded = true;
      this.player.jumpsLeft = 2;
    }

    // Estela del jugador
    if (this.distance % 2 === 0) {
      this.player.trail.push({
        x: this.player.x,
        y: this.player.y,
        w: this.player.width,
        h: this.player.height,
        alpha: 0.5
      });
      if (this.player.trail.length > 5) this.player.trail.shift();
    }

    // Spawn Obstáculos
    this.obstacleTimer++;
    if (this.obstacleTimer > 70 + Math.random() * 50 - (this.speed * 2)) {
      this.spawnObstacle();
      this.obstacleTimer = 0;
    }

    // Spawn Tokens
    this.tokenTimer++;
    if (this.tokenTimer > 90 + Math.random() * 80) {
      this.spawnToken();
      this.tokenTimer = 0;
    }

    // Mover Obstáculos
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      // Colisión
      if (
        this.player.x < obs.x + obs.width &&
        this.player.x + this.player.width > obs.x &&
        this.player.y < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y
      ) {
        this.gameOver();
        return;
      }

      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }

    // Mover Tokens
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tok = this.tokens[i];
      tok.x -= this.speed;

      // Recolección
      const dist = Math.hypot(
        (this.player.x + this.player.width / 2) - tok.x,
        (this.player.y + this.player.height / 2) - tok.y
      );

      if (dist < 28) {
        this.tokensCollected++;
        if (window.sounds) window.sounds.playCoin();
        this.createParticles(tok.x, tok.y, '#ffd700', 10);
        this.tokens.splice(i, 1);
        continue;
      }

      if (tok.x < -20) {
        this.tokens.splice(i, 1);
      }
    }

    // Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 1 / p.life;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.lineWidth = 1;

    // Líneas de fondo
    const offset = (this.distance * 2) % 40;
    for (let x = -offset; x < this.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }

    // Línea de Suelo Neón
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(this.canvas.width, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Suelo inferior
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fondo
    ctx.fillStyle = '#070b16';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();

    // Estela del Jugador
    this.player.trail.forEach(t => {
      ctx.fillStyle = `rgba(0, 242, 254, ${t.alpha * 0.4})`;
      ctx.fillRect(t.x, t.y, t.w, t.h);
    });

    // Jugador (Cyborg Runner)
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2fe';
    ctx.fillStyle = '#4facfe';
    ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

    // Visor brillante
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(this.player.x + 18, this.player.y + 6, 12, 6);
    ctx.restore();

    // Obstáculos (Firewalls)
    this.obstacles.forEach(obs => {
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = obs.color;
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      
      // Icono o detalle
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.fillText('!', obs.x + obs.width / 2 - 3, obs.y + obs.height / 2 + 4);
      ctx.restore();
    });

    // Tokens de Código </>
    this.tokens.forEach(tok => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(tok.x, tok.y, tok.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('</>', tok.x - 8, tok.y + 4);
      ctx.restore();
    });

    // Partículas
    this.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  loop() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  }

  gameOver() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationId);
    if (window.sounds) window.sounds.playGameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neonRunner_highScore', this.highScore.toString());
      document.getElementById('nr-highscore').innerText = this.highScore;
    }

    const overlay = document.getElementById('nr-overlay');
    overlay.innerHTML = `
      <h2 class="game-title error-text">💥 SISTEMA COLAPSADO 💥</h2>
      <p class="game-score-final">Puntuación: <strong>${this.score}</strong> | Tokens: <strong>${this.tokensCollected}</strong></p>
      <p class="game-highscore">Récord Actual: ${this.highScore}</p>
      <button id="nr-retry-btn" class="btn btn-arcade-start">REINTENTAR</button>
    `;
    overlay.classList.remove('hidden');

    document.getElementById('nr-retry-btn').addEventListener('click', () => this.start());
  }

  destroy() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.canvas) this.canvas.removeEventListener('touchstart', this.handleTouch);
  }
}

if (typeof window !== 'undefined') {
  window.NeonRunnerGame = NeonRunnerGame;
}
