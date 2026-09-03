/**
 * =============================================================
 * MODAL UNIVERSAL — Compartido entre index.html y aula.html
 * =============================================================
 */

(function () {
  const state = { currentGame: null };

  // ─────────────────────────────────────────────
  // PLATAFORMAS
  // ─────────────────────────────────────────────
  function platformMeta(platform) {
    switch (platform) {
      case 'scratch':   return { label: 'Scratch',       icon: '🐱', cls: 'pb-scratch'  };
      case 'scratchjr':
      case 'codejr':    return { label: 'Scratch Jr',    icon: '🎨', cls: 'pb-scratch'  };
      case 'codeorg':   return { label: 'Code.org',      icon: '🧩', cls: 'pb-codeorg'  };
      case 'makecode': return { label: 'MakeCode',      icon: '🕹️', cls: 'pb-makecode' };
      case 'native':   return { label: 'Juego Web',     icon: '⚡', cls: 'pb-native'   };
      case 'web':      return { label: 'App / Tool',    icon: '💻', cls: 'pb-web'      };
      default:         return { label: 'Proyecto',      icon: '📁', cls: 'pb-default'  };
    }
  }

  // ─────────────────────────────────────────────
  // ABRIR MODAL
  // ─────────────────────────────────────────────
  function openModal(item) {
    if (window.sounds) window.sounds.playClick();

    const modal       = document.getElementById('game-modal');
    const titleEl     = document.getElementById('modal-game-title');
    const badgeEl     = document.getElementById('modal-platform-badge');
    const authorEl    = document.getElementById('modal-author');
    const instrEl     = document.getElementById('modal-instructions');
    const container   = document.getElementById('game-embed-container');
    const extBtn      = document.getElementById('modal-external-btn');

    // Limpiar juego anterior
    if (state.currentGame && typeof state.currentGame.destroy === 'function') {
      state.currentGame.destroy();
      state.currentGame = null;
    }
    container.innerHTML = '';

    // Metadatos
    const pm = platformMeta(item.platform);
    titleEl.textContent = item.title;
    badgeEl.textContent = `${pm.icon} ${pm.label}`;
    if (authorEl) authorEl.style.display = 'none';
    instrEl.textContent  = item.instructions || '¡A jugar!';

    // Botón externo
    const extUrl = item.scratchId
      ? `https://scratch.mit.edu/projects/${item.scratchId}`
      : (item.externalUrl || null);

    if (extUrl) {
      extBtn.href = extUrl;
      extBtn.innerHTML = `<i class="fas fa-external-link-alt"></i> Abrir en ${pm.label}`;
      extBtn.style.display = 'inline-flex';
    } else {
      extBtn.style.display = 'none';
    }

    // Cargar contenido
    if (item.platform === 'scratch' && item.scratchId) {
      container.innerHTML = `
        <div class="iframe-embed-box">
          <iframe src="https://scratch.mit.edu/projects/${item.scratchId}/embed"
            width="485" height="402" allowtransparency="true"
            frameborder="0" scrolling="no" allowfullscreen></iframe>
        </div>`;

    } else if (item.platform === 'codeorg' && item.embedUrl) {
      container.innerHTML = `
        <div class="codeorg-embed-box">
          <iframe src="${item.embedUrl}" width="100%" height="460"
            frameborder="0" allowfullscreen></iframe>
        </div>`;

    } else if (item.platform === 'makecode') {
      container.innerHTML = `
        <div class="makecode-embed-box" style="text-align:center;padding:28px 16px;">
          <p style="color:rgba(255,255,255,.7);margin-bottom:18px;font-size:.95rem;">
            Este juego se abre en MakeCode Arcade en una nueva ventana.
          </p>
          <a href="${item.externalUrl || 'https://arcade.makecode.com'}"
            target="_blank" rel="noopener noreferrer"
            class="btn-arcade-start" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-family:Nunito,sans-serif;">
            <i class="fas fa-gamepad"></i> Abrir en MakeCode Arcade
          </a>
        </div>`;

    } else if (item.platform === 'native') {
      const map = {
        neonRunner:   window.NeonRunnerGame,
        retroSnake:   window.RetroSnakeGame,
        codeBreaker:  window.CodeBreakerGame,
        devQuiz:      window.DevQuizGame
      };
      const GameClass = map[item.gameEngine];
      if (GameClass) {
        state.currentGame = new GameClass(container);
        state.currentGame.init();
      }

    } else if (item.platform === 'web' && item.isTool) {
      if (item.toolType === 'pixelMaker' && window.PixelArtStudio) {
        state.currentGame = new window.PixelArtStudio(container);
        state.currentGame.init();
      } else if (item.toolType === 'binaryTranslator' && window.BinaryTranslator) {
        state.currentGame = new window.BinaryTranslator(container);
        state.currentGame.init();
      }

    } else if (item.externalUrl) {
      // Proyectos web no reproducibles → abrir en nueva pestaña
      window.open(item.externalUrl, '_blank');
      return;

    } else {
      container.innerHTML = `
        <div style="padding:48px;text-align:center;color:rgba(255,255,255,.5);">
          <p style="font-size:1.1rem;">Este proyecto se abre en su plataforma original.</p>
        </div>`;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ─────────────────────────────────────────────
  // CERRAR MODAL
  // ─────────────────────────────────────────────
  function closeModal() {
    const modal = document.getElementById('game-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (state.currentGame && typeof state.currentGame.destroy === 'function') {
      state.currentGame.destroy();
      state.currentGame = null;
    }
    document.getElementById('game-embed-container').innerHTML = '';
  }

  // ─────────────────────────────────────────────
  // EVENTOS
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);

    document.getElementById('game-modal')?.addEventListener('click', e => {
      if (e.target === document.getElementById('game-modal')) closeModal();
    });

    document.getElementById('modal-fullscreen-btn')?.addEventListener('click', () => {
      const c = document.getElementById('game-embed-container');
      if (!document.fullscreenElement) {
        c.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // Hamburger (mobile sidebar)
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar   = document.getElementById('sidebar');
    hamburger?.addEventListener('click', () => {
      sidebar?.classList.toggle('open');
    });

    // Cerrar sidebar al hacer clic fuera (mobile)
    document.addEventListener('click', e => {
      if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== hamburger) {
          sidebar.classList.remove('open');
        }
      }
    });
  });

  // ─────────────────────────────────────────────
  // EXPORTAR
  // ─────────────────────────────────────────────
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.platformMeta = platformMeta;

})();
