/**
 * ===================================================================
 * MINIJUEGO: DESAFÍO DE LÓGICA & CÓDIGO QUIZ
 * ===================================================================
 * Trivia interactiva con preguntas de programación, Scratch, algoritmos
 * y desarrollo de videojuegos para los estudiantes del taller.
 */

class DevQuizGame {
  constructor(container) {
    this.container = container;
    this.currentIndex = 0;
    this.score = 0;
    this.timer = null;
    this.timeLeft = 15;
    this.highScore = parseInt(localStorage.getItem('devQuiz_highScore') || '0', 10);

    this.questions = [
      {
        question: "¿Qué estructura se utiliza para repetir una acción varias veces de forma automática?",
        options: ["Un Bucle / Repetir (Loop)", "Una Variable", "Un Evento de clic", "Un Operador Matemático"],
        answer: 0,
        explanation: "Los bucles (como 'repetir 10 veces' en Scratch o 'for/while' en JS/Python) sirven para iterar instrucciones."
      },
      {
        question: "En Scratch, ¿con qué bloque solemos iniciar el programa principal?",
        options: ["Al presionar bandera verde", "Detener todos", "Esperar 1 segundo", "Cambiar disfraz"],
        answer: 0,
        explanation: "El evento 'Al hacer clic en bandera verde' es el punto de partida estándar en los proyectos de Scratch."
      },
      {
        question: "Si queremos guardar la puntuación de un jugador en nuestro juego, ¿qué elemento necesitamos crear?",
        options: ["Un Disfraz", "Una Variable", "Un Fondo", "Un Comentario"],
        answer: 1,
        explanation: "Una variable es un espacio de memoria donde guardamos datos que pueden cambiar, como puntos, vidas o tiempo."
      },
      {
        question: "¿Cuál es la función principal de un 'Bloque Condicional' (Si... Entonces / If)?",
        options: ["Tomar decisiones según si algo es verdadero o falso", "Pintar la pantalla de colores", "Borrar todo el código", "Hacer sonar música"],
        answer: 0,
        explanation: "Los condicionales evalúan una condición (ej: ¿el gato tocó la meta?) y ejecutan código si se cumple."
      },
      {
        question: "En desarrollo web, ¿cuál de estos lenguajes se encarga de la interactividad y los juegos en el navegador?",
        options: ["HTML", "CSS", "JavaScript", "Markdown"],
        answer: 2,
        explanation: "JavaScript es el lenguaje de programación que da vida y lógica a las páginas web y videojuegos web."
      },
      {
        question: "¿Cómo se llama al proceso de encontrar y corregir errores en un programa?",
        options: ["Compilar", "Debugging (Depuración)", "Renderizar", "Encriptar"],
        answer: 1,
        explanation: "Debugging viene de la historia del primer 'bug' (un insecto en una computadora antigua) y significa depurar errores."
      }
    ];
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper dev-quiz-ui">
        <div class="game-hud">
          <div class="hud-item"><span class="hud-label">PREGUNTA:</span> <span id="dq-progress" class="hud-val">1/${this.questions.length}</span></div>
          <div class="hud-item"><span class="hud-label">TIEMPO:</span> <span id="dq-timer" class="hud-val timer-val">15s</span></div>
          <div class="hud-item"><span class="hud-label">PUNTOS:</span> <span id="dq-score" class="hud-val">0</span></div>
        </div>

        <div class="quiz-box">
          <div id="dq-overlay" class="game-overlay">
            <h2 class="game-title">🧠 DEV TRIVIA CHALLENGE 🧠</h2>
            <p class="game-desc">Pon a prueba tus conocimientos de programación, lógica y videojuegos.</p>
            <button id="dq-start-btn" class="btn btn-arcade-start">COMENZAR TRIVIA</button>
          </div>

          <div id="dq-question-card" class="question-card">
            <h3 id="dq-question-text" class="question-title">Pregunta cargando...</h3>
            <div id="dq-options-list" class="options-grid"></div>
            <div id="dq-feedback" class="feedback-box hidden"></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('dq-start-btn').addEventListener('click', () => this.start());
  }

  start() {
    document.getElementById('dq-overlay').classList.add('hidden');
    this.currentIndex = 0;
    this.score = 0;
    this.showQuestion();
  }

  showQuestion() {
    if (this.currentIndex >= this.questions.length) {
      this.finish();
      return;
    }

    const q = this.questions[this.currentIndex];
    document.getElementById('dq-progress').innerText = `${this.currentIndex + 1}/${this.questions.length}`;
    document.getElementById('dq-score').innerText = this.score;
    document.getElementById('dq-question-text').innerText = q.question;

    const optionsContainer = document.getElementById('dq-options-list');
    optionsContainer.innerHTML = '';

    const feedback = document.getElementById('dq-feedback');
    feedback.className = 'feedback-box hidden';
    feedback.innerHTML = '';

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span class="opt-badge">${String.fromCharCode(65 + idx)}</span> <span class="opt-text">${opt}</span>`;
      btn.addEventListener('click', () => this.handleAnswer(idx, btn));
      optionsContainer.appendChild(btn);
    });

    this.startTimer();
  }

  startTimer() {
    clearInterval(this.timer);
    this.timeLeft = 15;
    const timerEl = document.getElementById('dq-timer');
    timerEl.innerText = `${this.timeLeft}s`;
    timerEl.classList.remove('timer-urgent');

    this.timer = setInterval(() => {
      this.timeLeft--;
      timerEl.innerText = `${this.timeLeft}s`;

      if (this.timeLeft <= 5) {
        timerEl.classList.add('timer-urgent');
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.handleTimeout();
      }
    }, 1000);
  }

  handleAnswer(selectedIdx, btnElement) {
    clearInterval(this.timer);
    const q = this.questions[this.currentIndex];
    const optionButtons = this.container.querySelectorAll('.option-btn');
    optionButtons.forEach(b => b.disabled = true);

    const feedback = document.getElementById('dq-feedback');
    feedback.classList.remove('hidden');

    if (selectedIdx === q.answer) {
      btnElement.classList.add('correct');
      const earned = 100 + (this.timeLeft * 10);
      this.score += earned;
      if (window.sounds) window.sounds.playSuccess();
      feedback.innerHTML = `<span class="fb-correct">¡Correcto! (+${earned} pts)</span><p class="fb-exp">${q.explanation}</p>`;
    } else {
      btnElement.classList.add('incorrect');
      if (optionButtons[q.answer]) optionButtons[q.answer].classList.add('correct');
      if (window.sounds) window.sounds.playError();
      feedback.innerHTML = `<span class="fb-wrong">Incorrecto</span><p class="fb-exp">${q.explanation}</p>`;
    }

    document.getElementById('dq-score').innerText = this.score;

    setTimeout(() => {
      this.currentIndex++;
      this.showQuestion();
    }, 2800);
  }

  handleTimeout() {
    const q = this.questions[this.currentIndex];
    const optionButtons = this.container.querySelectorAll('.option-btn');
    optionButtons.forEach(b => b.disabled = true);
    if (optionButtons[q.answer]) optionButtons[q.answer].classList.add('correct');

    const feedback = document.getElementById('dq-feedback');
    feedback.classList.remove('hidden');
    feedback.innerHTML = `<span class="fb-wrong">⏰ ¡Tiempo agotado!</span><p class="fb-exp">${q.explanation}</p>`;
    if (window.sounds) window.sounds.playError();

    setTimeout(() => {
      this.currentIndex++;
      this.showQuestion();
    }, 2800);
  }

  finish() {
    clearInterval(this.timer);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('devQuiz_highScore', this.highScore.toString());
    }

    const overlay = document.getElementById('dq-overlay');
    overlay.innerHTML = `
      <h2 class="game-title">🏆 ¡DESAFÍO COMPLETADO! 🏆</h2>
      <p class="game-score-final">Puntuación Final: <strong>${this.score}</strong> Puntos</p>
      <p class="game-highscore">Récord del Taller: ${this.highScore} Pts</p>
      <p class="game-desc">${this.score >= 500 ? '¡Excelente nivel de programación! 🌟' : '¡Gran intento! Sigue practicando en el taller.'}</p>
      <button id="dq-retry-btn" class="btn btn-arcade-start">JUGAR OTRA VEZ</button>
    `;
    overlay.classList.remove('hidden');
    document.getElementById('dq-retry-btn').addEventListener('click', () => this.start());
  }

  destroy() {
    clearInterval(this.timer);
  }
}

if (typeof window !== 'undefined') {
  window.DevQuizGame = DevQuizGame;
}
