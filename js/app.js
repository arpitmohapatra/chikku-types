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
  fanfare: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3), i * 150)); },
};

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
const statLevel = document.getElementById('stat-level');
const statWpm = document.getElementById('stat-wpm');
const statAccuracy = document.getElementById('stat-accuracy');

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
  vehicleEl.style.transform = 'translateX(0%)';
  vehicleEl.classList.remove('brake');
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
  vehicleEl.style.transform = `translateX(${stats.progress * 100}%)`;
  statWpm.textContent = `${stats.wpm} WPM`;
  statAccuracy.textContent = `${stats.accuracy}%`;
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
