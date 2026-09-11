/**
 * =============================================================
 * JUEGO.JS — Página dedicada de juego (juego.html?game=...)
 * Lee el parámetro 'game' de la URL y carga el motor correspondiente.
 * =============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const params     = new URLSearchParams(window.location.search);
  const engineId   = params.get('game');
  const titleEl    = document.getElementById('game-title');
  const loading    = document.getElementById('loading-state');
  const area       = document.getElementById('game-fullarea');
  const footer     = document.getElementById('game-footer');

  // Configuración de cada motor
  const GAME_CONFIGS = {
    neonRunner: {
      name:         'Neon Cyber Runner 2099',
      GameClass:    () => window.NeonRunnerGame,
      footerHints: [
        { icon: 'fas fa-arrow-up',   text: '[ ↑ / Espacio ] Saltar' },
        { icon: 'fas fa-arrow-down', text: '[ ↓ ] Deslizarse' },
        { icon: 'fas fa-sync-alt',   text: 'Doble salto disponible' }
      ]
    },
    retroSnake: {
      name:         'Bug Hunter: Retro Snake',
      GameClass:    () => window.RetroSnakeGame,
      footerHints: [
        { icon: 'fas fa-arrows-alt', text: '[ Flechas / WASD ] Mover' }
      ]
    },
    codeBreaker: {
      name:         'Cyber Lock: Memory Matrix',
      GameClass:    () => window.CodeBreakerGame,
      footerHints: [
        { icon: 'fas fa-mouse-pointer', text: 'Haz clic en los nodos en el orden correcto' }
      ]
    },
    devQuiz: {
      name:         'Desafío de Lógica & Código Quiz',
      GameClass:    () => window.DevQuizGame,
      footerHints: [
        { icon: 'fas fa-mouse-pointer', text: 'Haz clic en la respuesta correcta' },
        { icon: 'fas fa-clock',         text: 'Tenés tiempo limitado por pregunta' }
      ]
    },
    pixelMaker: {
      name:         'Pixel Art Studio',
      GameClass:    () => window.PixelArtStudio,
      footerHints: [
        { icon: 'fas fa-mouse-pointer', text: 'Clic en la cuadrícula para pintar' },
        { icon: 'fas fa-download',       text: 'Botón Exportar para guardar tu sprite' }
      ]
    },
    binaryTranslator: {
      name:         'Traductor Binario',
      GameClass:    () => window.BinaryTranslator,
      footerHints: [
        { icon: 'fas fa-keyboard', text: 'Escribí cualquier texto para convertirlo a binario' }
      ]
    }
  };

  const config = GAME_CONFIGS[engineId];

  if (!config) {
    loading.innerHTML = `
      <div class="game-error">
        <p style="font-size:2rem;margin-bottom:12px;">🔍</p>
        <p style="font-size:1rem;margin-bottom:8px;">Juego no encontrado: <strong>${engineId || '(ninguno)'}</strong></p>
        <a href="index.html">← Volver al inicio</a>
      </div>`;
    return;
  }

  // Título
  titleEl.textContent = config.name;
  document.title = `${config.name} — Colegio Paulo Freire`;

  // Pie de instrucciones
  footer.innerHTML = config.footerHints.map(h =>
    `<span><i class="${h.icon}"></i> ${h.text}</span>`
  ).join('');
  footer.style.display = 'flex';

  // Instanciar el juego
  const GameClass = config.GameClass();

  if (!GameClass) {
    loading.textContent = 'Error: el archivo del juego no se cargó correctamente.';
    return;
  }

  loading.style.display = 'none';
  area.style.display    = 'flex';

  const gameInstance = new GameClass(area);
  gameInstance.init();
});
