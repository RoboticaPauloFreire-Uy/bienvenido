/**
 * ===================================================================
 * MINIJUEGO: CYBER LOCK - MEMORY MATRIX
 * ===================================================================
 * Desafío de memoria lógica y secuencias binarias/hacker.
 * El jugador debe memorizar e ingresar la secuencia de nodos de seguridad.
 */

class CodeBreakerGame {
  constructor(container) {
    this.container = container;
    this.sequence = [];
    this.playerSequence = [];
    this.level = 1;
    this.isShowingSequence = false;
    this.isRunning = false;
    this.highScore = parseInt(localStorage.getItem('codeBreaker_highScore') || '1', 10);
    this.nodeFrequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper code-breaker-ui">
        <div class="game-hud">
          <div class="hud-item"><span class="hud-label">NIVEL DE ACCESO:</span> <span id="cb-level" class="hud-val">1</span></div>
          <div class="hud-item"><span class="hud-label">ESTADO:</span> <span id="cb-status" class="hud-val">EN ESPERA</span></div>
          <div class="hud-item"><span class="hud-label">MÁXIMO NIVEL:</span> <span id="cb-highscore" class="hud-val">${this.highScore}</span></div>
        </div>
        
        <div class="matrix-board">
          <div class="matrix-grid">
            <button class="matrix-node node-cyan" data-index="0">
              <span class="node-icon">01</span>
              <span class="node-tag">ALPHA</span>
            </button>
            <button class="matrix-node node-purple" data-index="1">
              <span class="node-icon">10</span>
              <span class="node-tag">BETA</span>
            </button>
            <button class="matrix-node node-amber" data-index="2">
              <span class="node-icon">11</span>
              <span class="node-tag">GAMMA</span>
            </button>
            <button class="matrix-node node-emerald" data-index="3">
              <span class="node-icon">00</span>
              <span class="node-tag">DELTA</span>
            </button>
          </div>

          <div id="cb-overlay" class="game-overlay">
            <h2 class="game-title">🔐 CYBER LOCK MATRIX 🔐</h2>
            <p class="game-desc">Memoriza la secuencia de nodos de seguridad y desbloquea el servidor central.</p>
            <button id="cb-start-btn" class="btn btn-arcade-start">HACKEAR SISTEMA</button>
          </div>
        </div>

        <div class="terminal-log-box">
          <span class="log-prefix">&gt; SYSTEM LOG:</span> <span id="cb-log-text">Inicia el protocolo de autenticación...</span>
        </div>
      </div>
    `;

    document.getElementById('cb-start-btn').addEventListener('click', () => this.start());

    const nodes = this.container.querySelectorAll('.matrix-node');
    nodes.forEach(node => {
      node.addEventListener('click', () => {
        const index = parseInt(node.getAttribute('data-index'), 10);
        this.handleNodeClick(index, node);
      });
    });
  }

  start() {
    document.getElementById('cb-overlay').classList.add('hidden');
    this.sequence = [];
    this.playerSequence = [];
    this.level = 1;
    this.isRunning = true;
    this.updateHUD();
    this.log("Iniciando brecha de seguridad Nivel 1...");
    this.nextRound();
  }

  updateHUD() {
    document.getElementById('cb-level').innerText = this.level;
    document.getElementById('cb-highscore').innerText = this.highScore;
  }

  log(msg) {
    const el = document.getElementById('cb-log-text');
    if (el) el.innerText = msg;
  }

  nextRound() {
    this.playerSequence = [];
    this.isShowingSequence = true;
    document.getElementById('cb-status').innerText = "OBSERVANDO SECUENCIA";
    document.getElementById('cb-status').className = "hud-val status-watch";
    this.log(`Descifrando código de seguridad... Ronda ${this.level}`);

    // Agregar un nodo aleatorio a la secuencia
    this.sequence.push(Math.floor(Math.random() * 4));

    // Reproducir la secuencia paso a paso
    let step = 0;
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }

      this.flashNode(this.sequence[step]);
      step++;

      if (step >= this.sequence.length) {
        clearInterval(interval);
        setTimeout(() => {
          this.isShowingSequence = false;
          document.getElementById('cb-status').innerText = "TU TURNO (INGRESA EL CÓDIGO)";
          document.getElementById('cb-status').className = "hud-val status-turn";
          this.log("Tu turno: Ingresa la secuencia en el orden correcto.");
        }, 500);
      }
    }, 650);
  }

  flashNode(index) {
    const nodes = this.container.querySelectorAll('.matrix-node');
    const node = nodes[index];
    if (!node) return;

    node.classList.add('active-flash');
    if (window.sounds) {
      window.sounds.playTone(this.nodeFrequencies[index], 'sine', 0.2, 0.2, 0.01);
    }

    setTimeout(() => {
      node.classList.remove('active-flash');
    }, 350);
  }

  handleNodeClick(index, nodeElement) {
    if (!this.isRunning || this.isShowingSequence) return;

    this.flashNode(index);
    this.playerSequence.push(index);

    const currentStep = this.playerSequence.length - 1;

    // Verificar si acertó
    if (this.playerSequence[currentStep] !== this.sequence[currentStep]) {
      this.gameOver();
      return;
    }

    // Si completó toda la secuencia actual
    if (this.playerSequence.length === this.sequence.length) {
      if (window.sounds) window.sounds.playSuccess();
      this.level++;
      if (this.level > this.highScore) {
        this.highScore = this.level;
        localStorage.setItem('codeBreaker_highScore', this.highScore.toString());
      }
      this.updateHUD();
      this.log(`¡Acceso concedido! Avanzando al Nivel ${this.level}...`);
      setTimeout(() => {
        this.nextRound();
      }, 1000);
    }
  }

  gameOver() {
    this.isRunning = false;
    if (window.sounds) window.sounds.playError();
    document.getElementById('cb-status').innerText = "ACCESO DENEGADO";
    document.getElementById('cb-status').className = "hud-val status-error";

    const overlay = document.getElementById('cb-overlay');
    overlay.innerHTML = `
      <h2 class="game-title error-text">⛔ ALARMA DE INTRUSIÓN ⛔</h2>
      <p class="game-score-final">Llegaste al Nivel: <strong>${this.level}</strong></p>
      <p class="game-highscore">Récord de Acceso: ${this.highScore}</p>
      <button id="cb-retry-btn" class="btn btn-arcade-start">REINTENTAR ACCESO</button>
    `;
    overlay.classList.remove('hidden');

    document.getElementById('cb-retry-btn').addEventListener('click', () => this.start());
  }

  destroy() {
    this.isRunning = false;
  }
}

if (typeof window !== 'undefined') {
  window.CodeBreakerGame = CodeBreakerGame;
}
