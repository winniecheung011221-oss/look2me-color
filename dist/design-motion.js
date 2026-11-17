const hero = document.querySelector('.case-intro');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (hero && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
  let frame = 0;
  let x = 50;
  let y = 50;
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width) * 100;
    y = ((event.clientY - rect.top) / rect.height) * 100;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      hero.style.setProperty('--mx', `${x}%`);
      hero.style.setProperty('--my', `${y}%`);
      frame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    hero.style.setProperty('--mx', '50%');
    hero.style.setProperty('--my', '50%');
  });
}
