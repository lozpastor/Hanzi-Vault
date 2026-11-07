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
    utterance.rate = VaultGuide.preferences.audio === 'normal' ? 1 : 0.82;
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
      const route = HANZI_LEVELS.flatMap(level => level.ids);
      const next = route.find(id => !completed[id]);
      root.innerHTML = `<header class="lesson-hero lesson-cover">
        <img class="lesson-cover-art" src="lin.svg" width="360" height="220" alt="">
        <span class="lesson-kicker">Ruta de conversación · 3 niveles</span>
        <h2 tabindex="-1">Mandarín para desenvolverte en China</h2>
        <p>Escucha, repite y responde en voz alta. Puedes seguir la ruta o elegir una situación.</p>
        <label class="lesson-progress">${count} de ${route.length} completadas
          <progress max="${route.length}" value="${count}"></progress></label>
        <div class="lesson-actions">
          ${next ? `<button class="btn btn-primary" data-lesson="${next}">${count ? 'Continuar ruta' : 'Empezar ruta'} →</button>` : ''}
          <button class="btn btn-secondary" data-action="filter" aria-pressed="${review}">${review ? 'Ver toda la ruta' : 'Repasar completadas'}</button>
        </div></header>
        ${HANZI_LEVELS.map(level => {
          const visible = level.ids.filter(id => !review || completed[id]);
          if (!visible.length) return '';
          return `<section class="lesson-level"><h3>${level.title}</h3><p>${level.goal}</p>
            <div class="lesson-library">${visible.map(id => {
              const lesson = HANZI_LESSONS.find(item => item.id === id);
              return `<button class="btn btn-secondary lesson-link" data-lesson="${id}">
                <strong>${lesson.title}</strong><small>${lesson.goal}</small>
                <span class="lesson-meta">${completed[id] ? '✓ Completada · Repasar' : '10 frases · Práctica oral'}</span>
              </button>`;
            }).join('')}</div></section>`;
        }).join('')}
        ${review && !count ? '<p>Aquí aparecerán las lecciones que completes.</p>' : ''}`;
    } else {
      const lesson = selected;
      const level = HANZI_LEVELS.find(item => item.ids.includes(lesson.id));
      const [variation, scenario, answers] = HANZI_PRACTICE[lesson.id];
      const phrase = (index, blind = false) => {
        const [hanzi, pinyin, sound, spanish] = lesson.phrases[index];
        return `<button class="btn btn-secondary" data-audio="${index}">Escuchar frase ${index + 1}</button>
          ${blind ? '<details><summary>Ver respuesta</summary>' : ''}
          <div><strong class="word-pinyin" lang="zh-Latn">${pinyin}</strong> · ${spanish}</div>
          <small>Guía aproximada: ${sound}</small>
          <details ${VaultGuide.preferences.characters && !blind ? 'open' : ''}><summary>Caracteres chinos</summary><span lang="zh-CN">${hanzi}</span></details>
          ${blind ? '</details>' : ''}`;
      };
      root.innerHTML = `<button class="btn btn-secondary" data-action="back">← Biblioteca</button>
        <header class="lesson-hero lesson-detail"><span class="lesson-kicker">${level.title}</span>
          <h2 tabindex="-1">${lesson.title}</h2><p>${lesson.goal}</p>
          <nav class="lesson-actions" aria-label="Pasos de la lección">
            <a href="#lesson-listen">1. Escucha</a><a href="#lesson-understand">2. Entiende</a>
            <a href="#lesson-practice">3. Practica</a><a href="#lesson-save">4. Guarda</a>
          </nav></header>
        <p class="lesson-status" role="status"></p>
        <h3 id="lesson-listen">1. Escucha y repite</h3>
        <p>Usa la guía aproximada para arrancar. Imita los tonos del audio y fíjate en las marcas del pinyin: ā alto, á ascendente, ǎ bajo y  à descendente.</p>
        <ol class="lesson-list">${lesson.phrases.map((_, index) => `<li>${phrase(index)}</li>`).join('')}</ol>
        <h3 id="lesson-understand">2. Entiende el patrón</h3><p>${lesson.pattern}</p>
        <p class="lesson-tip"><strong>Prueba una variante.</strong> ${variation}</p>
        <h3>Mini diálogo</h3><ol class="lesson-list">${lesson.dialogue.map((index, turn) => `<li><strong>${turn % 2 ? 'B' : 'A'}</strong> ${phrase(index)}</li>`).join('')}</ol>
        <h3 id="lesson-practice">3. Practica sin mirar</h3>
        <p>Escucha esta frase y explica qué has entendido. Comprueba la respuesta después.</p>
        ${phrase(lesson.dialogue[0], true)}
        <p>${lesson.practice}</p>
        <p>Repite el diálogo en voz alta cambiando de papel. Luego inténtalo sin mirar.</p>
        <section class="lesson-tip"><h4>Reto de conversación</h4><p>${scenario}</p>
          <details><summary>Comparar con una respuesta posible</summary>
          <ol class="lesson-list">${answers.map(index => `<li>${phrase(index)}</li>`).join('')}</ol></details>
        </section>
        <section class="lesson-hero lesson-detail">
          <h3 id="lesson-save">4. Guarda lo aprendido</h3>
          <p>Selecciona las frases que ya puedes decir sin mirar. Aparecerán como aprendidas en Frases y estructuras.</p>
          <fieldset class="lesson-checklist"><legend>Frases que puedo usar</legend>
            ${lesson.phrases.map(([, pinyin, , spanish], index) => `<label><input type="checkbox" value="${index}"><span>${spanish}<small>${pinyin}</small></span></label>`).join('')}
          </fieldset>
          <div class="lesson-actions">
            <button class="btn btn-primary" data-action="save">Guardar seleccionadas</button>
            <button class="btn btn-secondary" data-action="complete" aria-pressed="${Boolean(completed[lesson.id])}">${completed[lesson.id] ? '✓ Completada · Desmarcar' : 'Marcar como completada'}</button>
            <button class="btn btn-ghost" data-action="learned">Ver frases aprendidas →</button>
          </div><p class="lesson-save-status" role="status"></p>
        </section>`;
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
    if (button.dataset.action === 'save') {
      const status = root.querySelector('.lesson-save-status');
      const phrases = Array.from(root.querySelectorAll('.lesson-checklist input:checked'),
        input => selected.phrases[Number(input.value)]);
      if (!phrases.length) {
        status.textContent = 'Selecciona al menos una frase.';
        return;
      }
      try {
        const count = saveLearnedLessonPhrases(phrases);
        status.textContent = count ? `Frases marcadas como aprendidas: ${count}.` : 'Las frases seleccionadas ya estaban aprendidas.';
      } catch {
        status.textContent = 'No se pudieron guardar las frases. Inténtalo de nuevo.';
      }
    }
    if (button.dataset.action === 'learned') {
      clearPhraseFilters();
      document.getElementById('phrase-status').value = 'learned';
      showPage('grammar');
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
        root.querySelector('.lesson-save-status').textContent = next[selected.id] ? 'Progreso guardado.' : 'Lección desmarcada.';
      } catch {
        root.querySelector('.lesson-save-status').textContent = 'El navegador no ha podido guardar el progreso.';
      }
    }
  });
  function openLesson(id) {
    selected = HANZI_LESSONS.find(lesson => lesson.id === id) || null;
    showPage('lessons');
    root.querySelector('h2')?.focus();
  }
  return { render, openLesson, isComplete: id => Boolean(completed[id]) };
})();
