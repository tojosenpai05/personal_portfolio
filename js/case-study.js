/* Metric bar animation via IntersectionObserver */
(function () {
  const fills = document.querySelectorAll('.cs-mbar-fill[data-bar-width]');
  if (!fills.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.width = el.dataset.barWidth + '%';
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  fills.forEach(el => io.observe(el));
})();

/* Case study hero video cycling (AiBin) */
(function () {
  const vid = document.getElementById('cs-hero-video');
  if (!vid) return;
  const srcs = JSON.parse(vid.dataset.srcs || '[]');
  if (!srcs.length) return;
  let idx = 0;
  vid.src = srcs[0];
  vid.play().catch(() => {});
  vid.addEventListener('ended', () => {
    idx = (idx + 1) % srcs.length;
    vid.src = srcs[idx];
    vid.play().catch(() => {});
  });
})();

/* Lightbox */
(function () {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  if (!lb || !lbImg) return;

  document.querySelectorAll('[data-lightbox]').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      lbImg.src = img.src;
      lb.classList.add('open');
    });
  });

  document.getElementById('lightbox-close').addEventListener('click', () => lb.classList.remove('open'));
  lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('open'); });
})();
