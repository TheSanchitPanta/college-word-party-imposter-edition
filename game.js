/* ═══════════════════════════════════════════════════════════
   game.js — Imposter Game core logic
   Depends on: words.js (WORD_DB must be loaded first)
═══════════════════════════════════════════════════════════ */

/* ── AVATAR HELPERS ─────────────────────────────────────────── */
const AVATAR_COLORS = [
  ['#a259ff','#6d2eff'], ['#4ea8ff','#1a6fcc'], ['#ff3a5c','#cc1038'],
  ['#ffb347','#e07b00'], ['#2dffb4','#00c47a'], ['#ff78c4','#cc3a8e'],
  ['#7bfff0','#0fa8a0'], ['#fff176','#c8a200'], ['#80ff80','#2db52d'],
  ['#ffa07a','#cc5a2a'],
];

function avatarStyle(i) {
  const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
  return `background:linear-gradient(135deg,${c[0]},${c[1]});color:#fff;`;
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── STATE ──────────────────────────────────────────────────── */
let players          = [];
let imposterIndex    = -1;
let secretWord       = '';
let imposterHint     = '';
let currentViewIndex = 0;
let cardRevealed     = false;
let votedPlayerIndex = -1;

/* ── SCREEN TRANSITIONS ─────────────────────────────────────── */
let currentScreen = 's-home';

function goto(id) {
  const from = document.getElementById(currentScreen);
  const to   = document.getElementById(id);
  from.classList.add('exit');
  setTimeout(() => {
    from.classList.remove('active', 'exit');
    to.classList.add('active');
    currentScreen = id;
    onEnter(id);
  }, 340);
}

function onEnter(id) {
  if (id === 's-view')    initViewScreen();
  if (id === 's-discuss') initDiscuss();
  if (id === 's-vote')    initVote();
}

/* ── PLAYER SETUP ───────────────────────────────────────────── */
function renderPlayers() {
  const list = document.getElementById('player-list');
  list.innerHTML = '';
  players.forEach((name, i) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip glass';
    chip.innerHTML = `
      <div class="chip-avatar" style="${avatarStyle(i)}">${initials(name)}</div>
      <span class="chip-name">${name}</span>
      <button class="chip-remove" onclick="removePlayer(${i})" aria-label="Remove">×</button>
    `;
    list.appendChild(chip);
  });
  document.getElementById('start-btn').disabled = players.length < 3;
}

function addPlayer() {
  const inp  = document.getElementById('name-input');
  const name = inp.value.trim();
  if (!name || players.length >= 12) return;
  if (players.map(p => p.toLowerCase()).includes(name.toLowerCase())) {
    inp.style.borderColor = 'var(--red)';
    setTimeout(() => inp.style.borderColor = '', 800);
    return;
  }
  players.push(name);
  inp.value = '';
  renderPlayers();
  inp.focus();
}

function removePlayer(i) {
  players.splice(i, 1);
  renderPlayers();
}

/* ── GAME INIT ──────────────────────────────────────────────── */
function startGame() {
  if (players.length < 3) return;
  imposterIndex    = Math.floor(Math.random() * players.length);
  const pair       = WORD_DB[Math.floor(Math.random() * WORD_DB.length)];
  secretWord       = pair[0];
  imposterHint     = pair[1];
  currentViewIndex = 0;
  votedPlayerIndex = -1;
  goto('s-view');
}

/* ── CARD VIEWING ───────────────────────────────────────────── */
function initViewScreen() {
  cardRevealed = false;
  const card   = document.getElementById('flip-card');
  card.classList.remove('revealed');

  const name = players[currentViewIndex];
  document.getElementById('front-name').textContent   = name;
  document.getElementById('view-title').textContent   =
    currentViewIndex === 0 ? 'Your Turn' : `${name}'s Turn`;

  // Progress bar
  const prog = document.getElementById('view-progress');
  prog.innerHTML = '';
  players.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'vp-dot'
      + (i < currentViewIndex  ? ' done'    : '')
      + (i === currentViewIndex ? ' current' : '');
    prog.appendChild(d);
  });

  // Button visibility
  document.getElementById('next-btn').style.display    = 'none';
  document.getElementById('reveal-hint').style.display = '';
  document.getElementById('flip-scene').style.cursor   = 'pointer';

  buildBackFace(currentViewIndex);
}

function buildBackFace(idx) {
  const isImposter = idx === imposterIndex;
  const back       = document.getElementById('flip-back');
  back.className   = 'flip-back ' + (isImposter ? 'role-imposter' : 'role-normal');

  if (isImposter) {
    back.innerHTML = `
      <span class="role-badge badge-imposter">⚠ Imposter</span>
      <div class="back-icon">🕵️</div>
      <div class="back-role-label">Your hint word</div>
      <div class="back-word imposter-word">${imposterHint}</div>
      <div class="back-desc">You are the Imposter! Blend in. Don't reveal you don't know the real word.</div>
    `;
  } else {
    back.innerHTML = `
      <span class="role-badge badge-normal">✓ Crew Member</span>
      <div class="back-icon">👤</div>
      <div class="back-role-label">Secret word</div>
      <div class="back-word normal-word">${secretWord}</div>
      <div class="back-desc">You know the word! Find who gives vague clues — they're the Imposter.</div>
    `;
  }
}

function revealCard() {
  if (cardRevealed) return;
  cardRevealed = true;
  document.getElementById('flip-card').classList.add('revealed');
  document.getElementById('next-btn').style.display    = '';
  document.getElementById('reveal-hint').style.display = 'none';
  document.getElementById('flip-scene').style.cursor   = 'default';
  if (navigator.vibrate) navigator.vibrate([30]);
}

function nextViewer() {
  currentViewIndex++;
  if (currentViewIndex >= players.length) {
    goto('s-discuss');
    return;
  }
  document.getElementById('flip-card').classList.remove('revealed');
  setTimeout(() => initViewScreen(), 350);
}

/* ── DISCUSSION — FIRST SPEAKER ─────────────────────────────── */
function initDiscuss() {
  const idx = Math.floor(Math.random() * players.length);
  document.getElementById('first-speaker-name').textContent = players[idx];
}

/* ── VOTING ─────────────────────────────────────────────────── */
function initVote() {
  votedPlayerIndex = -1;
  const grid       = document.getElementById('vote-grid');
  grid.innerHTML   = '';

  players.forEach((name, i) => {
    const card    = document.createElement('div');
    card.className = 'vote-card';
    card.id        = `vote-${i}`;
    card.onclick   = () => selectVote(i);
    card.innerHTML = `
      <div class="vote-avatar" style="${avatarStyle(i)}">${initials(name)}</div>
      <span class="vote-name">${name}</span>
      <span class="vote-check">✓</span>
    `;
    grid.appendChild(card);
  });

  document.getElementById('vote-submit').disabled = true;
}

function selectVote(i) {
  document.querySelectorAll('.vote-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`vote-${i}`).classList.add('selected');
  votedPlayerIndex = i;
  document.getElementById('vote-submit').disabled = false;
  if (navigator.vibrate) navigator.vibrate(20);
}

function submitVote() {
  if (votedPlayerIndex < 0) return;
  buildResult();
  goto('s-result');
}

/* ── RESULT ─────────────────────────────────────────────────── */
function buildResult() {
  const won    = votedPlayerIndex === imposterIndex;
  const banner = document.getElementById('result-banner');
  banner.className = 'result-banner ' + (won ? 'result-win' : 'result-lose');

  document.getElementById('result-emoji').textContent = won ? '🎉' : '😈';
  document.getElementById('result-title').textContent = won ? 'Team Wins!' : 'Imposter Wins!';
  document.getElementById('result-sub').textContent   = won
    ? 'The group correctly identified the Imposter!'
    : 'The Imposter survived the vote!';

  document.getElementById('res-imposter').textContent = players[imposterIndex];
  document.getElementById('res-word').textContent     = secretWord;
  document.getElementById('res-hint').textContent     = imposterHint;
  document.getElementById('res-voted').textContent    = players[votedPlayerIndex];
}

/* ── PLAY AGAIN ─────────────────────────────────────────────── */
function playAgain() {
  currentViewIndex = 0;
  cardRevealed     = false;
  votedPlayerIndex = -1;
  startGame();
}

/* ── PARTICLE SYSTEM ────────────────────────────────────────── */
(function () {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let W, H, dots = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = [
    'rgba(162,89,255,',
    'rgba(78,168,255,',
    'rgba(255,58,92,',
  ];

  for (let i = 0; i < 55; i++) {
    dots.push({
      x:  Math.random() * 1000,
      y:  Math.random() * 1000,
      r:  Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      c:  COLORS[Math.floor(Math.random() * COLORS.length)],
      a:  Math.random() * 0.5 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = W;
      if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H;
      if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = d.c + d.a + ')';
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();
