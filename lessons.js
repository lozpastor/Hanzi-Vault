const HanziLessons = (() => {
  const root = document.getElementById('page-lessons');
  const key = 'hanzi-vault-lessons-v1';
  let completed = {};
  let selected = null;
  let review = false;
  try {
    completed = JSON.parse(localStorage.getItem(key)) || {};
  } catch {}

  function say(text, status) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      status.textContent = 'El audio no está disponible en este navegador.';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.82;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(item => /^zh[-_]CN$/i.test(item.lang));
    if (voices.length && !voice) {
      status.textContent = 'Activa una voz de mandarín (China) en tu dispositivo.';
      return;
    }
    if (voice) utterance.voice = voice;
    utterance.onerror = event => {
      if (!['interrupted', 'canceled'].includes(event.error)) {
        status.textContent = 'No se pudo reproducir el audio. Comprueba las voces del dispositivo.';
      }
    };
    status.textContent = '';
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function render(moveFocus = false) {
    if (!selected) {
      const count = HANZI_LESSONS.filter(lesson => completed[lesson.id]).length;
      root.innerHTML = `<h2 tabindex="-1">Mandarín para desenvolverte en China</h2>
        <p>Escucha, repite y responde en voz alta. Cada lección se puede practicar por separado.</p>
        <p>${count} de ${HANZI_LESSONS.length} completadas</p>
        <button class="btn btn-secondary" data-action="filter" aria-pressed="${review}">Solo completadas</button>
        <div class="lesson-library">${HANZI_LESSONS.map((lesson, index) =>
          review && !completed[lesson.id] ? '' : `<button class="btn btn-secondary lesson-link" data-lesson="${lesson.id}">
            <span>${index + 1}. ${lesson.title}</span><small>${completed[lesson.id] ? 'Completada · Repasar' : lesson.goal}</small>
          </button>`).join('')}</div>
        ${review && !count ? '<p>Aquí aparecerán las lecciones que completes.</p>' : ''}`;
    } else {
      const lesson = selected;
      const phrase = (index, blind = false) => {
        const [hanzi, pinyin, sound, spanish] = lesson.phrases[index];
        return `<button class="btn btn-secondary" data-audio="${index}">Escuchar frase ${index + 1}</button>
          ${blind ? '<details><summary>Ver respuesta</summary>' : ''}
          <div><strong class="word-pinyin" lang="zh-Latn">${pinyin}</strong> · ${spanish}</div>
          <small>Guía aproximada: ${sound}</small>
          <details><summary>Ver caracteres</summary><span lang="zh-CN">${hanzi}</span></details>
          ${blind ? '</details>' : ''}`;
      };
      root.innerHTML = `<button class="btn btn-secondary" data-action="back">← Biblioteca</button>
        <h2 tabindex="-1">${lesson.title}</h2><p>${lesson.goal}</p>
        <p class="lesson-status" role="status"></p>
        <h3>Frases útiles</h3>
        <p>Usa la guía aproximada para arrancar. Imita los tonos del audio y fíjate en las marcas del pinyin: ā alto, á ascendente, ǎ bajo y  à descendente.</p>
        <ol class="lesson-list">${lesson.phrases.map((_, index) => `<li>${phrase(index)}</li>`).join('')}</ol>
        <h3>Una estructura para reutilizar</h3><p>${lesson.pattern}</p>
        <h3>Mini diálogo</h3><ol class="lesson-list">${lesson.dialogue.map((index, turn) => `<li><strong>${turn % 2 ? 'B' : 'A'}</strong> ${phrase(index)}</li>`).join('')}</ol>
        <h3>Práctica oral</h3>
        <p>Escucha esta frase y explica qué has entendido. Comprueba la respuesta después.</p>
        ${phrase(lesson.dialogue[0], true)}
        <p>${lesson.practice}</p>
        <p>Repite el diálogo en voz alta cambiando de papel. Luego inténtalo sin mirar.</p>
        <button class="btn btn-primary" data-action="complete" aria-pressed="${Boolean(completed[lesson.id])}">${completed[lesson.id] ? '✓ Completada · Desmarcar' : 'Marcar como completada'}</button>`;
    }
    if (moveFocus) root.querySelector('h2').focus();
  }

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.lesson) {
      selected = HANZI_LESSONS.find(lesson => lesson.id === button.dataset.lesson);
      render(true);
    }
    if (button.dataset.audio !== undefined) {
      say(selected.phrases[Number(button.dataset.audio)][0], root.querySelector('.lesson-status'));
    }
    if (button.dataset.action === 'back') {
      window.speechSynthesis?.cancel();
      selected = null;
      render(true);
    }
    if (button.dataset.action === 'filter') {
      review = !review;
      render();
      root.querySelector('[data-action="filter"]').focus();
    }
    if (button.dataset.action === 'complete') {
      const next = { ...completed };
      if (next[selected.id]) delete next[selected.id];
      else next[selected.id] = true;
      try {
        localStorage.setItem(key, JSON.stringify(next));
        completed = next;
        button.setAttribute('aria-pressed', String(Boolean(next[selected.id])));
        button.textContent = next[selected.id] ? '✓ Completada · Desmarcar' : 'Marcar como completada';
        root.querySelector('.lesson-status').textContent = next[selected.id] ? 'Progreso guardado.' : 'Lección desmarcada.';
      } catch {
        root.querySelector('.lesson-status').textContent = 'El navegador no ha podido guardar el progreso.';
      }
    }
  });
  return { render };
})();
