const VaultGuide = (() => {
  const dialog = document.getElementById('guide-dialog');
  const content = document.getElementById('guide-content');
  const form = document.getElementById('study-preferences');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const defaults = { theme: 'system', level: 'auto', audio: 'slow', characters: false, seen: false };
  const tour = [
    ['Hola, soy Lin', 'Vamos a practicar mandarín para usarlo fuera de la pantalla. En Lecciones puedes escuchar una frase, repetirla y probarla en una conversación corta.'],
    ['Guarda lo que ya puedes decir', 'Al terminar, elige las frases que dirías sin mirar. Las encontrarás en tu biblioteca y podrás volver a practicarlas desde Repaso.'],
    ['Encuentra tu siguiente paso', 'Vuelve a abrir a Lin cuando tengas unos minutos. Te sugeriré una lección o un repaso según tu progreso y el nivel que elijas en Perfil.'],
  ];
  let owner = 'device';
  let preferences = { ...defaults };
  let step = null;
  let pending;

  function applyTheme() {
    const dark = preferences.theme === 'dark' || (preferences.theme === 'system' && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : '';
    document.getElementById('theme-icon').textContent = dark ? '☀' : '◑';
    document.getElementById('theme-label').textContent = dark ? 'Tema claro' : 'Tema oscuro';
  }

  function activate(id) {
    owner = id || 'device';
    preferences = { ...defaults };
    try {
      const saved = JSON.parse(localStorage.getItem('hanzivault_preferences:' + owner));
      if (saved && typeof saved === 'object') preferences = { ...defaults, ...saved };
    } catch {}
    applyTheme();
    renderProfile();
  }

  function save(values) {
    preferences = { ...preferences, ...values };
    applyTheme();
    try {
      localStorage.setItem('hanzivault_preferences:' + owner, JSON.stringify(preferences));
      return true;
    } catch {
      return false;
    }
  }

  function renderProfile() {
    document.getElementById('study-theme').value = preferences.theme;
    document.getElementById('study-level').value = preferences.level;
    document.getElementById('study-audio').value = preferences.audio;
    document.getElementById('study-characters').checked = preferences.characters;
    document.getElementById('study-settings-status').textContent = '';
  }

  function toggleTheme() {
    save({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' });
    renderProfile();
  }

  function recommendation() {
    const firstIncomplete = HANZI_LEVELS.findIndex(level => level.ids.some(id => !HanziLessons.isComplete(id)));
    const level = preferences.level === 'auto' ? (firstIncomplete < 0 ? HANZI_LEVELS.length : firstIncomplete + 1)
      : Number(preferences.level);
    const current = HANZI_LEVELS[level - 1] || HANZI_LEVELS[0];
    const lesson = HANZI_LESSONS.find(item => item.id === current.ids.find(id => !HanziLessons.isComplete(id)));
    const due = [...DB.words, ...DB.grammar].filter(Review.isDue).length;
    return { level: HANZI_LEVELS.indexOf(current) + 1, lesson, due };
  }

  function render() {
    if (step !== null) {
      const [heading, description] = tour[step];
      content.innerHTML = `<img class="guide-art" src="lin.svg" width="360" height="220" alt="">
        <p class="lesson-kicker">Primer acceso · ${step + 1} de ${tour.length}</p>
        <h2 id="guide-heading" tabindex="-1">${heading}</h2><p>${description}</p>
        <div class="notebook-actions"><button class="btn btn-primary" data-guide="next">${step === tour.length - 1 ? 'Ver mi recomendación' : 'Siguiente'}</button>
        <button class="btn btn-ghost" data-guide="skip">${step ? 'Saltar tutorial' : 'Ahora no'}</button></div>`;
    } else {
      const { level, lesson, due } = recommendation();
      const action = due ? 'review' : lesson ? lesson.id : 'lessons';
      const next = due ? `Tienes ${due} ${due === 1 ? 'ficha pendiente' : 'fichas pendientes'} de repaso.`
        : lesson ? `Prueba «${lesson.title}». ${lesson.goal}` : 'Has completado este nivel. Vuelve a una situación y prueba el reto oral sin mirar.';
      content.innerHTML = `<img class="guide-art" src="lin.svg" width="360" height="220" alt="">
        <h2 id="guide-heading" tabindex="-1">Un rato con Lin</h2>
        <p class="lesson-kicker">Siguiente paso · Nivel ${level}</p><p>${next}</p>
        <div class="notebook-actions"><button class="btn btn-primary" data-destination="${action}">${due ? 'Ir al repaso' : lesson ? 'Abrir lección' : 'Ver lecciones'}</button>
        ${due && lesson ? `<button class="btn btn-secondary" data-destination="${lesson.id}">Prefiero una lección</button>` : ''}</div>
        ${VaultSync.guideAvailable ? `<form class="guide-ai">
          <label for="guide-question">Práctica con IA</label>
          <textarea id="guide-question" class="form-input" rows="3" maxlength="480" required placeholder="Pídeme un diálogo o escribe una frase para corregirla."></textarea>
          <p>Al enviar, compartes con OpenAI el texto, tu nivel y el tema sugerido. Evita datos personales.</p>
          <button class="btn btn-secondary" type="submit">Enviar a Lin</button>
          <div class="guide-answer" role="status"></div>
        </form>` : ''}`;
    }
  }

  function open(tutorial = false) {
    if (!VaultSync.canEdit || document.body.classList.contains('auth-locked') || dialog.open) return;
    step = tutorial ? 0 : null;
    render();
    dialog.showModal();
    content.querySelector('h2').focus();
  }

  function close() {
    pending?.abort();
    if (dialog.open) dialog.close();
  }

  function welcome() {
    if (!preferences.seen) open(true);
  }

  content.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.guide === 'skip') close();
    if (button.dataset.guide === 'next') {
      step++;
      if (step >= tour.length) {
        step = null;
        save({ seen: true });
      }
      render();
      content.querySelector('h2').focus();
    }
    const destination = button.dataset.destination;
    if (!destination) return;
    close();
    if (destination === 'review') {
      showPage('review');
      Review.start(true);
    } else HanziLessons.openLesson(destination);
  });

  content.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending || !VaultSync.guideAvailable) return;
    const question = content.querySelector('textarea').value.trim();
    if (!question) return;
    const output = content.querySelector('.guide-answer');
    const button = event.target.querySelector('button');
    const { level, lesson } = recommendation();
    const request = new AbortController();
    pending = request;
    button.disabled = true;
    output.textContent = 'Lin está preparando tu práctica…';
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]);
      const answer = await VaultSync.askGuide({ question, level, topic: lesson?.title || '' }, signal);
      if (!request.signal.aborted) output.textContent = answer;
    } catch (error) {
      if (!request.signal.aborted) output.textContent = error.message;
    } finally {
      if (pending === request) pending = null;
      button.disabled = false;
    }
  });

  dialog.addEventListener('close', () => {
    pending?.abort();
    pending = null;
    if (step !== null) save({ seen: true });
    step = null;
    content.replaceChildren();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const stored = save({
      theme: document.getElementById('study-theme').value,
      level: document.getElementById('study-level').value,
      audio: document.getElementById('study-audio').value,
      characters: document.getElementById('study-characters').checked,
    });
    document.getElementById('study-settings-status').textContent = stored
      ? 'Preferencias guardadas en este navegador.' : 'Preferencias aplicadas hasta que cierres la página.';
  });
  systemTheme.addEventListener('change', applyTheme);
  activate();
  return { activate, open, close, welcome, renderProfile, toggleTheme, get preferences() { return preferences; } };
})();
