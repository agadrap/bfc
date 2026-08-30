/* ═══════════════════════════════════════════════════════
   THE BAYLEY FILM CLUB — global.js
   Cursor glow, scroll reveal, shared interactions
   ═══════════════════════════════════════════════════════ */

// ── CURSOR GLOW ─────────────────────────────────────────
(function initCursor() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function tick() {
    glow.style.left = mx + 'px';
    glow.style.top  = my + 'px';
    requestAnimationFrame(tick);
  })();
})();

// ── SCROLL REVEAL ────────────────────────────────────────
// Add class="reveal" to any element to fade it up on scroll
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const siblings = Array.from(e.target.parentNode.children);
        const delay = siblings.indexOf(e.target) * 0.05;
        e.target.style.transition = `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`;
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });
  els.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    io.observe(el);
  });
})();

// ── NAV HAMBURGER ────────────────────────────────────────
(function initHamburger() {
  const btn = document.querySelector('.nav-hamburger');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;

  btn.addEventListener('click', function() {
    btn.classList.toggle('active');
    links.classList.toggle('open');
  });

  // Close menu when clicking a nav link
  links.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      btn.classList.remove('active');
      links.classList.remove('open');
    });
  });
})();

// ── NAV DROPDOWN (mobile tap toggle) ─────────────────────
(function initDropdown() {
  const dropdown = document.querySelector('.nav-dropdown');
  if (!dropdown) return;
  const toggle = dropdown.querySelector('.nav-dropdown-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', function(e) {
    if (window.innerWidth <= 900) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    }
  });

  document.addEventListener('click', function() {
    dropdown.classList.remove('open');
  });
})();

// ── READING PROGRESS BAR ─────────────────────────────────
(function initProgress() {
  const bar = document.getElementById('progressBar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const doc = document.documentElement;
    const pct = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
    bar.style.width = pct + '%';
  });
})();

// ── RADAR CHART ──────────────────────────────────────────
// Call initRadar(svgId, scores, colors) to build a radar on any page
function initRadar(svgId, scores, animateOnScroll) {
  const CX = 100, CY = 100, MAX_R = 72;
  const ANGLES = [-90, 30, 150].map(a => a * Math.PI / 180);
  const LABELS = ['Anticipation', 'Enjoyment', 'Retrospect'];
  const COLORS = ['#a86bff', '#ff5cc8', '#e8c97a'];

  function polarToXY(angle, r) {
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  }

  function pointsStr(pts) {
    return pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  }

  function buildGrid(svg) {
    const rings = svg.getElementById('gridRings');
    const axes  = svg.getElementById('axisLines');
    const labs  = svg.getElementById('axisLabels');
    if (!rings) return;

    for (let i = 1; i <= 5; i++) {
      const r = (i / 5) * MAX_R;
      const pts = ANGLES.map(a => polarToXY(a, r));
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pointsStr(pts));
      poly.setAttribute('fill', 'none');
      poly.setAttribute('stroke', i === 5 ? '#2a2a40' : '#1e1e2e');
      poly.setAttribute('stroke-width', i === 5 ? '1' : '0.5');
      rings.appendChild(poly);
    }

    ANGLES.forEach((angle, i) => {
      const tip = polarToXY(angle, MAX_R);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', CX); line.setAttribute('y1', CY);
      line.setAttribute('x2', tip.x); line.setAttribute('y2', tip.y);
      line.setAttribute('stroke', '#1e1e2e');
      line.setAttribute('stroke-width', '0.5');
      axes.appendChild(line);

      const lp = polarToXY(angle, MAX_R + 18);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', lp.x);
      text.setAttribute('y', lp.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'Space Mono, monospace');
      text.setAttribute('font-size', '6.5');
      text.setAttribute('letter-spacing', '1');
      text.setAttribute('fill', COLORS[i]);
      text.setAttribute('opacity', '0.8');
      text.textContent = LABELS[i].toUpperCase();
      labs.appendChild(text);
    });
  }

  function drawPoly(svgEl, scores) {
    const pts = ANGLES.map((angle, i) => polarToXY(angle, (scores[i] / 5) * MAX_R));
    const str = pointsStr(pts);
    svgEl.getElementById('radarPoly').setAttribute('points', str);
    svgEl.getElementById('radarPolyBorder').setAttribute('points', str);

    const vd = svgEl.getElementById('vertexDots');
    if (!vd) return;
    vd.innerHTML = '';
    pts.forEach((p, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
      c.setAttribute('r', '3');
      c.setAttribute('fill', COLORS[i]);
      c.setAttribute('filter', 'url(#glowFill)');
      vd.appendChild(c);
    });
  }

  function animate(svgEl, targetScores, duration) {
    const start = performance.now();
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function step(now) {
      const t = ease(Math.min((now - start) / duration, 1));
      drawPoly(svgEl, targetScores.map(s => s * t));
      if (t < 1) requestAnimationFrame(step);
      else drawPoly(svgEl, targetScores);
    }
    requestAnimationFrame(step);
  }

  const svgEl = document.getElementById(svgId);
  if (!svgEl) return;

  buildGrid(svgEl);

  if (animateOnScroll) {
    let drawn = false;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !drawn) {
          drawn = true;
          animate(svgEl, scores, 1000);
          // bars
          const ids = ['barA', 'barE', 'barR'];
          setTimeout(() => {
            ids.forEach((id, i) => {
              const el = document.getElementById(id);
              if (el) el.style.width = (scores[i] / 5 * 100) + '%';
            });
          }, 100);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(svgEl);
  } else {
    animate(svgEl, scores, 900);
  }
}

/* ─────────────────────────────────────────────────────────────
   NEWSLETTER SIGNUP (Kit)
   Progressive enhancement: without JS the form does a normal POST
   to Kit and lands on Kit's own confirmation page. With JS we post
   in the background and show an inline message instead.
   ───────────────────────────────────────────────────────────── */
document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
  const status = form.querySelector('[data-newsletter-status]');
  const btn = form.querySelector('button[type="submit"]');
  const original = btn ? btn.textContent : '';

  form.addEventListener('submit', async (e) => {
    if (form.action.indexOf('REPLACE_WITH') !== -1) return; // not wired up yet — let it fail loudly in dev
    e.preventDefault();
    if (status) { status.textContent = ''; status.classList.remove('is-error'); }
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { accept: 'application/json' }
      });
      if (!res.ok) throw new Error('bad status');
      form.reset();
      if (status) status.textContent = 'Check your inbox and confirm — see you at the next season.';
      if (btn) btn.textContent = 'Subscribed ✓';
    } catch (err) {
      if (status) {
        status.textContent = 'That did not go through. Try again in a moment?';
        status.classList.add('is-error');
      }
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  });
});
