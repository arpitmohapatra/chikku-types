// Virtual keyboard layout + touch-typing finger chart used for the lesson intro and the live in-game key hint.
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ['Space'],
];

const KEY_DISPLAY = { Space: 'space', Enter: 'enter ↵', "'": "'" };

const FINGER_LABELS = {
  q: 'left pinky', a: 'left pinky', z: 'left pinky',
  w: 'left ring', s: 'left ring', x: 'left ring',
  e: 'left middle', d: 'left middle', c: 'left middle',
  r: 'left index', f: 'left index', v: 'left index', t: 'left index', g: 'left index', b: 'left index',
  y: 'right index', h: 'right index', n: 'right index', u: 'right index', j: 'right index', m: 'right index',
  i: 'right middle', k: 'right middle', ',': 'right middle',
  o: 'right ring', l: 'right ring', '.': 'right ring',
  p: 'right pinky', ';': 'right pinky', '/': 'right pinky', "'": 'right pinky',
  ' ': 'right thumb', '\n': 'right pinky',
};

// The 10 fingers rendered as hand-overlay elements, and which key each one rests on by default.
const FINGER_NAMES = [
  'left pinky', 'left ring', 'left middle', 'left index', 'left thumb',
  'right thumb', 'right index', 'right middle', 'right ring', 'right pinky',
];
const FINGER_HOME_CHAR = {
  'left pinky': 'a', 'left ring': 's', 'left middle': 'd', 'left index': 'f',
  'right index': 'j', 'right middle': 'k', 'right ring': 'l', 'right pinky': ';',
  'right thumb': ' ',
};

// Fingertip anchor points measured directly from img/hand.svg's own coordinate space
// (viewBox "0 0 128 128"), expressed as fractions (0-1) of the artwork's width/height
// so they stay correctly placed no matter what size we render the hand at. Measured by
// rendering the SVG to a pixel canvas and scanning for each finger's topmost opaque
// pixel (thumb: right-most opaque pixel in its band) — not eyeballed.
// The artwork's natural left-to-right finger order (pinky, ring, middle, index, thumb)
// already matches a left hand resting palm-down with fingers splayed upward, so the
// left-hand overlay uses this artwork unmirrored; the right-hand overlay mirrors the
// same artwork (CSS scaleX(-1)) which also mirrors these fractional marker positions.
const FINGER_TIP_FRACTIONS = {
  pinky: { x: 19.13 / 128, y: 28.25 / 128 },
  ring: { x: 39.44 / 128, y: 11.5 / 128 },
  middle: { x: 61.63 / 128, y: 4 / 128 },
  index: { x: 83.56 / 128, y: 11.13 / 128 },
  thumb: { x: 117 / 128, y: 65.13 / 128 },
};

// Maps a lesson's display key label ('J', 'Space', 'Enter') to the actual character used
// for matching/highlighting. Returns null for meta labels (Review, All Keys, Timed Test, ...).
function charFromKeyLabel(label) {
  if (label === 'Space') return ' ';
  if (label === 'Enter') return '\n';
  if (label.length === 1) return label.toLowerCase();
  return null;
}
