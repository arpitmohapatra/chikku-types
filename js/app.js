// Screen wiring, persistence, audio, and vehicle animation for Chikku Car Typing.
const STORAGE_KEY = 'chikkuCarTyping.progress';

const state = {
  progress: loadProgress(),
  currentLevelIndex: 0,
  currentDrillIndex: 0,
  engine: null,
  brakeTimeout: null,
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted storage, fall through to defaults */ }
  return { playerName: '', unlockedIndex: 0, bestScores: {}, completedAll: false, muted: false };
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

// ---------- Audio (synthesized, no asset files) ----------
let audioCtx = null;
function tone(freq, duration, type = 'sine', gain = 0.05) {
  if (state.progress.muted) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp).connect(audioCtx.destination);
  osc.start();
  amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
  osc.stop(audioCtx.currentTime + duration);
}
const sfx = {
  key: () => tone(880, 0.04, 'square', 0.02),
  error: () => tone(140, 0.18, 'sawtooth', 0.06),
  drillDone: () => { tone(523, 0.12); setTimeout(() => tone(659, 0.12), 120); setTimeout(() => tone(784, 0.2), 240); },
  honk: () => { tone(440, 0.35, 'sawtooth', 0.05); tone(554, 0.35, 'sawtooth', 0.04); },
  fanfare: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.35), i * 150)); },
};

// ---------- Confetti ----------
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
const CONFETTI_COLORS = ['#ff7a3d', '#ffd54a', '#34b357', '#4fa8ff', '#ff5c8d'];
function launchConfetti(count = 100, durationMs = 2000) {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.classList.remove('hidden');
  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.3,
    w: 5 + Math.random() * 5,
    h: 8 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    vy: 2 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rotation: Math.random() * 360,
    vr: -8 + Math.random() * 16,
  }));
  const start = performance.now();
  function frame(now) {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let anyOnScreen = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      if (p.y < confettiCanvas.height + 20) anyOnScreen = true;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      confettiCtx.restore();
    }
    if (anyOnScreen && now - start < durationMs) {
      requestAnimationFrame(frame);
    } else {
      confettiCanvas.classList.add('hidden');
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Screen management ----------
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
}
function showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
function hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

// ---------- Start screen ----------
const nameInput = document.getElementById('player-name');
document.getElementById('start-btn').addEventListener('click', () => {
  const name = nameInput.value.trim();
  state.progress.playerName = name || 'Champion';
  saveProgress();
  enterLevelSelect();
});
document.getElementById('mute-toggle').addEventListener('click', (e) => {
  state.progress.muted = !state.progress.muted;
  e.target.textContent = state.progress.muted ? '🔇' : '🔊';
  saveProgress();
});

function enterLevelSelect() {
  document.getElementById('greeting').textContent = `Hi, ${state.progress.playerName}! Pick a level:`;
  renderLevelSelect();
  showScreen('levels');
}

function renderLevelSelect() {
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((level, i) => {
    const locked = i > state.progress.unlockedIndex;
    const best = state.progress.bestScores[level.id];
    const card = document.createElement('button');
    card.className = 'level-card' + (locked ? ' locked' : '') + (level.isFinal ? ' final' : '');
    card.disabled = locked;
    card.innerHTML = `
      <span class="level-num">${level.isFinal ? '🐝' : i + 1}</span>
      <span class="level-title">${level.title}</span>
      <span class="level-keys">${level.keys.map(k => `<kbd>${k}</kbd>`).join(' ')}</span>
      ${best ? `<span class="level-best">Best: ${best.wpm} WPM · ${best.accuracy}%</span>` : ''}
      ${locked ? '<span class="level-lock">🔒</span>' : ''}
    `;
    if (!locked) card.addEventListener('click', () => startLevel(i));
    grid.appendChild(card);
  });
}

document.getElementById('back-to-levels').addEventListener('click', () => {
  document.removeEventListener('keydown', onKeyDown);
  renderLevelSelect();
  showScreen('levels');
});

// ---------- Game screen ----------
const promptEl = document.getElementById('prompt-text');
const vehicleEl = document.getElementById('vehicle');
const roadEl = document.querySelector('.road');
const keyFeedbackEl = document.getElementById('key-feedback');
const statLevel = document.getElementById('stat-level');
const statWpm = document.getElementById('stat-wpm');
const statAccuracy = document.getElementById('stat-accuracy');

const FINISH_MARGIN_PX = 56; // keeps the car from driving under the finish flag

// translateX(%) is relative to the vehicle's OWN width, not the road, so it
// under/overshoots the road — compute the real pixel travel distance instead.
function updateVehiclePosition(progress) {
  state.currentProgress = progress;
  const travel = Math.max(0, roadEl.clientWidth - vehicleEl.offsetWidth - FINISH_MARGIN_PX);
  const x = travel * progress;
  vehicleEl.style.setProperty('--car-x', `${x}px`);
}
window.addEventListener('resize', () => updateVehiclePosition(state.currentProgress || 0));

function showKeyFeedback(char, isCorrect) {
  if (!char) return;
  keyFeedbackEl.textContent = char === ' ' ? '␣' : char;
  keyFeedbackEl.classList.remove('correct', 'incorrect', 'pop');
  void keyFeedbackEl.offsetWidth; // restart the pop animation
  keyFeedbackEl.classList.add(isCorrect ? 'correct' : 'incorrect', 'pop');
}

function startLevel(levelIndex) {
  state.currentLevelIndex = levelIndex;
  state.currentDrillIndex = 0;
  showScreen('game');
  loadDrill();
  document.addEventListener('keydown', onKeyDown);
}

function loadDrill() {
  const level = LEVELS[state.currentLevelIndex];
  const text = level.drills[state.currentDrillIndex];
  state.engine = new TypingEngine(text, {
    onProgress: renderProgress,
    onError: renderError,
    onComplete: onDrillComplete,
  });
  statLevel.textContent = `${level.title} — Drill ${state.currentDrillIndex + 1}/${level.drills.length}`;
  statWpm.textContent = '0 WPM';
  statAccuracy.textContent = '100%';
  updateVehiclePosition(0);
  vehicleEl.classList.remove('brake');
  keyFeedbackEl.textContent = ' ';
  keyFeedbackEl.className = 'key-feedback';
  renderPromptChars(text, 0);
}

function renderPromptChars(text, currentIndex) {
  promptEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.textContent = text[i] === ' ' ? ' ' : text[i];
    span.className = i < currentIndex ? 'char correct' : i === currentIndex ? 'char current' : 'char pending';
    frag.appendChild(span);
  }
  promptEl.appendChild(frag);
}

function renderProgress(stats) {
  renderPromptChars(state.engine.targetText, stats.index);
  updateVehiclePosition(stats.progress);
  statWpm.textContent = `${stats.wpm} WPM`;
  statAccuracy.textContent = `${stats.accuracy}%`;
  showKeyFeedback(stats.lastChar, true);
  sfx.key();
}

function renderError(stats) {
  statAccuracy.textContent = `${stats.accuracy}%`;
  vehicleEl.classList.add('brake');
  const current = promptEl.querySelector('.char.current');
  if (current) {
    current.classList.add('mistyped');
    setTimeout(() => current.classList.remove('mistyped'), 200);
  }
  clearTimeout(state.brakeTimeout);
  state.brakeTimeout = setTimeout(() => vehicleEl.classList.remove('brake'), 250);
  showKeyFeedback(stats.lastChar, false);
  sfx.error();
}

function onKeyDown(e) {
  if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Enter' || e.key.startsWith('Arrow')) return;
  if (e.key.length !== 1) return; // ignore Shift/Control/Alt/Meta/CapsLock/etc — e.key already reflects shifted char
  e.preventDefault();
  state.engine.handleChar(e.key);
}

function onDrillComplete(stats) {
  document.removeEventListener('keydown', onKeyDown);
  sfx.drillDone();
  launchConfetti(50, 1200);
  document.getElementById('drill-stats').innerHTML = `
    <p>WPM: <strong>${stats.wpm}</strong></p>
    <p>Accuracy: <strong>${stats.accuracy}%</strong></p>
  `;
  const level = LEVELS[state.currentLevelIndex];
  const isLastDrillInLevel = state.currentDrillIndex === level.drills.length - 1;
  document.getElementById('next-drill-btn').textContent = isLastDrillInLevel ? 'Finish Level' : 'Next Drill';
  showOverlay('overlay-drill-complete');

  if (isLastDrillInLevel) {
    level.lastStats = stats;
  }
}

document.getElementById('next-drill-btn').addEventListener('click', () => {
  hideOverlay('overlay-drill-complete');
  const level = LEVELS[state.currentLevelIndex];
  const isLastDrillInLevel = state.currentDrillIndex === level.drills.length - 1;
  if (!isLastDrillInLevel) {
    state.currentDrillIndex += 1;
    loadDrill();
    document.addEventListener('keydown', onKeyDown);
    return;
  }
  completeLevel();
});

function completeLevel() {
  const level = LEVELS[state.currentLevelIndex];
  const stats = level.lastStats;
  const prevBest = state.progress.bestScores[level.id];
  if (!prevBest || stats.wpm > prevBest.wpm) {
    state.progress.bestScores[level.id] = { wpm: stats.wpm, accuracy: stats.accuracy };
  }
  state.progress.unlockedIndex = Math.max(state.progress.unlockedIndex, state.currentLevelIndex + 1);
  saveProgress();

  if (state.currentLevelIndex === LEVELS.length - 1) {
    triggerFinalCongrats();
    return;
  }

  document.getElementById('level-complete-stats').innerHTML = `
    <p>WPM: <strong>${stats.wpm}</strong></p>
    <p>Accuracy: <strong>${stats.accuracy}%</strong></p>
  `;
  sfx.honk();
  launchConfetti(140, 2200);
  showOverlay('overlay-level-complete');
}

document.getElementById('next-level-btn').addEventListener('click', () => {
  hideOverlay('overlay-level-complete');
  const nextIndex = state.currentLevelIndex + 1;
  if (nextIndex < LEVELS.length && nextIndex <= state.progress.unlockedIndex) {
    startLevel(nextIndex);
  } else {
    renderLevelSelect();
    showScreen('levels');
  }
});
document.getElementById('level-complete-to-levels').addEventListener('click', () => {
  hideOverlay('overlay-level-complete');
  renderLevelSelect();
  showScreen('levels');
});

// ---------- Final transformation + congrats ----------
function triggerFinalCongrats() {
  state.progress.completedAll = true;
  saveProgress();
  vehicleEl.classList.add('transforming');
  sfx.fanfare();
  launchConfetti(220, 3200);
  setTimeout(() => {
    vehicleEl.classList.add('is-bee');
    document.getElementById('congrats-name').textContent = state.progress.playerName;
    document.getElementById('congrats-recap').innerHTML = LEVELS.map(level => `
      <li>
        <strong>${level.title}</strong>
        <span class="recap-text">"${level.drills[level.drills.length - 1]}"</span>
      </li>
    `).join('');
    showOverlay('overlay-congrats');
    launchConfetti(220, 3200);
  }, 900);
}

document.getElementById('congrats-restart-btn').addEventListener('click', () => {
  hideOverlay('overlay-congrats');
  vehicleEl.classList.remove('is-bee', 'transforming');
  renderLevelSelect();
  showScreen('levels');
});

// ---------- Boot ----------
(function init() {
  document.getElementById('mute-toggle').textContent = state.progress.muted ? '🔇' : '🔊';
  if (state.progress.playerName) {
    nameInput.value = state.progress.playerName;
  }
  showScreen('start');
})();
