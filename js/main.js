/**
 * =============================================================
 * MAIN.JS - Pagina Home (index.html)
 * Colegio Paulo Freire - Taller de Programacion
 * =============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const data = window.SCHOOL_DATA;
  if (!data) return;

  const totalGames    = data.grades.reduce((a, g) => a + (g.games    ? g.games.length    : 0), 0);
  const totalProjects = data.grades.reduce((a, g) => a + (g.projects ? g.projects.length : 0), 0);
  const gradeCount    = data.grades.length;

  // Stats Row
  const statsRow = document.getElementById('stats-row');
  if (statsRow) {
    statsRow.innerHTML =
      '<div class="stat-chip"><span class="num">' + gradeCount + '</span><span class="lbl">Aulas</span></div>' +
      '<div class="stat-chip"><span class="num">' + totalGames + '</span><span class="lbl">Juegos</span></div>' +
      '<div class="stat-chip"><span class="num">' + totalProjects + '</span><span class="lbl">Proyectos</span></div>';
  }

  const countEl = document.getElementById('grades-count');
  if (countEl) countEl.textContent = gradeCount + ' aulas';

  // Menu horizontal de acceso rapido
  const storiesRow = document.getElementById('stories-row');
  if (storiesRow) {
    storiesRow.innerHTML = data.grades.map(g =>
      '<a href="aula.html?grado=' + g.id + '" class="story-item">' +
        '<div class="story-avatar" style="background:' + g.colorLight + ';color:' + g.color + ';">' + g.icon + '</div>' +
        '<span class="story-label">' + g.name + '</span>' +
      '</a>'
    ).join(
      '<span style="color:var(--border);font-size:.8rem;padding:0 2px;">|</span>'
    );
  }

  // Tarjetas de Aula
  const grid = document.getElementById('classrooms-grid');
  if (!grid) return;
  grid.innerHTML = '';

  data.grades.forEach(grade => {
    const gamesCount = grade.games    ? grade.games.length    : 0;
    const projsCount = grade.projects ? grade.projects.length : 0;

    const card = document.createElement('a');
    card.className = 'classroom-card';
    card.href = 'aula.html?grado=' + grade.id;

    card.innerHTML =
      '<div class="cc-cover" style="background:linear-gradient(150deg,' + grade.color + ' 0%,' + (grade.colorBorder || grade.color) + ' 100%);">' +
        '<span class="cc-icon">' + grade.icon + '</span>' +
        '<div class="cc-cover-info">' +
          '<div class="cc-name">' + grade.name + '</div>' +
          '<div class="cc-badges">' +
            '<span class="cc-badge">&#127918; ' + gamesCount + '</span>' +
            '<span class="cc-badge">&#128193; ' + projsCount + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="cc-enter-icon"><i class="fas fa-arrow-right"></i></div>' +
      '</div>' +
      '<div class="cc-desc-strip">' + grade.description.substring(0, 72) + '...</div>';

    grid.appendChild(card);
  });
});
