/* ════════════════════════════════
   PRELOADER
════════════════════════════════ */
(function () {
  const el = document.getElementById('preloader');
  if (!el) return;

  const text = document.body.dataset.preloader || '.anan';
  const chars = Array.from(text);
  const lettersEl = document.getElementById('preloader-letters');

  const nonSpaceChars = chars.filter(c => c !== ' ').length;
  const fontSize =
    nonSpaceChars <= 6  ? 'clamp(6rem,15vw,17rem)' :
    nonSpaceChars <= 13 ? 'clamp(4rem,8vw,11rem)'  :
                          'clamp(2.6rem,5.5vw,8rem)';

  chars.forEach((c, i) => {
    if (c === ' ') {
      const sp = document.createElement('span');
      sp.className = 'preloader-space';
      sp.style.cssText = `display:inline-block;width:0.28em;font-size:${fontSize}`;
      lettersEl.appendChild(sp);
    } else {
      const wrap = document.createElement('span');
      wrap.className = 'preloader-letter-wrap';
      const span = document.createElement('span');
      span.className = 'preloader-letter' + (c === '.' && i === 0 ? ' orange' : '');
      span.textContent = c;
      span.style.cssText = `font-size:${fontSize};animation-delay:${0.15 + i * 0.055}s`;
      wrap.appendChild(span);
      lettersEl.appendChild(wrap);
    }
  });

  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    el.classList.add('exit');
    el.addEventListener('transitionend', () => {
      el.classList.add('gone');
      document.body.style.overflow = '';
    }, { once: true });
  }, 2500);
})();

/* ════════════════════════════════
   NAVBAR
════════════════════════════════ */
(function () {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && hamburger.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
})();

/* ════════════════════════════════
   SCROLL REVEAL (IntersectionObserver)
════════════════════════════════ */
(function () {
  const revealClasses = ['.reveal', '.reveal-left', '.reveal-scale'];
  const els = document.querySelectorAll(revealClasses.join(','));
  if (!els.length) return;

  const staggered = document.querySelectorAll('[data-stagger]');

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = el.dataset.delay || 0;
        setTimeout(() => el.classList.add('visible'), delay * 1000);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  els.forEach(el => io.observe(el));
})();

/* ════════════════════════════════
   BOOKING MODAL  (dark, matches original)
════════════════════════════════ */
(function () {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  const WORK_TYPES = [
    { id: 'iot',      label: 'IoT & Edge AI',         desc: 'Embedded systems, on-device ML, hardware' },
    { id: 'web',      label: 'Full-Stack Web',         desc: 'Web apps, REST APIs, deployments' },
    { id: 'hardware', label: 'Electronic Product',     desc: 'PCB design, CAD, physical hardware' },
    { id: 'ai',       label: 'AI-Augmented Delivery',  desc: 'Multi-agent pipelines and AI tooling' },
    { id: 'other',    label: 'Something else',         desc: "Let's talk about it" },
  ];
  const TIMES = ['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM'];
  const BUDGETS = ['Under RM 1k','RM 1k – 5k','RM 5k – 15k','RM 15k+'];
  const STEP_LABELS = ['Interest','Date','Time','Details'];

  let step = 1, workType = null, selectedDate = null, selectedTime = null, selectedBudget = null;
  let calYear, calMonth;
  let submitName = '', submitEmail = '', submitMsg = '';

  function openModal() {
    step = 1; workType = null; selectedDate = null; selectedTime = null; selectedBudget = null;
    const now = new Date();
    calYear = now.getFullYear(); calMonth = now.getMonth();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-book]').forEach(btn => btn.addEventListener('click', openModal));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  function stepHeader() {
    return STEP_LABELS.map((label, i) => {
      const s = i + 1;
      const active = s === step;
      const done = s < step;
      const circleClass = (active || done) ? 'active' : '';
      const labelClass = active ? 'active' : '';
      const sep = i < STEP_LABELS.length - 1 ? '<div class="modal-step-sep"></div>' : '';
      return `<div class="modal-step-item">
        <div class="modal-step-circle ${circleClass}">${done ? '✓' : s}</div>
        <span class="modal-step-label ${labelClass}">${label}</span>
      </div>${sep}`;
    }).join('');
  }

  function renderStep1() {
    return `
      <p class="modal-heading">What can I help you with?</p>
      <div class="interest-grid">
        ${WORK_TYPES.map(wt => `
          <button class="interest-chip${workType===wt.id?' selected':''}" data-wt="${wt.id}">
            <div><div class="interest-chip-label">${wt.label}</div><div class="interest-chip-desc">${wt.desc}</div></div>
            <span class="interest-chip-arrow">→</span>
          </button>`).join('')}
      </div>`;
  }

  function renderStep2() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long' }) + ' ' + calYear;
    const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const canGoBack = calYear > now.getFullYear() || calMonth > now.getMonth();

    let cells = dayLabels.map(d => `<span class="cal-day-label">${d}</span>`).join('');
    for (let i = 0; i < firstDay; i++) cells += `<span class="cal-day empty"></span>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const isPast = new Date(calYear, calMonth, d) < today;
      const isSel = selectedDate && selectedDate.getFullYear()===calYear && selectedDate.getMonth()===calMonth && selectedDate.getDate()===d;
      cells += `<button class="cal-day${isSel?' selected':''}${isPast?' disabled':''}" data-day="${d}" ${isPast?'disabled':''}>${d}</button>`;
    }

    return `
      <p class="modal-heading">What date works for you?</p>
      <div class="cal-header">
        <button data-cal-prev ${!canGoBack?'disabled':''}>‹</button>
        <span>${monthName}</span>
        <button data-cal-next>›</button>
      </div>
      <div class="cal-grid">${cells}</div>
      <div class="modal-nav">
        <button class="modal-btn-back" data-back>← Back</button>
        <button class="modal-btn-next" ${!selectedDate?'disabled':''} data-next>Next →</button>
      </div>`;
  }

  function renderStep3() {
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '';
    return `
      <p class="modal-heading">What time works for you?</p>
      <p class="modal-sub">${dateStr}</p>
      <div class="time-grid">
        ${TIMES.map(t => `<button class="time-slot${selectedTime===t?' selected':''}" data-time="${t}">${t}</button>`).join('')}
      </div>
      <div class="modal-nav">
        <button class="modal-btn-back" data-back>&#8592; Back</button>
        <button class="modal-btn-next" ${!selectedTime?'disabled':''} data-next>Next &#8594;</button>
      </div>`;
  }

  function renderStep4() {
    return `
      <p class="modal-heading">Your details</p>
      <p class="modal-sub">So Anan knows who to expect.</p>
      <div class="form-field"><label>Name</label><input type="text" id="m-name" placeholder="Your full name" /></div>
      <div class="form-field"><label>Email</label><input type="email" id="m-email" placeholder="your@email.com" /></div>
      <div class="form-field">
        <label>Budget <span class="modal-label-opt">(optional)</span></label>
        <div class="budget-grid">
          ${BUDGETS.map(b => `<button class="budget-chip${selectedBudget===b?' selected':''}" data-budget="${b}">${b}</button>`).join('')}
        </div>
      </div>
      <div class="form-field"><label>Message <span class="modal-label-opt">(optional)</span></label><textarea id="m-msg" rows="3" placeholder="Briefly describe what you need..."></textarea></div>
      <div class="modal-nav">
        <button class="modal-btn-back" data-back>&#8592; Back</button>
        <button class="modal-btn-next" id="m-submit" disabled data-submit>Book a call &#8594;</button>
      </div>`;
  }

  function renderStep5() {
    const wt = WORK_TYPES.find(w => w.id === workType)?.label ?? workType;
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }) : '';
    return `
      <div class="modal-success">
        <svg class="modal-checkmark" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle class="modal-checkmark-circle" cx="26" cy="26" r="24" stroke="currentColor" stroke-width="2"/>
          <path class="modal-checkmark-tick" d="M14 26l9 9 15-16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="modal-heading" style="margin-bottom:0.8rem">Booking confirmed.</p>
        <p class="modal-sub" style="margin-bottom:2.4rem">You'll receive a confirmation email shortly.</p>
        <div class="modal-success-summary">
          <div class="modal-success-row"><span class="modal-success-key">Interest</span><span class="modal-success-val">${wt}</span></div>
          <div class="modal-success-row"><span class="modal-success-key">Date</span><span class="modal-success-val">${dateStr} at ${selectedTime}</span></div>
          ${selectedBudget ? '<div class="modal-success-row"><span class="modal-success-key">Budget</span><span class="modal-success-val">' + selectedBudget + '</span></div>' : ''}
        </div>
        <button class="modal-confirm-btn" data-close-modal>Close</button>
      </div>`;
  }

  function renderStep6() {
    return `
      <div class="modal-success">
        <div class="modal-spinner"></div>
        <p class="modal-sub" style="margin-top:2rem">Sending your booking...</p>
      </div>`;
  }

  function render() {
    const panel = overlay.querySelector('.modal-panel');
    if (step === 5 || step === 6) {
      panel.innerHTML = `
        <div class="modal-header modal-header-success">
          ${step === 5 ? '<button class="modal-close" id="modal-close-btn">&#215;</button>' : ''}
        </div>
        <div class="modal-body">${step === 5 ? renderStep5() : renderStep6()}</div>`;
    } else {
      const stepContent = step === 1 ? renderStep1()
                        : step === 2 ? renderStep2()
                        : step === 3 ? renderStep3()
                        : renderStep4();
      panel.innerHTML = `
        <div class="modal-header">
          <div class="modal-steps">${stepHeader()}</div>
          <button class="modal-close" id="modal-close-btn">&#215;</button>
        </div>
        <div class="modal-body">${stepContent}</div>`;
    }
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    bindEvents();
  }

  function bindEvents() {
    const box = overlay.querySelector('.modal-panel');

    box.querySelectorAll('.interest-chip').forEach(btn => {
      btn.addEventListener('click', () => { workType = btn.dataset.wt; step = 2; render(); });
    });

    box.querySelectorAll('.cal-day:not([disabled]):not(.empty)').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = new Date(calYear, calMonth, parseInt(btn.dataset.day));
        render();
      });
    });

    const calPrev = box.querySelector('[data-cal-prev]');
    const calNext = box.querySelector('[data-cal-next]');
    if (calPrev) calPrev.addEventListener('click', () => {
      if (calMonth === 0) { calMonth = 11; calYear--; } else calMonth--;
      render();
    });
    if (calNext) calNext.addEventListener('click', () => {
      if (calMonth === 11) { calMonth = 0; calYear++; } else calMonth++;
      render();
    });

    box.querySelectorAll('.time-slot').forEach(btn => {
      btn.addEventListener('click', () => { selectedTime = btn.dataset.time; render(); });
    });

    box.querySelectorAll('.budget-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedBudget = selectedBudget === btn.dataset.budget ? null : btn.dataset.budget;
        render();
      });
    });

    if (step === 4) {
      const nameEl = box.querySelector('#m-name');
      const emailEl = box.querySelector('#m-email');
      const submitBtn = box.querySelector('#m-submit');
      const check = () => { submitBtn.disabled = !(nameEl.value.trim() && emailEl.value.trim()); };
      nameEl.addEventListener('input', check);
      emailEl.addEventListener('input', check);
    }

    const nextBtn = box.querySelector('[data-next]');
    if (nextBtn) nextBtn.addEventListener('click', () => { step++; render(); });

    const backBtn = box.querySelector('[data-back]');
    if (backBtn) backBtn.addEventListener('click', () => { step--; render(); });

    const submitBtn = box.querySelector('[data-submit]');
    if (submitBtn) submitBtn.addEventListener('click', async () => {
      submitName = box.querySelector('#m-name').value.trim();
      submitEmail = box.querySelector('#m-email').value.trim();
      submitMsg = box.querySelector('#m-msg').value.trim();
      step = 6; render();
      if (typeof _sb !== 'undefined') {
        await _sb.from('bookings').insert({
          name: submitName,
          email: submitEmail,
          work_type: workType,
          date: selectedDate ? selectedDate.toISOString().split('T')[0] : null,
          time: selectedTime,
          budget: selectedBudget,
          message: submitMsg || null,
        });
      }
      step = 5; render();
    });

    box.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });
  }

  overlay.innerHTML = `<div class="modal-box"><div class="modal-panel"></div></div>`;
})();

/* ════════════════════════════════
   TOAST  (coming-soon links)
════════════════════════════════ */
(function () {
  const toast = document.createElement('div');
  toast.id = 'toast';
  document.body.appendChild(toast);

  let hideTimer;

  function showToast(msg) {
    clearTimeout(hideTimer);
    toast.textContent = msg;
    toast.classList.add('show');
    hideTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  document.querySelectorAll('[data-coming-soon]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      showToast(el.dataset.comingSoon || 'Not live yet. Dropping on launch day.');
    });
  });
})();
