const LinPet = (() => {
  const pet = document.querySelector('.guide-launch');
  const dialog = document.getElementById('guide-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let position;
  let pointer;
  let target;
  let tour = false;
  let suppressClick = false;
  let lastTouch = Date.now();
  let flight;

  function state(value) {
    clearTimeout(flight);
    pet.dataset.state = value;
    dialog.dataset.linState = value;
  }

  function move(left, top, animate = false) {
    const box = pet.getBoundingClientRect();
    const bottom = innerWidth <= 900 ? 72 : 12;
    const next = {
      left: Math.max(8, Math.min(innerWidth - box.width - 8, left)),
      top: Math.max(8, Math.min(innerHeight - box.height - bottom, top)),
    };
    pet.dataset.direction = next.left < box.left ? 'left' : 'right';
    if (animate && !motion.matches) {
      state('flying');
      flight = setTimeout(() => state(tour ? 'speaking' : 'idle'), 680);
    }
    position = next;
    pet.style.left = next.left + 'px';
    pet.style.top = next.top + 'px';
    pet.style.right = pet.style.bottom = 'auto';
  }

  function findTarget(page) {
    const mobile = document.querySelector(`.mobile-dock [data-page="${page}"]`);
    if (mobile?.getClientRects().length) return mobile;
    return [...document.querySelectorAll('.sidebar .nav-item')]
      .find(button => button.getAttribute('onclick') === `showPage('${page}')`);
  }

  function placeTour(page, animate = false) {
    tour = true;
    target?.removeAttribute('data-lin-target');
    target = findTarget(page);
    if (!target) return;
    target.setAttribute('data-lin-target', '');
    const anchor = target.getBoundingClientRect();
    const mobile = innerWidth <= 900;
    const bounds = dialog.getBoundingClientRect();
    const left = mobile ? (innerWidth - bounds.width) / 2 : anchor.right + 24;
    const top = Math.max(8, Math.min(innerHeight - bounds.height - (mobile ? 135 : 16),
      mobile ? anchor.top - bounds.height - 64 : anchor.top - 18));
    dialog.style.left = left + 'px';
    dialog.style.top = top + 'px';
    move(mobile ? anchor.left + (anchor.width - pet.offsetWidth) / 2 : anchor.right - 6,
      mobile ? anchor.top - pet.offsetHeight - 4 : anchor.top, animate);
  }

  function endTour() {
    tour = false;
    target?.removeAttribute('data-lin-target');
    target = null;
    dialog.style.removeProperty('left');
    dialog.style.removeProperty('top');
    for (const key of ['left', 'top', 'right', 'bottom']) pet.style.removeProperty(key);
    position = null;
    state('idle');
  }

  pet.addEventListener('pointerdown', event => {
    if (event.button !== 0 || tour) return;
    const box = pet.getBoundingClientRect();
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, left: box.left, top: box.top, moved: false };
    lastTouch = Date.now();
  });
  pet.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const horizontal = event.clientX - pointer.x;
    const vertical = event.clientY - pointer.y;
    if (!pointer.moved && Math.hypot(horizontal, vertical) < 7) return;
    if (!pointer.moved) pet.setPointerCapture(event.pointerId);
    pointer.moved = true;
    state('dragging');
    move(pointer.left + horizontal, pointer.top + vertical);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) {
    pet.addEventListener(name, () => {
      if (!pointer || (name === 'pointerleave' && pointer.moved)) return;
      suppressClick = pointer.moved;
      pointer = null;
      state('idle');
      if (suppressClick) setTimeout(() => { suppressClick = false; }, 350);
    });
  }
  pet.addEventListener('click', event => {
    if (suppressClick && event.detail) return;
    lastTouch = Date.now();
    VaultGuide.open();
  });
  window.addEventListener('resize', () => {
    if (tour) return;
    if (position) move(position.left, position.top);
  });
  setInterval(() => {
    if (dialog.open || pointer || document.hidden || !pet.getClientRects().length || motion.matches) return;
    const elapsed = Date.now() - lastTouch;
    if (elapsed < 35000) return;
    if (elapsed > 100000) {
      state('sleeping');
      return;
    }
    const box = pet.getBoundingClientRect();
    const left = box.left > innerWidth / 2 ? box.left - 95 : box.left + 95;
    move(left, box.top - (box.top > innerHeight / 2 ? 26 : -26), true);
  }, 35000);
  return { placeTour, endTour, state };
})();
