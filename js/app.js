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

// ---------- Virtual keyboard (lesson intro + live in-game hint) ----------
function buildKeyboard(container) {
  container.innerHTML = '';
  const map = new Map();
  KEYBOARD_ROWS.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';
    row.forEach(label => {
      const keyEl = document.createElement('div');
      keyEl.className = 'vkey' + (label === 'Space' ? ' spacebar' : label === 'Enter' ? ' wide' : '');
      keyEl.textContent = KEY_DISPLAY[label] || label;
      const char = charFromKeyLabel(label);
      if (char !== null) map.set(char, keyEl);
      rowEl.appendChild(keyEl);
    });
    container.appendChild(rowEl);
  });
  return map;
}

// Builds two hand illustrations (img/hand.svg, mirrored for the left hand — see
// FINGER_TIP_FRACTIONS comment in keyboard-data.js) resting in a natural, fixed pose over
// the home row of a rendered keyboard. The hands never relocate; layout(chars) only
// toggles a glowing marker at the fixed fingertip position of whichever finger(s) are
// responsible for `chars` (plus a subtle whole-hand emphasis), so the right finger is
// always pointed out even for keys far from the home row.
// Home keys in pinky->ring->middle->index order for each hand, used both to anchor the
// hand figure and to measure this keyboard's actual key pitch (see reposition() below).
const HAND_SIDES = [
  { side: 'left', homeChars: ['a', 's', 'd', 'f'], mirrored: false },
  { side: 'right', homeChars: [';', 'l', 'k', 'j'], mirrored: true },
];
const FINGER_ROLES = ['pinky', 'ring', 'middle', 'index', 'thumb'];

// Average fractional gap (of the hand artwork's own width) between consecutive fingertips
// pinky->ring->ring->middle->middle->index, i.e. per-key-pitch spacing in the artwork's own
// coordinate space. The artwork's real finger spacing isn't perfectly uniform, but this
// average is what we scale the whole hand by so it matches the keyboard's key pitch —
// see reposition().
const HAND_FINGER_PITCH_FRAC = (FINGER_TIP_FRACTIONS.index.x - FINGER_TIP_FRACTIONS.pinky.x) / 3;

function buildHandsOverlay(container, keyMap) {
  const overlay = document.createElement('div');
  overlay.className = 'keyboard-hands';

  const figures = {};
  const fingerEls = new Map(); // 'left pinky' -> marker element

  HAND_SIDES.forEach(({ side }) => {
    const figure = document.createElement('div');
    figure.className = `hand-figure hand-${side}`;

    const img = document.createElement('img');
    img.className = 'hand-art';
    img.src = 'img/hand.svg';
    img.alt = '';
    figure.appendChild(img);

    FINGER_ROLES.forEach(role => {
      const frac = FINGER_TIP_FRACTIONS[role];
      const marker = document.createElement('div');
      marker.className = 'finger-tip-marker';
      marker.style.left = `${frac.x * 100}%`;
      marker.style.top = `${frac.y * 100}%`;
      figure.appendChild(marker);
      fingerEls.set(`${side} ${role}`, marker);
    });

    overlay.appendChild(figure);
    figures[side] = figure;
  });

  container.appendChild(overlay);

  // Sizes + anchors each hand figure so ALL FOUR resting fingers (not just one) line up
  // with their real home keys: the hand artwork's own finger spacing is scaled to match
  // this keyboard's actual measured key pitch (pinky-key to index-key distance / 3), then
  // the figure is positioned so its middle-fingertip marker sits at the top edge of the
  // middle-finger home key. Recomputed on resize (key pixel sizes change), never in
  // response to which key is active.
  function reposition() {
    HAND_SIDES.forEach(({ side, homeChars, mirrored }) => {
      const figure = figures[side];
      const [pinkyKey, , , indexKey] = homeChars.map(c => keyMap.get(c));
      const middleKey = keyMap.get(homeChars[2]);
      if (!pinkyKey || !indexKey || !middleKey) return;
      const kb = container.getBoundingClientRect();
      const pinkyR = pinkyKey.getBoundingClientRect();
      const indexR = indexKey.getBoundingClientRect();
      const keyPitchPx = Math.abs((indexR.left + indexR.width / 2) - (pinkyR.left + pinkyR.width / 2)) / 3;
      if (!keyPitchPx) return; // keyboard not visible/laid out yet

      const size = keyPitchPx / HAND_FINGER_PITCH_FRAC;
      figure.style.width = `${size}px`;
      figure.style.height = `${size}px`;

      const kr = middleKey.getBoundingClientRect();
      const midFrac = FINGER_TIP_FRACTIONS.middle;
      // The right hand is mirrored (CSS scaleX(-1)), so a marker drawn at local fraction
      // `f` from the figure's left edge actually renders on-screen at `1 - f` — account
      // for that here so the middle-fingertip marker lands exactly on its home key.
      const screenFracX = mirrored ? 1 - midFrac.x : midFrac.x;
      const keyCenterX = kr.left - kb.left + kr.width / 2;
      const keyTopY = kr.top - kb.top;
      figure.style.left = `${keyCenterX - screenFracX * size}px`;
      figure.style.top = `${keyTopY - midFrac.y * size - size * 0.05}px`;
    });
  }

  function layout(activeChars) {
    reposition();

    const activeFingerNames = new Set();
    activeChars.forEach(c => {
      const fname = FINGER_LABELS[c];
      if (fname) activeFingerNames.add(fname);
    });

    fingerEls.forEach((el, name) => el.classList.toggle('active', activeFingerNames.has(name)));
    HAND_SIDES.forEach(({ side }) => {
      const hasActive = [...activeFingerNames].some(name => name.startsWith(side));
      figures[side].classList.toggle('active-hand', hasActive);
    });
  }

  layout([]);
  return { layout };
}

function setActiveKeys(map, handsCtrl, chars, rememberKey) {
  map.forEach(el => el.classList.remove('active'));
  chars.forEach(c => { const el = map.get(c); if (el) el.classList.add('active'); });
  handsCtrl.layout(chars);
  if (rememberKey) state[rememberKey] = chars;
}

const gameKeyboardMap = buildKeyboard(document.getElementById('game-keyboard'));
const gameHands = buildHandsOverlay(document.getElementById('game-keyboard'), gameKeyboardMap);
const introKeyboardMap = buildKeyboard(document.getElementById('intro-keyboard'));
const introHands = buildHandsOverlay(document.getElementById('intro-keyboard'), introKeyboardMap);
window.addEventListener('resize', () => {
  gameHands.layout(state.gameActiveChars || []);
  introHands.layout(state.introActiveChars || []);
});

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
  e.currentTarget.innerHTML = state.progress.muted ? ICONS.volumeOff : ICONS.volumeOn;
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
      <span class="level-num">${level.isFinal ? ICONS.bot : i + 1}</span>
      <span class="level-title">${level.title}</span>
      <span class="level-keys">${level.keys.map(k => `<kbd>${k}</kbd>`).join(' ')}</span>
      ${best ? `<span class="level-best">Best: ${best.wpm} WPM · ${best.accuracy}%</span>` : ''}
      ${locked ? `<span class="level-lock">${ICONS.lock}</span>` : ''}
    `;
    if (!locked) card.addEventListener('click', () => enterLessonIntro(i));
    grid.appendChild(card);
  });
}

document.getElementById('back-to-levels').addEventListener('click', () => {
  document.removeEventListener('keydown', onKeyDown);
  renderLevelSelect();
  showScreen('levels');
});

// ---------- Lesson intro / tutorial screen ----------
function enterLessonIntro(levelIndex) {
  state.pendingLevelIndex = levelIndex;
  const level = LEVELS[levelIndex];
  const newChars = level.keys.map(charFromKeyLabel).filter(c => c !== null);
  document.getElementById('intro-title').textContent = level.title;
  document.getElementById('intro-message').textContent = newChars.length
    ? "New keys for this lesson — get your fingers ready:"
    : "No new keys this time — let's review everything you've learned so far!";
  document.getElementById('intro-finger-tips').innerHTML = newChars
    .map(c => `<li><kbd>${displayChar(c)}</kbd>${FINGER_LABELS[c] || ''}</li>`)
    .join('');
  showScreen('lesson-intro'); // must run before layout — hands measure key positions via getBoundingClientRect
  setActiveKeys(introKeyboardMap, introHands, newChars, 'introActiveChars');
}

document.getElementById('intro-start-btn').addEventListener('click', () => {
  beginDrills(state.pendingLevelIndex);
});
document.getElementById('intro-back-to-levels').addEventListener('click', () => {
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

function displayChar(char) {
  if (char === ' ') return '␣';
  if (char === '\n') return '⏎';
  return char;
}

function showKeyFeedback(char, isCorrect) {
  if (!char) return;
  keyFeedbackEl.textContent = displayChar(char);
  keyFeedbackEl.classList.remove('correct', 'incorrect', 'pop');
  void keyFeedbackEl.offsetWidth; // restart the pop animation
  keyFeedbackEl.classList.add(isCorrect ? 'correct' : 'incorrect', 'pop');
}

function beginDrills(levelIndex) {
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
  keyFeedbackEl.textContent = ' ';
  keyFeedbackEl.className = 'key-feedback';
  renderPromptChars(text, 0);
  setActiveKeys(gameKeyboardMap, gameHands, text.length ? [text[0]] : [], 'gameActiveChars');
}

function renderPromptChars(text, currentIndex) {
  promptEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.textContent = displayChar(text[i]);
    span.className = i < currentIndex ? 'char correct' : i === currentIndex ? 'char current' : 'char pending';
    if (text[i] === '\n') span.classList.add('char-newline');
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
  const nextChar = state.engine.targetText[stats.index];
  setActiveKeys(gameKeyboardMap, gameHands, nextChar !== undefined ? [nextChar] : [], 'gameActiveChars');
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
  setActiveKeys(gameKeyboardMap, gameHands, [state.engine.targetText[state.engine.index]], 'gameActiveChars');
  sfx.error();
}

function onKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    state.engine.handleChar('\n');
    return;
  }
  if (e.key === 'Backspace' || e.key === 'Tab' || e.key.startsWith('Arrow')) return;
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
    enterLessonIntro(nextIndex);
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
    vehicleEl.classList.add('is-robot');
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
  vehicleEl.classList.remove('is-robot', 'transforming');
  renderLevelSelect();
  showScreen('levels');
});

// ---------- Boot ----------
(function init() {
  document.getElementById('mute-toggle').innerHTML = state.progress.muted ? ICONS.volumeOff : ICONS.volumeOn;
  if (state.progress.playerName) {
    nameInput.value = state.progress.playerName;
  }
  showScreen('start');
})();
