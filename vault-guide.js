const VaultGuide = (() => {
  const dialog = document.getElementById('guide-dialog');
  const content = document.getElementById('guide-content');
  const form = document.getElementById('study-preferences');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const defaults = { theme: 'system', level: 'auto', audio: 'slow', characters: false, seen: false };
  const tour = [
    ['lessons', 'Hola, soy Lin', 'Por aquí se entra a Lecciones. Escucha una frase, repítela y pruébala en una conversación corta.'],
    ['grammar', 'Guarda lo que ya puedes decir', 'Al terminar una lección, elige las frases que dirías sin mirar. Las encontrarás aquí, en Frases.'],
    ['review', 'Vuelve a practicar', 'En Repaso puedes recuperar las frases de memoria. Pídeme ayuda cuando quieras decidir qué estudiar hoy.'],
  ];
  let owner = 'device';
  let preferences = { ...defaults };
  let step = null;
  let pending;
  let conversation = [];
  let guided;

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
      const [, heading, description] = tour[step];
      content.innerHTML = `<p class="lesson-kicker">Primer acceso · ${step + 1} de ${tour.length}</p>
        <h2 id="guide-heading" tabindex="-1">${heading}</h2><p>${description}</p>
        <div class="notebook-actions"><button class="btn btn-primary" data-guide="next">${step === tour.length - 1 ? 'Ver mi recomendación' : 'Siguiente'}</button>
        <button class="btn btn-ghost" data-guide="skip">${step ? 'Saltar tutorial' : 'Ahora no'}</button></div>`;
    } else {
      const { level, lesson, due } = recommendation();
      const action = due ? 'review' : lesson ? lesson.id : 'lessons';
      const next = due ? `Tienes ${due} ${due === 1 ? 'ficha pendiente' : 'fichas pendientes'} de repaso.`
        : lesson ? `Prueba «${lesson.title}». ${lesson.goal}` : 'Has completado este nivel. Vuelve a una situación y prueba el reto oral sin mirar.';
      content.innerHTML = `<h2 id="guide-heading" tabindex="-1">Un rato con Lin</h2>
        <p class="lin-question">¿Cómo te apetece aprender hoy?</p>
        ${VaultSync.guideAvailable ? `<div class="notebook-actions">
          <button class="btn btn-secondary" data-prompt="Tengo cinco minutos. Ayúdame a elegir una práctica.">Tengo cinco minutos</button>
          <button class="btn btn-secondary" data-prompt="Quiero practicar un diálogo. Empieza con una intervención corta en mandarín.">Hagamos un diálogo</button>
        </div>` : `<div class="notebook-actions"><button class="btn btn-secondary" data-guided="start">Ensayar un diálogo guiado</button></div>
        <div class="lin-practice" aria-live="polite"></div>`}
        <p class="lesson-kicker">Siguiente paso · Nivel ${level}</p><p>${next}</p>
        <div class="notebook-actions"><button class="btn btn-primary" data-destination="${action}">${due ? 'Ir al repaso' : lesson ? 'Abrir lección' : 'Ver lecciones'}</button>
        ${due && lesson ? `<button class="btn btn-secondary" data-destination="${lesson.id}">Prefiero una lección</button>` : ''}</div>
        ${VaultSync.guideAvailable ? `<div class="guide-answer" role="log" aria-label="Conversación con Lin"></div><form class="guide-ai">
          <label for="guide-question">Práctica con IA</label>
          <textarea id="guide-question" class="form-input" rows="3" maxlength="480" required placeholder="Pídeme un diálogo o escribe una frase para corregirla."></textarea>
          <p>Al enviar o elegir una propuesta, compartes con OpenAI el mensaje, hasta dos intercambios previos, tu nivel y el tema. Evita datos personales.</p>
          <button class="btn btn-secondary" type="submit">Enviar a Lin</button>
        </form>` : ''}`;
    }
  }

  function open(tutorial = false) {
    if (!VaultSync.canEdit || document.body.classList.contains('auth-locked') || dialog.open) return;
    step = tutorial ? 0 : null;
    conversation = [];
    guided = null;
    dialog.classList.toggle('lin-tour', tutorial);
    render();
    if (tutorial) {
      dialog.show();
      LinPet.placeTour(tour[0][0], true);
    } else {
      dialog.showModal();
      LinPet.state('speaking');
    }
    content.querySelector('h2').focus();
  }

  function close() {
    pending?.abort();
    if (dialog.open) dialog.close();
  }

  function welcome() {
    if (!preferences.seen) open(true);
  }

  function renderGuided(action) {
    if (action === 'start') {
      const { level, lesson } = recommendation();
      const fallback = HANZI_LEVELS[level - 1].ids[0];
      guided = { lesson: lesson || HANZI_LESSONS.find(item => item.id === fallback), turn: 0 };
    }
    if (!guided) return;
    if (action === 'next') guided.turn += 2;
    const host = content.querySelector('.lin-practice');
    const { lesson, turn } = guided;
    const opening = lesson.phrases[lesson.dialogue[turn]];
    const response = lesson.phrases[lesson.dialogue[turn + 1]];
    if (!opening || !response) {
      host.innerHTML = `<p>Bien. Ahora repite el diálogo cambiando de papel.</p>
        <button class="btn btn-secondary" data-destination="${lesson.id}">Abrir la lección</button>`;
      LinPet.state('happy');
      return;
    }
    host.innerHTML = `<p class="lesson-kicker">${lesson.title} · Turno ${turn / 2 + 1}</p>
      <p><strong>Lin</strong> · <span lang="zh-Latn">${opening[1]}</span></p>
      <p>Responde en voz alta y después compara.</p>
      <details><summary>Ver una respuesta</summary><p lang="zh-Latn">${response[1]}</p><p>${response[3]}</p>
      <button class="btn btn-secondary" data-guided="next">Seguir</button></details>`;
    LinPet.state('speaking');
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
        close();
        return;
      }
      render();
      LinPet.placeTour(tour[step][0], true);
      content.querySelector('h2').focus();
    }
    if (button.dataset.prompt) ask(button.dataset.prompt);
    if (button.dataset.guided) renderGuided(button.dataset.guided);
    const destination = button.dataset.destination;
    if (!destination) return;
    close();
    if (destination === 'review') {
      showPage('review');
      Review.start(true);
    } else HanziLessons.openLesson(destination);
  });

  content.addEventListener('submit', event => {
    event.preventDefault();
    const input = content.querySelector('textarea');
    if (!pending && input.value.trim()) {
      ask(input.value.trim());
      input.value = '';
    }
  });

  async function ask(question) {
    if (pending || !VaultSync.guideAvailable) return;
    const output = content.querySelector('.guide-answer');
    const buttons = [...content.querySelectorAll('[data-prompt], .guide-ai button')];
    const { level, lesson } = recommendation();
    const request = new AbortController();
    pending = request;
    for (const button of buttons) button.disabled = true;
    const questionLine = document.createElement('p');
    questionLine.textContent = 'Tú · ' + question;
    const answerLine = document.createElement('p');
    answerLine.textContent = 'Lin está pensando…';
    output.append(questionLine, answerLine);
    output.scrollTop = output.scrollHeight;
    LinPet.state('thinking');
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]);
      const answer = await VaultSync.askGuide({ question, level, topic: lesson?.title || '', history: conversation }, signal);
      if (!request.signal.aborted) {
        answerLine.textContent = 'Lin · ' + answer;
        conversation = [...conversation, { question, answer: answer.slice(0, 900) }].slice(-2);
        LinPet.state('speaking');
      }
    } catch (error) {
      if (!request.signal.aborted) {
        answerLine.textContent = error.message;
        LinPet.state('idle');
      }
    } finally {
      if (pending === request) pending = null;
      for (const button of buttons) button.disabled = false;
      if (!request.signal.aborted) output.scrollTop = output.scrollHeight;
    }
  }

  dialog.addEventListener('close', () => {
    const finished = dialog.classList.contains('lin-tour') && step === null;
    pending?.abort();
    pending = null;
    if (step !== null) save({ seen: true });
    step = null;
    dialog.classList.remove('lin-tour');
    if (finished || dialog.style.left) LinPet.endTour();
    else LinPet.state('idle');
    content.replaceChildren();
    if (finished && VaultSync.canEdit) open();
  });
  window.addEventListener('resize', () => {
    if (dialog.open && step !== null) LinPet.placeTour(tour[step][0]);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && dialog.open && step !== null) close();
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
