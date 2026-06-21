(function () {
  const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.work-card');
  const grid = document.getElementById('work-grid');
  if (!btns.length) return;

  const counts = { all: cards.length };
  cards.forEach(card => {
    const t = card.dataset.type;
    counts[t] = (counts[t] || 0) + 1;
  });

  btns.forEach(btn => {
    const f = btn.dataset.filter;
    const n = counts[f] || 0;
    if (n > 0) btn.innerHTML = btn.textContent + '<sup>' + n + '</sup>';
  });

  const dividers = document.querySelectorAll('.work-section-divider');

  function updateDividers() {
    dividers.forEach(div => {
      const section = div.dataset.section;
      const anyVisible = [...cards].some(
        c => c.dataset.section === section && !c.classList.contains('hidden')
      );
      div.classList.toggle('hidden', !anyVisible);
    });
  }

  function updateEmpty() {
    const visible = [...cards].filter(c => !c.classList.contains('hidden')).length;
    grid.classList.toggle('has-empty', visible === 0);
  }

  updateDividers();
  updateEmpty();

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      grid.classList.add('fading');
      setTimeout(() => {
        cards.forEach(card => {
          card.classList.toggle('hidden', filter !== 'all' && card.dataset.type !== filter);
        });
        updateDividers();
        grid.classList.remove('fading');
        updateEmpty();
      }, 150);
    });
  });
})();
