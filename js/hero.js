/* 24-video hero carousel with crossfade */
(function () {
  const heroA = document.getElementById('hero-vid-a');
  const heroB = document.getElementById('hero-vid-b');
  if (!heroA || !heroB) return;

  const TOTAL = 24;
  const MAX_DURATION = 15000;
  let current = 1;
  let active = heroA;
  let inactive = heroB;
  let timer = null;

  function padded(n) { return n.toString().padStart(2, '0'); }

  const vidBase = (window.STORAGE_VIDEOS || '').replace(/\/$/, '');
  function videoSrc(n) {
    return vidBase ? `${vidBase}/hero/hero-${padded(n)}.mp4` : `hero/hero-${padded(n)}.mp4`;
  }

  function loadNext() {
    current = current === TOTAL ? 1 : current + 1;
    inactive.src = videoSrc(current);
    inactive.load();
    inactive.play().catch(() => {});
    inactive.style.opacity = '1';
    active.style.opacity = '0';
    const tmp = active; active = inactive; inactive = tmp;
    scheduleNext();
  }

  function scheduleNext() {
    clearTimeout(timer);
    timer = setTimeout(loadNext, MAX_DURATION);
  }

  heroA.src = videoSrc(1);
  heroA.load();
  heroA.play().catch(() => {});
  heroA.style.opacity = '1';
  heroB.style.opacity = '0';

  heroA.addEventListener('ended', loadNext, { once: false });
  scheduleNext();
})();
